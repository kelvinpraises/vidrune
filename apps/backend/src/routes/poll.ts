import { Router, Request, Response } from 'express';
import { getContractsService } from '../services/contracts';
import { GeminiService } from '../services/gemini';
import { throttleService } from '../services/throttle';
import { streamsService } from '../services/streams';
import { WalrusService } from '../services/walrus';
import type { Conviction, MarketGroup } from '../types';

const router = Router();

// Lazy initialize services to ensure env vars are loaded
let contractsService: ReturnType<typeof getContractsService> | null = null;
let geminiService: GeminiService | null = null;
let walrusService: WalrusService | null = null;

const getServices = () => {
  if (!contractsService) {
    contractsService = getContractsService();
  }
  if (!geminiService) {
    geminiService = new GeminiService();
  }
  if (!walrusService) {
    walrusService = new WalrusService();
  }
  return { contractsService, geminiService, walrusService };
};

/**
 * Poll Routes
 * Handles backend polling for market creation and resolution
 */

/**
 * Helper: Create markets for a video
 */
async function createMarketForVideo(videoId: string): Promise<number> {
  let marketsCreated = 0;

  try {
    console.log(`Creating markets for video ${videoId}...`);
    
    const { contractsService, geminiService, walrusService } = getServices();

    // 1. Check if markets already exist for this video ON-CHAIN (persistent check)
    const existingMarkets = await contractsService.getMarketsForVideo(videoId);
    if (existingMarkets.length > 0) {
      console.log(`Markets already exist for video ${videoId} (${existingMarkets.length} found), skipping...`);
      return 0;
    }

    // 2. Get convictions for this video
    const contractConvictions = await contractsService.getConvictions(videoId);

    if (contractConvictions.length === 0) {
      console.log(`No convictions found for video ${videoId}`);
      return 0;
    }

    // In-memory throttle to reduce redundant RPC calls during normal operation
    // This is a secondary check - the on-chain check above is the source of truth
    const throttleKey = `market-create-${videoId}`;
    if (throttleService.wasRecentlyProcessed(throttleKey, 3600000)) {
      console.log(`Recently attempted market creation for video ${videoId}, skipping...`);
      return 0;
    }

    // Mark as processing to prevent duplicate work within this session
    throttleService.markProcessed(throttleKey);

    // 2. Download conviction data from Walrus and build Conviction objects
    const convictions: Conviction[] = [];
    for (const conv of contractConvictions) {
      try {
        const convictionData = await walrusService.downloadFile(conv.walrusBlobId);
        const parsed = JSON.parse(convictionData.toString('utf-8'));

        convictions.push({
          id: conv.id,
          fact: parsed.fact || '',
          proof: parsed.proof || ''
        });
      } catch (error) {
        console.error(`Failed to download conviction ${conv.id}:`, error);
        // Continue with other convictions
      }
    }

    if (convictions.length === 0) {
      console.log(`No valid conviction data found for video ${videoId}`);
      return 0;
    }

    // 3. Cluster convictions using Gemini
    console.log(`Clustering ${convictions.length} convictions...`);
    const groups: MarketGroup[] = await geminiService.clusterConvictions(convictions);

    if (groups.length === 0) {
      console.log(`No market groups created from convictions`);
      return 0;
    }

    // 4. Create markets on-chain
    for (const group of groups) {
      try {
        console.log(`Creating market with question: "${group.question}"`);

        const txHash = await contractsService.createMarket(
          videoId,
          group.question,
          group.convictionIds
        );

        // 5. Emit SDS event
        await streamsService.emitMarketCreated({
          marketId: txHash,
          videoId,
          question: group.question
        });

        marketsCreated++;
        console.log(`Market created successfully: ${txHash}`);
      } catch (error) {
        console.error(`Failed to create market for group:`, error);
        // Continue with other groups
      }
    }

    return marketsCreated;
  } catch (error) {
    console.error(`Error creating markets for video ${videoId}:`, error);
    return marketsCreated;
  }
}

/**
 * Helper: Resolve a market by ID
 */
async function resolveMarketById(marketId: string): Promise<boolean> {
  try {
    console.log(`Resolving market ${marketId}...`);
    
    const { contractsService, geminiService, walrusService } = getServices();

    // 1. Get market details from contract
    const market = await contractsService.getMarket(marketId);

    // 2. Get video details to get the video package blob ID
    const video = await contractsService.getVideo(market.videoId);
    
    if (!video || !video.walrusBlobId) {
      console.error(`Video ${market.videoId} not found or has no blob ID`);
      return false;
    }

    // 3. Get convictions for context
    const contractConvictions = await contractsService.getConvictions(market.videoId);

    if (contractConvictions.length === 0) {
      console.error(`No convictions found for market ${marketId}`);
      return false;
    }

    // Download conviction data for the fact/proof context
    const firstConviction = contractConvictions[0];
    const convictionData = await walrusService.downloadFile(firstConviction.walrusBlobId);
    const parsed = JSON.parse(convictionData.toString('utf-8'));

    // 4. Get VIDEO package URL from Walrus (not conviction!)
    // The video.walrusBlobId contains the zip with scenes, manifest, etc.
    const videoPackageUrl = walrusService.getPublicUrl(video.walrusBlobId);
    console.log(`Video package URL: ${videoPackageUrl}`);

    // 5. Analyze with Gemini (extracts scenes from zip and analyzes)
    console.log(`Analyzing conviction with Gemini...`);
    const verdict = await geminiService.resolveMarket(
      videoPackageUrl,
      parsed.fact || '',
      parsed.proof || ''
    );

    console.log(`Verdict: ${verdict.verdict}, Reasoning: ${verdict.reasoning}`);

    // 6. Resolve on-chain
    const txHash = await contractsService.resolveMarket(marketId, verdict.verdict);

    // 7. Emit SDS event
    await streamsService.emitMarketResolved({
      marketId,
      winningSide: verdict.verdict,
      yesCount: Number(market.yesVotes),
      noCount: Number(market.noVotes)
    });

    console.log(`Market ${marketId} resolved successfully: ${txHash}`);
    return true;
  } catch (error) {
    console.error(`Error resolving market ${marketId}:`, error);
    return false;
  }
}

/**
 * Main polling endpoint
 * GET /api/poll-updates
 *
 * Called by frontend every 20 seconds to check for work:
 * - Videos ready for market creation
 * - Markets ready for resolution
 */
router.get('/poll-updates', async (_req: Request, res: Response) => {
  try {
    const { contractsService } = getServices();
    const results = { marketsCreated: 0, marketsResolved: 0 };

    // 1. Check for videos ready for markets
    try {
      const readyVideos = await contractsService.getVideosReadyForMarkets();
      console.log(`Found ${readyVideos.length} videos ready for markets`);

      for (const video of readyVideos) {
        // Throttle logic is now inside createMarketForVideo() based on conviction count
        // This allows re-processing if new convictions arrive (though they can't after period ends)
        const created = await createMarketForVideo(video.id);
        results.marketsCreated += created;
      }
    } catch (error) {
      console.error('Error processing videos for markets:', error);
      // Continue to market resolution even if this fails
    }

    // 2. Check for markets ready for resolution
    try {
      const readyMarkets = await contractsService.getMarketsReadyForResolution();
      console.log(`Found ${readyMarkets.length} markets ready for resolution`);

      for (const market of readyMarkets) {
        // Use throttle to prevent duplicate processing (30 min TTL)
        if (throttleService.shouldProcess(`market-resolve-${market.id}`, 1800000)) {
          const resolved = await resolveMarketById(market.id);
          if (resolved) {
            results.marketsResolved++;
          }
        }
      }
    } catch (error) {
      console.error('Error processing markets for resolution:', error);
      // Log but don't fail the entire poll
    }

    console.log(`Poll complete: ${results.marketsCreated} markets created, ${results.marketsResolved} markets resolved`);

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Poll error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      marketsCreated: 0,
      marketsResolved: 0
    });
  }
});

export default router;

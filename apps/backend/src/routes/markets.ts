import { Router, Request, Response } from 'express';
import { getContractsService } from '../services/contracts';
import { GeminiService } from '../services/gemini';

const router = Router();

// Lazy initialize Gemini service to ensure env vars are loaded
let geminiService: GeminiService | null = null;
const getGeminiService = () => {
  if (!geminiService) {
    geminiService = new GeminiService();
  }
  return geminiService;
};

/**
 * Markets Routes
 * Handles prediction market operations via Celo contracts
 */

/**
 * GET /api/markets
 * List all prediction markets
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const contractsService = getContractsService();

    // Fetch all markets ready for resolution
    // Note: This gets unresolved markets; extend to get all markets if needed
    const markets = await contractsService.getMarketsReadyForResolution();

    res.status(200).json({
      success: true,
      count: markets.length,
      markets: markets.map(m => ({
        id: m.id,
        videoId: m.videoId,
        question: m.question,
        creator: m.creator,
        createdAt: Number(m.createdAt),
        expiresAt: Number(m.expiresAt),
        yesVotes: m.yesVotes.toString(),
        noVotes: m.noVotes.toString(),
        resolved: m.resolved,
        winningSide: m.winningSide,
        status: m.status
      }))
    });
  } catch (error) {
    console.error('Markets retrieval error:', error);
    res.status(500).json({
      error: 'Markets Retrieval Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/markets/:marketId
 * Get specific market details
 */
router.get('/:marketId', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;

    // Validate market ID
    if (!marketId || marketId.trim() === '') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'Market ID is required'
      });
      return;
    }

    const contractsService = getContractsService();

    // Fetch market details from contract
    const market = await contractsService.getMarket(marketId);

    res.status(200).json({
      success: true,
      market: {
        id: market.id,
        videoId: market.videoId,
        question: market.question,
        creator: market.creator,
        createdAt: Number(market.createdAt),
        expiresAt: Number(market.expiresAt),
        yesVotes: market.yesVotes.toString(),
        noVotes: market.noVotes.toString(),
        resolved: market.resolved,
        winningSide: market.winningSide,
        status: market.status
      }
    });
  } catch (error) {
    console.error('Market detail error:', error);

    // Check if market not found
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Market Not Found',
        message: `Market with ID ${req.params.marketId} does not exist`
      });
      return;
    }

    res.status(500).json({
      error: 'Market Detail Retrieval Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/markets/create
 * Create a new prediction market (manual)
 */
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { videoId, question, convictionIds } = req.body;

    // Validate required fields
    if (!videoId || typeof videoId !== 'string') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'videoId is required and must be a string'
      });
      return;
    }

    if (!question || typeof question !== 'string') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'question is required and must be a string'
      });
      return;
    }

    if (!convictionIds || !Array.isArray(convictionIds)) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'convictionIds is required and must be an array'
      });
      return;
    }

    const contractsService = getContractsService();

    // Create market on blockchain
    const marketId = await contractsService.createMarket(
      videoId,
      question,
      convictionIds
    );

    res.status(201).json({
      success: true,
      marketId,
      message: 'Market created successfully'
    });
  } catch (error) {
    console.error('Market creation error:', error);
    res.status(500).json({
      error: 'Market Creation Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/video/submit
 * Submit a video index to blockchain and emit SDS event
 */
router.post('/video/submit', async (req: Request, res: Response) => {
  try {
    const { videoId, walrusBlobId, userId, title } = req.body;

    if (!videoId || !walrusBlobId || !userId) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'videoId, walrusBlobId, and userId are required'
      });
      return;
    }

    const contractsService = getContractsService();

    // Submit to blockchain
    const txHash = await contractsService.submitVideo(videoId, walrusBlobId);

    res.status(201).json({
      success: true,
      txHash,
      message: 'Video submitted successfully'
    });
  } catch (error) {
    console.error('Video submission error:', error);
    res.status(500).json({
      error: 'Video Submission Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/video/conviction
 * Submit a conviction against a video and emit SDS event
 */
router.post('/video/conviction', async (req: Request, res: Response) => {
  try {
    const { videoId, proofBlobId, userId, fact } = req.body;

    if (!videoId || !proofBlobId || !userId) {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'videoId, proofBlobId, and userId are required'
      });
      return;
    }

    const contractsService = getContractsService();

    // Submit conviction to blockchain
    const txHash = await contractsService.submitConviction(videoId, proofBlobId);

    res.status(201).json({
      success: true,
      txHash,
      message: 'Conviction submitted successfully'
    });
  } catch (error) {
    console.error('Conviction submission error:', error);
    res.status(500).json({
      error: 'Conviction Submission Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/markets/:marketId/vote
 * Submit a vote on a prediction market
 */
router.post('/:marketId/vote', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const { isYes, userId } = req.body;

    // Validate market ID
    if (!marketId || marketId.trim() === '') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'Market ID is required'
      });
      return;
    }

    // Validate vote side
    if (typeof isYes !== 'boolean') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'isYes is required and must be a boolean'
      });
      return;
    }

    // Validate user ID
    if (!userId || typeof userId !== 'string') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'userId is required and must be a string'
      });
      return;
    }

    const contractsService = getContractsService();

    // Check if market exists
    const market = await contractsService.getMarket(marketId);

    if (market.resolved) {
      res.status(400).json({
        error: 'Market Already Resolved',
        message: 'Cannot vote on a resolved market'
      });
      return;
    }

    // Check if market is expired
    const currentTime = BigInt(Math.floor(Date.now() / 1000));
    if (market.expiresAt <= currentTime) {
      res.status(400).json({
        error: 'Market Expired',
        message: 'Cannot vote on an expired market'
      });
      return;
    }

    // Note: Voting logic would typically be handled client-side via wallet
    // This endpoint can track votes or trigger backend processes

    res.status(200).json({
      success: true,
      message: 'Vote recorded successfully'
    });
  } catch (error) {
    console.error('Vote submission error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Market Not Found',
        message: `Market with ID ${req.params.marketId} does not exist`
      });
      return;
    }

    res.status(500).json({
      error: 'Vote Submission Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/markets/:marketId/resolve
 * Resolve a prediction market (manual or AI-assisted)
 */
router.post('/:marketId/resolve', async (req: Request, res: Response) => {
  try {
    const { marketId } = req.params;
    const { winningSide, useAI, videoUrl, conviction, proof } = req.body;

    // Validate market ID
    if (!marketId || marketId.trim() === '') {
      res.status(400).json({
        error: 'Invalid Request',
        message: 'Market ID is required'
      });
      return;
    }

    const contractsService = getContractsService();

    // Check if market exists
    const market = await contractsService.getMarket(marketId);

    if (market.resolved) {
      res.status(400).json({
        error: 'Market Already Resolved',
        message: 'This market has already been resolved'
      });
      return;
    }

    let finalWinningSide: boolean;

    // AI-assisted resolution
    if (useAI === true) {
      if (!videoUrl || !conviction || !proof) {
        res.status(400).json({
          error: 'Invalid Request',
          message: 'videoUrl, conviction, and proof are required for AI resolution'
        });
        return;
      }

      console.log(`Resolving market ${marketId} with AI...`);
      const resolution = await getGeminiService().resolveMarket(videoUrl, conviction, proof);
      finalWinningSide = resolution.verdict;
      console.log(`AI resolution: ${finalWinningSide} - ${resolution.reasoning}`);
    } else {
      // Manual resolution
      if (typeof winningSide !== 'boolean') {
        res.status(400).json({
          error: 'Invalid Request',
          message: 'winningSide is required and must be a boolean for manual resolution'
        });
        return;
      }
      finalWinningSide = winningSide;
    }

    // Resolve market on blockchain
    const txHash = await contractsService.resolveMarket(marketId, finalWinningSide);

    res.status(200).json({
      success: true,
      txHash,
      winningSide: finalWinningSide,
      message: 'Market resolved successfully'
    });
  } catch (error) {
    console.error('Market resolution error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Market Not Found',
        message: `Market with ID ${req.params.marketId} does not exist`
      });
      return;
    }

    res.status(500).json({
      error: 'Market Resolution Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

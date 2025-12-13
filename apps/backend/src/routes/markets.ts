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
 * Handles prediction market operations via Story contracts
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

// NOTE: All transaction endpoints removed.
// Users now sign transactions directly via their wallet.
// Backend only handles read operations and AI resolution.

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

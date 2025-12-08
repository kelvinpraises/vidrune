import { Router, Request, Response } from 'express';
import { meiliSearchService, VideoManifest } from '../services/meilisearch';
import { getContractsService } from '../services/contracts';
import { streamsService } from '../services/streams';

const router = Router();

/**
 * Video Routes
 * Handles video registration and indexing
 */

/**
 * POST /api/video/register
 * Register a video after upload to Walrus
 * This endpoint:
 * 1. Indexes video in MeiliSearch for search
 * 2. Emits SDS event
 * 
 * Note: Blockchain submission is handled by the frontend via useSubmitVideoIndex()
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { videoId, walrusBlobId, metadata } = req.body;

    // Validate required fields
    if (!videoId || !walrusBlobId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'videoId and walrusBlobId are required'
      });
    }

    if (!metadata || !metadata.title || !metadata.searchableContent) {
      return res.status(400).json({
        success: false,
        error: 'Invalid metadata',
        message: 'metadata must include title and searchableContent'
      });
    }

    // 1. Index in MeiliSearch for search
    console.log(`Indexing video ${videoId} in MeiliSearch...`);
    const videoManifest: VideoManifest = {
      id: videoId,
      title: metadata.title,
      description: metadata.description,
      uploadedBy: metadata.uploadedBy,
      uploadTime: metadata.uploadTime,
      assetBaseUrl: metadata.assetBaseUrl || '',
      assets: metadata.assets || {
        video: '',
        captions: '',
        scenes: [],
        audio: []
      },
      summary: metadata.summary || '',
      scenes: metadata.scenes || [],
      searchableContent: metadata.searchableContent,
      tags: metadata.tags
    };

    await meiliSearchService.indexVideo(videoManifest);
    console.log(`Video ${videoId} indexed in MeiliSearch`);

    // 2. Emit SDS event
    try {
      await streamsService.emitVideoIndexed({
        videoId,
        userId: metadata.uploadedBy,
        title: metadata.title
      });
    } catch (sdsError) {
      console.error('Failed to emit SDS event:', sdsError);
      // Don't fail the request if SDS fails
    }

    res.json({
      success: true,
      videoId,
      message: 'Video indexed successfully'
    });
  } catch (error) {
    console.error('Video registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/video/:videoId
 * Get video metadata by ID
 */
router.get('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Video ID is required'
      });
    }

    // Get from MeiliSearch (faster than blockchain)
    const video = await meiliSearchService.getVideo(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Video ${videoId} not found`
      });
    }

    res.json({
      success: true,
      video
    });
  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({
      success: false,
      error: 'Retrieval Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

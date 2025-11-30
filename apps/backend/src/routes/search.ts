import { Router, Request, Response } from 'express';
import { meiliSearchService, VideoManifest } from '../services/meilisearch';

const router = Router();

/**
 * Search Routes
 * Handles MeiliSearch operations for content discovery
 */

// Search videos
// GET /api/search?q=query&limit=20&offset=0&filter=...&sort=uploadTime:desc
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const filter = req.query.filter as string | undefined;
    const sortParam = req.query.sort as string | undefined;

    // Validate limit
    if (limit < 1 || limit > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit',
        message: 'Limit must be between 1 and 100'
      });
    }

    // Validate offset
    if (offset < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid offset',
        message: 'Offset must be non-negative'
      });
    }

    // Parse sort parameter
    const sort = sortParam ? sortParam.split(',') : undefined;

    // Execute search
    const results = await meiliSearchService.search(query, {
      limit,
      offset,
      filter,
      sort
    });

    // Return results in frontend-compatible format
    // The results already match the expected BackendSearchResult format
    res.json({
      success: true,
      results,
      total: results.length,
      query,
      limit,
      offset
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get search stats
// GET /api/search/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await meiliSearchService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Stats Retrieval Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Index a video document
// POST /api/search/index
// Body: VideoManifest
router.post('/index', async (req: Request, res: Response) => {
  try {
    const manifest = req.body as VideoManifest;

    // Validate manifest
    if (!manifest.id || !manifest.title) {
      return res.status(400).json({
        success: false,
        error: 'Invalid manifest',
        message: 'Manifest must include id and title'
      });
    }

    if (!manifest.searchableContent) {
      return res.status(400).json({
        success: false,
        error: 'Invalid manifest',
        message: 'Manifest must include searchableContent'
      });
    }

    // Index the video
    await meiliSearchService.indexVideo(manifest);

    res.json({
      success: true,
      message: 'Video indexed successfully',
      videoId: manifest.id
    });
  } catch (error) {
    console.error('Indexing error:', error);
    res.status(500).json({
      success: false,
      error: 'Indexing Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Batch index videos
// POST /api/search/index/batch
// Body: { manifests: VideoManifest[] }
router.post('/index/batch', async (req: Request, res: Response) => {
  try {
    const { manifests } = req.body;

    // Validate manifests array
    if (!Array.isArray(manifests)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Request body must include manifests array'
      });
    }

    if (manifests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Manifests array cannot be empty'
      });
    }

    // Validate each manifest
    for (const manifest of manifests) {
      if (!manifest.id || !manifest.title || !manifest.searchableContent) {
        return res.status(400).json({
          success: false,
          error: 'Invalid manifest',
          message: 'Each manifest must include id, title, and searchableContent'
        });
      }
    }

    // Batch index
    await meiliSearchService.batchIndexVideos(manifests);

    res.json({
      success: true,
      message: 'Videos indexed successfully',
      count: manifests.length
    });
  } catch (error) {
    console.error('Batch indexing error:', error);
    res.status(500).json({
      success: false,
      error: 'Batch Indexing Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get video by ID
// GET /api/search/video/:videoId
router.get('/video/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Video ID is required'
      });
    }

    const video = await meiliSearchService.getVideo(videoId);

    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: `Video ${videoId} not found in index`
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

// Delete video from index
// DELETE /api/search/:videoId
router.delete('/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;

    if (!videoId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Video ID is required'
      });
    }

    await meiliSearchService.deleteVideo(videoId);

    res.json({
      success: true,
      message: 'Video deleted from index',
      videoId
    });
  } catch (error) {
    console.error('Deletion error:', error);
    res.status(500).json({
      success: false,
      error: 'Deletion Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

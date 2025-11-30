import { Router, Request, Response } from 'express';
import { streamsService } from '../services/streams';

const router = Router();

/**
 * Admin Routes
 * Internal management endpoints
 */

/**
 * Register Somnia Data Streams event schema
 * This should be called once when deploying the backend for the first time
 *
 * POST /api/admin/register-sds-schema
 */
router.post('/register-sds-schema', async (req: Request, res: Response) => {
  try {
    await streamsService.registerEventSchema();

    res.json({
      success: true,
      message: 'Event schema registered successfully on Somnia Data Streams'
    });
  } catch (error) {
    console.error('Schema registration error:', error);
    res.status(500).json({
      error: 'Schema Registration Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Check Somnia Data Streams connection status
 *
 * GET /api/admin/sds-status
 */
router.get('/sds-status', (req: Request, res: Response) => {
  try {
    const status = streamsService.getConnectionStatus();

    res.json({
      status: status.connected ? 'connected' : 'disconnected',
      sdk: status.sdk ? 'initialized' : 'not initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Status Check Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Test event emission
 * Useful for verifying SDS integration
 *
 * POST /api/admin/test-event
 */
router.post('/test-event', async (req: Request, res: Response) => {
  try {
    const testVideoId = `test-${Date.now()}`;

    await streamsService.emitVideoIndexed({
      videoId: testVideoId,
      userId: 'test-user',
      title: 'Test Video Event'
    });

    res.json({
      success: true,
      message: 'Test event emitted successfully',
      videoId: testVideoId
    });
  } catch (error) {
    console.error('Test event error:', error);
    res.status(500).json({
      error: 'Test Event Failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

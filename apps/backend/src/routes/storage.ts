import { Router, Request, Response } from 'express';
import multer from 'multer';
import { WalrusService } from '../services/walrus';

const router = Router();

// Lazy initialize Walrus service to ensure env vars are loaded
let walrusService: WalrusService | null = null;
const getWalrusService = () => {
  if (!walrusService) {
    walrusService = new WalrusService();
  }
  return walrusService;
};

// Configure multer for file uploads
// Store files in memory with 500MB limit (suitable for video uploads)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max file size
  },
});

/**
 * Storage Routes
 * Handles Walrus storage operations for video uploads and retrieval
 */

/**
 * POST /api/storage/upload
 * Upload a file to Walrus storage
 * Expects multipart/form-data with 'file' field
 */
router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    // Validate file exists
    if (!req.file) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file provided. Please upload a file using the "file" field.',
      });
    }

    // Upload to Walrus
    const result = await getWalrusService().uploadFile(
      req.file.buffer,
      req.file.originalname
    );

    // Return success response
    res.status(200).json({
      success: true,
      blobId: result.blobId,
      url: result.url,
      size: result.size,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Handle file size limit error
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File Too Large',
        message: 'File size exceeds 500MB limit',
      });
    }

    res.status(500).json({
      error: 'Upload Failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred during upload',
    });
  }
});

/**
 * POST /api/storage/upload-json
 * Upload JSON data to Walrus storage
 * Expects JSON body with data to upload
 */
router.post('/upload-json', async (req: Request, res: Response) => {
  try {
    // Validate JSON body exists
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No data provided. Please send JSON data in the request body.',
      });
    }

    // Get optional filename from query params or use default
    const filename = (req.query.filename as string) || 'data.json';

    // Upload to Walrus
    const result = await getWalrusService().uploadBlob(req.body, filename);

    // Return success response
    res.status(200).json({
      success: true,
      blobId: result.blobId,
      url: result.url,
      size: result.size,
      filename,
    });
  } catch (error) {
    console.error('JSON upload error:', error);
    res.status(500).json({
      error: 'Upload Failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred during JSON upload',
    });
  }
});

/**
 * GET /api/storage/proxy/:blobId
 * Proxy download from Walrus to avoid CORS issues
 * Walrus blocks requests with Origin: localhost
 */
router.get('/proxy/:blobId', async (req: Request, res: Response) => {
  try {
    const { blobId } = req.params;

    if (!blobId || blobId.trim().length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Blob ID is required',
      });
    }

    console.log(`[Storage] Proxying download for blob: ${blobId}`);

    // Download from Walrus (backend has no CORS restrictions)
    const buffer = await getWalrusService().downloadFile(blobId);

    // Stream the response
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(buffer);
  } catch (error) {
    console.error('Proxy download error:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Blob ${req.params.blobId} not found in Walrus`,
      });
    }

    res.status(500).json({
      error: 'Download Failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

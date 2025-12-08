/**
 * Walrus Service Test Examples
 *
 * This file demonstrates how to use the WalrusService
 * Run with: npm test or tsx src/services/walrus.test.ts
 */

import { WalrusService } from './walrus';

async function testWalrusService() {
  const walrus = new WalrusService();

  console.log('=== Walrus Service Test Examples ===\n');

  // Test 1: Upload a text file
  try {
    console.log('1. Uploading text file...');
    const textBuffer = Buffer.from('Hello, Walrus!', 'utf-8');
    const textResult = await walrus.uploadFile(textBuffer, 'hello.txt');
    console.log('✓ Text file uploaded:');
    console.log(`  - Blob ID: ${textResult.blobId}`);
    console.log(`  - URL: ${textResult.url}`);
    console.log(`  - Size: ${textResult.size} bytes\n`);
  } catch (error) {
    console.error('✗ Text upload failed:', error instanceof Error ? error.message : error);
  }

  // Test 2: Upload JSON data
  try {
    console.log('2. Uploading JSON blob...');
    const jsonData = {
      title: 'Test Video',
      description: 'A test video manifest',
      scenes: [
        { id: 1, timestamp: 0, description: 'Scene 1' },
        { id: 2, timestamp: 5000, description: 'Scene 2' },
      ],
    };
    const jsonResult = await walrus.uploadBlob(jsonData, 'manifest.json');
    console.log('✓ JSON blob uploaded:');
    console.log(`  - Blob ID: ${jsonResult.blobId}`);
    console.log(`  - URL: ${jsonResult.url}`);
    console.log(`  - Size: ${jsonResult.size} bytes\n`);

    // Test 3: Download the JSON blob back
    console.log('3. Downloading blob...');
    const downloaded = await walrus.downloadFile(jsonResult.blobId);
    const parsedData = JSON.parse(downloaded.toString('utf-8'));
    console.log('✓ Blob downloaded and parsed:');
    console.log(`  - Title: ${parsedData.title}`);
    console.log(`  - Scenes: ${parsedData.scenes.length}\n`);
  } catch (error) {
    console.error('✗ JSON operations failed:', error instanceof Error ? error.message : error);
  }

  // Test 4: Get public URL
  try {
    console.log('4. Generating public URL...');
    const testBlobId = 'test-blob-id-12345';
    const publicUrl = walrus.getPublicUrl(testBlobId);
    console.log(`✓ Public URL: ${publicUrl}\n`);
  } catch (error) {
    console.error('✗ URL generation failed:', error instanceof Error ? error.message : error);
  }

  // Test 5: Error handling (missing blob)
  try {
    console.log('5. Testing error handling (non-existent blob)...');
    await walrus.downloadFile('non-existent-blob-id');
  } catch (error) {
    console.log('✓ Error handled correctly:', error instanceof Error ? error.message : error);
  }
}

// Example integration with Express route
export function exampleRouteHandler() {
  return `
  // Example: Using WalrusService in an Express route
  import { WalrusService } from '../services/walrus';
  import multer from 'multer';

  const walrus = new WalrusService();
  const upload = multer({ storage: multer.memoryStorage() });

  router.post('/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const result = await walrus.uploadFile(
        req.file.buffer,
        req.file.originalname
      );

      res.json({
        success: true,
        blobId: result.blobId,
        url: result.url,
        size: result.size
      });
    } catch (error) {
      res.status(500).json({
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  router.get('/download/:blobId', async (req, res) => {
    try {
      const buffer = await walrus.downloadFile(req.params.blobId);

      res.set('Content-Type', 'application/octet-stream');
      res.send(buffer);
    } catch (error) {
      res.status(404).json({
        error: 'Download failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  `;
}

// Run tests if this file is executed directly
if (require.main === module) {
  testWalrusService().catch(console.error);
}

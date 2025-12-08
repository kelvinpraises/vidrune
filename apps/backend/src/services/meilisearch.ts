/**
 * MeiliSearch Service
 *
 * Provides video manifest indexing and search functionality using MeiliSearch Cloud.
 * Indexes video transcriptions, scene descriptions, and TTS content for fast, relevant search.
 */

import { MeiliSearch, Index } from 'meilisearch';
import type { SearchParams } from 'meilisearch';

// Video Manifest Types
export interface VideoManifest {
  id: string;
  title: string;
  description?: string;
  uploadedBy: string;
  uploadTime: number;
  assetBaseUrl: string;
  assets: {
    video: string;
    captions: string;
    scenes: string[];
    audio: string[];
  };
  summary: string;
  scenes: Array<{
    description: string;
    keywords: string[];
  }>;
  searchableContent: {
    transcription: string;
    sceneDescriptions: string;
    ttsContent: string;
  };
  tags?: string[];
}

// Search Options
export interface SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  sort?: string[];
}

// Indexed Document Structure
export interface VideoIndexDocument {
  id: string;
  title: string;
  description?: string;
  transcription: string;
  sceneDescriptions: string;
  ttsContent: string;
  uploadedBy: string;
  uploadTime: number;
  tags?: string[];
}

// Search Result
export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  transcription: string;
  sceneDescriptions: string;
  ttsContent: string;
  uploadedBy: string;
  uploadTime: number;
  tags?: string[];
  _formatted?: Partial<VideoIndexDocument>;
  _matchesPosition?: any;
}

/**
 * MeiliSearch Service for video manifest indexing and search
 */
export class MeiliSearchService {
  private client: MeiliSearch;
  private index: Index;
  private indexName = 'videos';

  private isConfigured: boolean = false;

  constructor() {
    const host = process.env.MEILISEARCH_HOST;
    const apiKey = process.env.MEILISEARCH_API_KEY;

    if (!host || !apiKey) {
      console.warn('⚠️  MeiliSearch not configured - search features will be disabled');
      console.warn('   Set MEILISEARCH_HOST and MEILISEARCH_API_KEY in .env to enable search');
      this.isConfigured = false;
      // Create dummy client and index to avoid null checks everywhere
      this.client = null as any;
      this.index = null as any;
      return;
    }

    this.isConfigured = true;
    this.client = new MeiliSearch({
      host,
      apiKey,
    });

    this.index = this.client.index(this.indexName);
    this.initializeIndex();
  }

  /**
   * Initialize index settings for optimal search performance
   */
  private async initializeIndex(): Promise<void> {
    if (!this.isConfigured) return;

    try {
      // Configure searchable attributes (ranked by importance)
      await this.index.updateSearchableAttributes([
        'title',
        'transcription',
        'sceneDescriptions',
        'ttsContent',
        'description',
        'tags',
      ]);

      // Configure filterable attributes
      await this.index.updateFilterableAttributes(['uploadedBy', 'uploadTime', 'tags']);

      // Configure sortable attributes
      await this.index.updateSortableAttributes(['uploadTime']);

      // Configure displayed attributes
      await this.index.updateDisplayedAttributes([
        'id',
        'title',
        'description',
        'transcription',
        'sceneDescriptions',
        'ttsContent',
        'uploadedBy',
        'uploadTime',
        'tags',
      ]);

      // Configure ranking rules for relevance
      await this.index.updateRankingRules([
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ]);

      console.log('✅ MeiliSearch index configured successfully');
    } catch (error: any) {
      // Gracefully handle connection errors during init
      const isConnectionError =
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error?.cause?.code === 'ECONNREFUSED' ||
        error?.cause?.code === 'ENOTFOUND' ||
        error?.message?.includes('fetch failed');

      if (isConnectionError) {
        console.warn('⚠️  MeiliSearch unavailable - search will return empty results until connection is restored');
      } else {
        console.error('Error initializing MeiliSearch index:', error);
      }
      // Don't throw - allow service to continue even if settings update fails
    }
  }

  /**
   * Convert VideoManifest to indexed document format
   */
  private manifestToDocument(manifest: VideoManifest): VideoIndexDocument {
    return {
      id: manifest.id,
      title: manifest.title,
      description: manifest.description,
      transcription: manifest.searchableContent.transcription,
      sceneDescriptions: manifest.searchableContent.sceneDescriptions,
      ttsContent: manifest.searchableContent.ttsContent,
      uploadedBy: manifest.uploadedBy,
      uploadTime: manifest.uploadTime,
      tags: manifest.tags,
    };
  }

  /**
   * Index a single video manifest
   * @param manifest - Video manifest to index
   */
  async indexVideo(manifest: VideoManifest): Promise<void> {
    if (!this.isConfigured) {
      console.warn('MeiliSearch not configured, skipping video indexing');
      return;
    }
    
    try {
      const document = this.manifestToDocument(manifest);
      await this.index.addDocuments([document], { primaryKey: 'id' });
      console.log(`Indexed video: ${manifest.id}`);
    } catch (error) {
      console.error(`Error indexing video ${manifest.id}:`, error);
      throw error;
    }
  }

  /**
   * Batch index multiple video manifests
   * @param manifests - Array of video manifests to index
   */
  async batchIndexVideos(manifests: VideoManifest[]): Promise<void> {
    if (!this.isConfigured) {
      console.warn('MeiliSearch not configured, skipping batch video indexing');
      return;
    }
    
    try {
      const documents = manifests.map(m => this.manifestToDocument(m));
      const task = await this.index.addDocuments(documents, { primaryKey: 'id' });
      console.log(`Batch indexing ${manifests.length} videos. Task UID: ${task.taskUid}`);
    } catch (error) {
      console.error('Error batch indexing videos:', error);
      throw error;
    }
  }

  /**
   * Search videos by query
   * @param query - Search query string
   * @param options - Search options (limit, offset, filter, sort)
   * @returns Array of search results
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isConfigured) {
      return [];
    }

    try {
      const searchParams: SearchParams = {
        limit: options.limit || 20,
        offset: options.offset || 0,
        attributesToHighlight: ['title', 'transcription', 'sceneDescriptions', 'ttsContent'],
      };

      if (options.filter) {
        searchParams.filter = options.filter;
      }

      if (options.sort) {
        searchParams.sort = options.sort;
      }

      const results = await this.index.search<VideoIndexDocument>(query, searchParams);
      return results.hits as SearchResult[];
    } catch (error: any) {
      // Gracefully handle connection errors - return empty results instead of crashing
      const isConnectionError =
        error?.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
        error?.cause?.code === 'ECONNREFUSED' ||
        error?.cause?.code === 'ENOTFOUND' ||
        error?.message?.includes('fetch failed');

      if (isConnectionError) {
        console.warn('MeiliSearch unavailable, returning empty search results');
        return [];
      }

      console.error('Error searching videos:', error);
      throw error;
    }
  }

  /**
   * Delete a video from the index
   * @param videoId - ID of the video to delete
   */
  async deleteVideo(videoId: string): Promise<void> {
    if (!this.isConfigured) {
      console.warn('MeiliSearch not configured, skipping video deletion');
      return;
    }
    
    try {
      await this.index.deleteDocument(videoId);
      console.log(`Deleted video from index: ${videoId}`);
    } catch (error) {
      console.error(`Error deleting video ${videoId}:`, error);
      throw error;
    }
  }

  /**
   * Get video by ID from index
   * @param videoId - ID of the video
   * @returns Video document or null if not found
   */
  async getVideo(videoId: string): Promise<VideoIndexDocument | null> {
    if (!this.isConfigured) {
      console.warn('MeiliSearch not configured, returning null');
      return null;
    }
    
    try {
      const document = await this.index.getDocument<VideoIndexDocument>(videoId);
      return document;
    } catch (error) {
      console.error(`Error getting video ${videoId}:`, error);
      return null;
    }
  }

  /**
   * Get index statistics
   * @returns Index stats including number of documents
   */
  async getStats(): Promise<any> {
    if (!this.isConfigured) {
      console.warn('MeiliSearch not configured, returning empty stats');
      return { numberOfDocuments: 0 };
    }
    
    try {
      return await this.index.getStats();
    } catch (error) {
      console.error('Error getting index stats:', error);
      throw error;
    }
  }

  /**
   * Clear all documents from the index
   * WARNING: This deletes all indexed videos
   */
  async clearIndex(): Promise<void> {
    if (!this.isConfigured) {
      console.warn('MeiliSearch not configured, skipping index clearing');
      return;
    }
    
    try {
      await this.index.deleteAllDocuments();
      console.log('Cleared all documents from index');
    } catch (error) {
      console.error('Error clearing index:', error);
      throw error;
    }
  }
}

// Lazy singleton - only instantiate when first accessed
let meiliSearchServiceInstance: MeiliSearchService | null = null;

export function getMeiliSearchService(): MeiliSearchService {
  if (!meiliSearchServiceInstance) {
    meiliSearchServiceInstance = new MeiliSearchService();
  }
  return meiliSearchServiceInstance;
}

// For backwards compatibility - lazy getter
export const meiliSearchService = {
  get instance() {
    return getMeiliSearchService();
  },
  search: (...args: Parameters<MeiliSearchService['search']>) => getMeiliSearchService().search(...args),
  indexVideo: (...args: Parameters<MeiliSearchService['indexVideo']>) => getMeiliSearchService().indexVideo(...args),
  batchIndexVideos: (...args: Parameters<MeiliSearchService['batchIndexVideos']>) => getMeiliSearchService().batchIndexVideos(...args),
  deleteVideo: (...args: Parameters<MeiliSearchService['deleteVideo']>) => getMeiliSearchService().deleteVideo(...args),
  getVideo: (...args: Parameters<MeiliSearchService['getVideo']>) => getMeiliSearchService().getVideo(...args),
  getStats: () => getMeiliSearchService().getStats(),
  clearIndex: () => getMeiliSearchService().clearIndex(),
};

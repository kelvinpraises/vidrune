/**
 * Somnia Data Streams Service
 *
 * Handles event emission via Somnia Data Streams (SDS) protocol
 * Publishes real-time events for frontend subscription
 */

import { SDK, SchemaEncoder } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, type Address, toHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Somnia testnet chain configuration
const somniaTestnet = {
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: {
    name: 'STT',
    symbol: 'STT',
    decimals: 18
  },
  rpcUrls: {
    default: {
      http: [process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network']
    }
  }
} as const;

// Event type definitions
export type EventType =
  | 'video-indexed'
  | 'conviction-submitted'
  | 'market-created'
  | 'market-vote'
  | 'market-resolved'
  | 'points-awarded'
  | 'processing-update';

interface BaseEvent {
  eventType: EventType;
  timestamp: number;
}

interface VideoIndexedData {
  videoId: string;
  userId: string;
  title: string;
}

interface ConvictionSubmittedData {
  convictionId: string;
  videoId: string;
  userId: string;
  fact: string;
}

interface MarketCreatedData {
  marketId: string;
  videoId: string;
  question: string;
}

interface MarketVoteData {
  marketId: string;
  userId: string;
  isYes: boolean;
}

interface MarketResolvedData {
  marketId: string;
  winningSide: boolean;
  yesCount: number;
  noCount: number;
}

interface PointsAwardedData {
  userId: string;
  amount: number;
  reason: string;
}

interface ProcessingUpdateData {
  videoId: string;
  stage: string;
  progress: number;
}

/**
 * Somnia Data Streams Service
 * Emits events to on-chain data streams for real-time frontend updates
 */
export class StreamsService {
  private sdk: SDK | null = null;
  private isConnected: boolean = false;
  private schemaEncoder: SchemaEncoder | null = null;
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000; // 1 second

  // Event schema ID (will be registered on first use)
  private eventSchemaId: string = 'vidrune-events';

  constructor() {
    try {
      this.initializeSDK();

      // Initialize schema encoder for event data
      // Schema: eventType (string), timestamp (uint256), data (string as JSON)
      this.schemaEncoder = new SchemaEncoder('string eventType,uint256 timestamp,string data');

      console.log('StreamsService initialized');
    } catch (error) {
      console.error('Failed to initialize StreamsService:', error);
      console.warn('SDS events will be logged but not emitted');
    }
  }

  /**
   * Initialize Somnia Data Streams SDK
   */
  private initializeSDK(): void {
    // Skip if no private key configured
    if (!process.env.BACKEND_WALLET_PRIVATE_KEY) {
      console.warn('BACKEND_WALLET_PRIVATE_KEY not set - SDS events will be disabled');
      return;
    }

    try {
      const account = privateKeyToAccount(process.env.BACKEND_WALLET_PRIVATE_KEY as `0x${string}`);

      // Create viem clients
      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(process.env.SOMNIA_RPC_URL)
      });

      const walletClient = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: http(process.env.SOMNIA_RPC_URL)
      });

      // Initialize SDK
      this.sdk = new SDK({
        public: publicClient as any,
        wallet: walletClient as any
      });

      this.isConnected = true;
      console.log('SDS SDK connected successfully');
    } catch (error) {
      console.error('Failed to initialize SDS SDK:', error);
      this.isConnected = false;
    }
  }

  /**
   * Emit a generic event with retry logic using Data Streams
   */
  private async emitEvent<T>(eventType: EventType, data: T): Promise<void> {
    // Don't fail if SDS is not available
    if (!this.sdk || !this.isConnected || !this.schemaEncoder) {
      console.log(`[SDS-OFFLINE] ${eventType}:`, JSON.stringify(data));
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);

        // Encode event data
        const encodedData = this.schemaEncoder.encodeData([
          { name: 'eventType', type: 'string', value: eventType },
          { name: 'timestamp', type: 'uint256', value: BigInt(timestamp) },
          { name: 'data', type: 'string', value: JSON.stringify(data) }
        ]);

        // Compute schema ID
        const schemaIdResult = await this.sdk.streams.computeSchemaId(
          'string eventType,uint256 timestamp,string data'
        );

        if (schemaIdResult instanceof Error) {
          throw schemaIdResult;
        }

        // Create unique data ID for this event
        const dataId = toHex(`${eventType}-${timestamp}-${Date.now()}`, { size: 32 });

        // Publish to SDS using Data Streams
        const dataStreams = [{
          id: dataId,
          schemaId: schemaIdResult,
          data: encodedData
        }];

        const result = await this.sdk.streams.set(dataStreams);

        if (result instanceof Error) {
          throw result;
        }

        console.log(`[SDS] Event published: ${eventType} - tx: ${result}`);
        return;
      } catch (error) {
        lastError = error as Error;
        console.error(`SDS publish failed (attempt ${attempt}/${this.MAX_RETRIES}):`, error);

        if (attempt < this.MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
        }
      }
    }

    // Log final failure but don't throw (graceful degradation)
    console.error(`[SDS-FAILED] ${eventType} after ${this.MAX_RETRIES} attempts:`, lastError?.message);
    console.log(`[SDS-FALLBACK] ${eventType}:`, JSON.stringify(data));
  }

  /**
   * Emit video indexed event
   */
  async emitVideoIndexed(data: VideoIndexedData): Promise<void> {
    await this.emitEvent('video-indexed', data);
  }

  /**
   * Emit conviction submitted event
   */
  async emitConvictionSubmitted(data: ConvictionSubmittedData): Promise<void> {
    await this.emitEvent('conviction-submitted', data);
  }

  /**
   * Emit market created event
   */
  async emitMarketCreated(data: MarketCreatedData): Promise<void> {
    await this.emitEvent('market-created', data);
  }

  /**
   * Emit market vote event
   */
  async emitMarketVote(data: MarketVoteData): Promise<void> {
    await this.emitEvent('market-vote', data);
  }

  /**
   * Emit market resolved event
   */
  async emitMarketResolved(data: MarketResolvedData): Promise<void> {
    await this.emitEvent('market-resolved', data);
  }

  /**
   * Emit points awarded event
   */
  async emitPointsAwarded(data: PointsAwardedData): Promise<void> {
    await this.emitEvent('points-awarded', data);
  }

  /**
   * Emit processing update event
   */
  async emitProcessingUpdate(data: ProcessingUpdateData): Promise<void> {
    await this.emitEvent('processing-update', data);
  }

  /**
   * Register data schema (call once during initialization)
   * This should be called when deploying the backend for the first time
   */
  async registerEventSchema(): Promise<void> {
    if (!this.sdk || !this.isConnected) {
      console.warn('Cannot register data schema - SDK not connected');
      return;
    }

    try {
      const { zeroBytes32 } = await import('@somnia-chain/streams');
      const eventSchema = 'string eventType,uint256 timestamp,string data';

      // Register as Data Schema (not Event Schema)
      const ignoreAlreadyRegistered = true;

      const result = await this.sdk.streams.registerDataSchemas(
        [{
          schemaName: 'vidrune-events',
          schema: eventSchema,
          parentSchemaId: zeroBytes32 as `0x${string}`
        }],
        ignoreAlreadyRegistered
      );

      if (result) {
        console.log(`✅ Data schema registered - tx: ${result}`);
      } else {
        console.log('ℹ️ Schema already registered — no action required');
      }
    } catch (error: any) {
      if (String(error).includes('SchemaAlreadyRegistered')) {
        console.log('⚠️ Schema already registered. Continuing...');
      } else {
        console.error('Failed to register data schema:', error);
        throw error;
      }
    }
  }

  /**
   * Check connection status
   */
  getConnectionStatus(): { connected: boolean; sdk: boolean } {
    return {
      connected: this.isConnected,
      sdk: this.sdk !== null
    };
  }
}

// Lazy singleton - only instantiate when first accessed
let streamsServiceInstance: StreamsService | null = null;

export function getStreamsService(): StreamsService {
  if (!streamsServiceInstance) {
    streamsServiceInstance = new StreamsService();
  }
  return streamsServiceInstance;
}

// For backwards compatibility - lazy proxy
export const streamsService = {
  get instance() {
    return getStreamsService();
  },
  emitVideoIndexed: (...args: Parameters<StreamsService['emitVideoIndexed']>) => getStreamsService().emitVideoIndexed(...args),
  emitConvictionSubmitted: (...args: Parameters<StreamsService['emitConvictionSubmitted']>) => getStreamsService().emitConvictionSubmitted(...args),
  emitMarketCreated: (...args: Parameters<StreamsService['emitMarketCreated']>) => getStreamsService().emitMarketCreated(...args),
  emitMarketVote: (...args: Parameters<StreamsService['emitMarketVote']>) => getStreamsService().emitMarketVote(...args),
  emitMarketResolved: (...args: Parameters<StreamsService['emitMarketResolved']>) => getStreamsService().emitMarketResolved(...args),
  emitPointsAwarded: (...args: Parameters<StreamsService['emitPointsAwarded']>) => getStreamsService().emitPointsAwarded(...args),
  emitProcessingUpdate: (...args: Parameters<StreamsService['emitProcessingUpdate']>) => getStreamsService().emitProcessingUpdate(...args),
  registerEventSchema: () => getStreamsService().registerEventSchema(),
  getConnectionStatus: () => getStreamsService().getConnectionStatus(),
};

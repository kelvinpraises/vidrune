/**
 * Somnia Data Streams Integration
 *
 * Real-time event streaming for Vidrune platform using Somnia Data Streams (SDS).
 * Subscribes to events emitted by the backend.
 */

import { createPublicClient, http } from 'viem';

// Dynamic import to avoid breaking the app if SDK fails to load
type SDKType = any;
let SDKClass: (new (config: any) => SDKType) | null = null;
let sdkLoadError: Error | null = null;

// Attempt to load the SDK dynamically
const loadSDK = async (): Promise<boolean> => {
  if (SDKClass) return true;
  if (sdkLoadError) return false;
  
  try {
    const module = await import('@somnia-chain/streams');
    SDKClass = module.SDK;
    return true;
  } catch (error) {
    console.warn('Failed to load @somnia-chain/streams SDK:', error);
    sdkLoadError = error as Error;
    return false;
  }
};

// ============================================================================
// Event Types & Schemas
// ============================================================================

export type EventType =
  | 'VIDEO_INDEXED'
  | 'CONVICTION_SUBMITTED'
  | 'MARKET_CREATED'
  | 'MARKET_VOTE'
  | 'MARKET_RESOLVED'
  | 'PROCESSING_UPDATE'
  | 'POINTS_AWARDED';

// Video Events
export interface VideoIndexedEvent {
  eventType: 'VIDEO_INDEXED';
  videoId: string;
  uploader: string;
  timestamp: number;
}

// Conviction Events
export interface ConvictionSubmittedEvent {
  eventType: 'CONVICTION_SUBMITTED';
  videoId: string;
  convictionId: string;
  challenger: string;
  timestamp: number;
}

// Market Events
export interface MarketCreatedEvent {
  eventType: 'MARKET_CREATED';
  marketId: string;
  videoId: string;
  question: string;
  timestamp: number;
}

export interface MarketVoteEvent {
  eventType: 'MARKET_VOTE';
  marketId: string;
  isYes: boolean;
  voter: string;
  yesCount: number;
  noCount: number;
  timestamp: number;
}

export interface MarketResolvedEvent {
  eventType: 'MARKET_RESOLVED';
  marketId: string;
  winningSide: boolean;
  timestamp: number;
}

// Processing Events
export interface ProcessingUpdateEvent {
  eventType: 'PROCESSING_UPDATE';
  videoId: string;
  stage: string;
  progress: number;
  timestamp: number;
}

// Points Events
export interface PointsAwardedEvent {
  eventType: 'POINTS_AWARDED';
  user: string;
  amount: number;
  reason: string;
  newTotal: number;
  timestamp: number;
}

// Union type for all events
export type ActivityEvent =
  | VideoIndexedEvent
  | ConvictionSubmittedEvent
  | MarketCreatedEvent
  | MarketVoteEvent
  | MarketResolvedEvent
  | ProcessingUpdateEvent
  | PointsAwardedEvent;

// Market odds data structure
export interface MarketOdds {
  marketId: string;
  yesCount: number;
  noCount: number;
  yesPercentage: number;
  noPercentage: number;
  timestamp: number;
}

// Processing status data structure
export interface ProcessingStatus {
  videoId: string;
  stage: string;
  progress: number;
  timestamp: number;
}

// ============================================================================
// SDS Service Instance
// ============================================================================

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
      http: ['https://dream-rpc.somnia.network']
    }
  }
} as const;

let sdsInstance: SDKType | null = null;
let isInitialized = false;

/**
 * Initialize Somnia Data Streams SDK
 */
export const initializeSDS = async (): Promise<boolean> => {
  if (isInitialized && sdsInstance) {
    return true;
  }

  // First, try to load the SDK
  const sdkLoaded = await loadSDK();
  if (!sdkLoaded || !SDKClass) {
    console.warn('Somnia Data Streams SDK not available - activity feed will be disabled');
    return false;
  }

  try {
    const publicClient = createPublicClient({
      chain: somniaTestnet,
      transport: http('https://dream-rpc.somnia.network')
    });

    sdsInstance = new SDKClass({
      public: publicClient as any
    });

    isInitialized = true;
    console.log('✅ Somnia Data Streams initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize Somnia Data Streams:', error);
    return false;
  }
};

// ============================================================================
// Event Parsing Helper
// ============================================================================

/**
 * Parse SDS event data into typed event
 */
const parseSDSEvent = (rawEvent: any): ActivityEvent | null => {
  try {
    const eventType = rawEvent.eventType;
    const data = typeof rawEvent.data === 'string' ? JSON.parse(rawEvent.data) : rawEvent.data;
    const timestamp = Number(rawEvent.timestamp);

    switch (eventType) {
      case 'video-indexed':
        return {
          eventType: 'VIDEO_INDEXED',
          videoId: data.videoId,
          uploader: data.userId,
          timestamp
        };
      case 'conviction-submitted':
        return {
          eventType: 'CONVICTION_SUBMITTED',
          videoId: data.videoId,
          convictionId: data.convictionId,
          challenger: data.userId,
          timestamp
        };
      case 'market-created':
        return {
          eventType: 'MARKET_CREATED',
          marketId: data.marketId,
          videoId: data.videoId,
          question: data.question,
          timestamp
        };
      case 'market-vote':
        return {
          eventType: 'MARKET_VOTE',
          marketId: data.marketId,
          isYes: data.isYes,
          voter: data.userId,
          yesCount: 0, // Will be fetched from contract
          noCount: 0,
          timestamp
        };
      case 'market-resolved':
        return {
          eventType: 'MARKET_RESOLVED',
          marketId: data.marketId,
          winningSide: data.winningSide,
          timestamp
        };
      case 'processing-update':
        return {
          eventType: 'PROCESSING_UPDATE',
          videoId: data.videoId,
          stage: data.stage,
          progress: data.progress,
          timestamp
        };
      case 'points-awarded':
        return {
          eventType: 'POINTS_AWARDED',
          user: data.userId,
          amount: data.amount,
          reason: data.reason,
          newTotal: 0, // Will be fetched from contract
          timestamp
        };
      default:
        console.warn('Unknown event type:', eventType);
        return null;
    }
  } catch (error) {
    console.error('Failed to parse SDS event:', error);
    return null;
  }
};

// ============================================================================
// Subscribe Methods (Listen for Events from Backend)
// ============================================================================

/**
 * Subscribe to all platform activity events from SDS
 * Uses polling to fetch events from the backend publisher
 */
export const subscribeToActivity = (callback: (event: ActivityEvent) => void) => {
  const setupSubscription = async () => {
    try {
      const initialized = await initializeSDS();
      
      if (!initialized || !sdsInstance) {
        console.warn('SDS not available - activity feed disabled');
        return () => {};
      }

      console.log('🔌 Starting SDS event polling...');

      // Get backend wallet address from env
      const backendPublisher = import.meta.env.VITE_BACKEND_PUBLISHER_ADDRESS;
      if (!backendPublisher) {
        console.error('VITE_BACKEND_PUBLISHER_ADDRESS not set in .env');
        return () => {};
      }

      // Compute schema ID for vidrune-events
      const eventSchema = 'string eventType,uint256 timestamp,string data';
      const schemaIdResult = await sdsInstance.streams.computeSchemaId(eventSchema);
      
      if (schemaIdResult instanceof Error) {
        throw schemaIdResult;
      }

      const schemaId = schemaIdResult;
      console.log('📋 Schema ID:', schemaId);

      const seenEvents = new Set<string>();

      // Poll for new events every 3 seconds
      const intervalId = setInterval(async () => {
        try {
          const allDataResult = await sdsInstance!.streams.getAllPublisherDataForSchema(
            schemaId,
            backendPublisher as `0x${string}`
          );

          if (allDataResult instanceof Error) {
            throw allDataResult;
          }

          const allData = Array.isArray(allDataResult) ? allDataResult : [];

          for (const dataItem of allData) {
            const fields = Array.isArray(dataItem) ? dataItem : [];
            let eventType = '';
            let timestamp = 0;
            let data = '';

            for (const field of fields) {
              const val = field.value?.value ?? field.value;
              if (field.name === 'eventType') eventType = String(val);
              if (field.name === 'timestamp') timestamp = Number(val);
              if (field.name === 'data') data = String(val);
            }

            const eventId = `${timestamp}-${eventType}`;
            if (!seenEvents.has(eventId)) {
              seenEvents.add(eventId);
              
              const event = parseSDSEvent({ eventType, timestamp, data });
              if (event) {
                console.log('📡 New SDS event:', event);
                callback(event);
              }
            }
          }
        } catch (error) {
          console.error('Error polling SDS events:', error);
        }
      }, 3000);

      console.log('✅ Subscribed to Vidrune activity feed (polling every 3s)');
      
      return () => {
        clearInterval(intervalId);
        console.log('Unsubscribed from activity feed');
      };
    } catch (error) {
      console.error('Failed to subscribe to activity feed:', error);
      return () => {};
    }
  };

  return setupSubscription();
};

/**
 * Subscribe to market-specific events
 * Note: Currently all events come through the same schema, filtered client-side
 */
export const subscribeToMarketOdds = (
  marketId: string,
  callback: (odds: MarketOdds) => void
) => {
  return subscribeToActivity((event) => {
    if (event.eventType === 'MARKET_VOTE') {
      const voteEvent = event as MarketVoteEvent;
      if (voteEvent.marketId === marketId) {
        const total = voteEvent.yesCount + voteEvent.noCount;
        const odds: MarketOdds = {
          marketId: voteEvent.marketId,
          yesCount: voteEvent.yesCount,
          noCount: voteEvent.noCount,
          yesPercentage: total > 0 ? (voteEvent.yesCount / total) * 100 : 50,
          noPercentage: total > 0 ? (voteEvent.noCount / total) * 100 : 50,
          timestamp: voteEvent.timestamp,
        };
        callback(odds);
      }
    }
  });
};

/**
 * Subscribe to video processing status updates
 */
export const subscribeToProcessing = (callback: (status: ProcessingStatus) => void) => {
  return subscribeToActivity((event) => {
    if (event.eventType === 'PROCESSING_UPDATE') {
      const processingEvent = event as ProcessingUpdateEvent;
      const status: ProcessingStatus = {
        videoId: processingEvent.videoId,
        stage: processingEvent.stage,
        progress: processingEvent.progress,
        timestamp: processingEvent.timestamp,
      };
      callback(status);
    }
  });
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format timestamp to relative time (e.g., "2s ago", "5m ago")
 */
export const formatRelativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

/**
 * Truncate Ethereum address for display
 */
export const truncateAddress = (address: string): string => {
  if (address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

/**
 * Get icon for event type
 */
export const getEventIcon = (eventType: EventType): string => {
  switch (eventType) {
    case 'VIDEO_INDEXED':
      return '🎬';
    case 'CONVICTION_SUBMITTED':
      return '⚔️';
    case 'MARKET_CREATED':
      return '📊';
    case 'MARKET_VOTE':
      return '🗳️';
    case 'MARKET_RESOLVED':
      return '🏆';
    case 'PROCESSING_UPDATE':
      return '⚙️';
    case 'POINTS_AWARDED':
      return '⭐';
    default:
      return '📡';
  }
};

/**
 * Get human-readable event description
 */
export const getEventDescription = (event: ActivityEvent): string => {
  switch (event.eventType) {
    case 'VIDEO_INDEXED':
      return `${truncateAddress(event.uploader)} indexed video #${event.videoId.slice(0, 8)}`;
    case 'CONVICTION_SUBMITTED':
      return `${truncateAddress(event.challenger)} challenged video #${event.videoId.slice(0, 8)}`;
    case 'MARKET_CREATED':
      return `New market: "${event.question.slice(0, 40)}..."`;
    case 'MARKET_VOTE':
      return `${truncateAddress(event.voter)} voted ${event.isYes ? 'YES' : 'NO'} on market #${event.marketId.slice(0, 8)}`;
    case 'MARKET_RESOLVED':
      return `Market #${event.marketId.slice(0, 8)} resolved: ${event.winningSide ? 'YES' : 'NO'} wins`;
    case 'PROCESSING_UPDATE':
      return `Video #${event.videoId.slice(0, 8)} - ${event.stage} (${event.progress}%)`;
    case 'POINTS_AWARDED':
      return `${truncateAddress(event.user)} earned ${event.amount} points - ${event.reason}`;
    default:
      return 'Unknown event';
  }
};

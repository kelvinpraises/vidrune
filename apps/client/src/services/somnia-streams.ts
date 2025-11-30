/**
 * Somnia Data Streams Integration
 *
 * Real-time event streaming for Vidrune platform using Somnia Data Streams (SDS).
 * Provides publish/subscribe functionality for platform events.
 *
 * NOTE: This is a simplified implementation for hackathon demo purposes.
 * For production, integrate with actual Somnia Data Streams SDK methods.
 */

// Uncomment for full SDS integration:
// import { SDK as SomniaDataStreams } from '@somnia-chain/streams';
// import { createPublicClient, webSocket } from 'viem';

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
// SDS Service Instance (Simplified for Demo)
// ============================================================================

// Event Bus for simplified real-time demo
type EventHandler = (event: ActivityEvent) => void;
const eventHandlers: Map<string, EventHandler[]> = new Map();

let isInitialized = false;

/**
 * Initialize Somnia Data Streams SDK
 *
 * For hackathon demo, we use an in-memory event bus.
 * For production, replace with actual SDS SDK initialization:
 *
 * const publicClient = createPublicClient({
 *   chain: { id: 50312, ... },
 *   transport: webSocket('wss://dream-rpc.somnia.network')
 * });
 * sdsInstance = new SomniaDataStreams({ public: publicClient });
 */
export const initializeSDS = async () => {
  if (isInitialized) {
    return true;
  }

  try {
    // For demo: Just mark as initialized
    isInitialized = true;
    console.log('Somnia Data Streams initialized (demo mode)');
    console.log('ℹ️ Using in-memory event bus for hackathon demo');
    console.log('ℹ️ For production, integrate with actual SDS SDK');
    return true;
  } catch (error) {
    console.error('Failed to initialize Somnia Data Streams:', error);
    throw error;
  }
};

// ============================================================================
// Publish Methods (Emit Events)
// ============================================================================

/**
 * Emit a video indexed event
 */
export const emitVideoIndexed = async (videoId: string, uploader: string) => {
  try {
    await initializeSDS();

    const event: VideoIndexedEvent = {
      eventType: 'VIDEO_INDEXED',
      videoId,
      uploader,
      timestamp: Date.now(),
    };

    // Emit to all subscribers on the activity channel
    emitToChannel('vidrune:activity', event);
    console.log('Video indexed event emitted:', event);
  } catch (error) {
    console.error('Failed to emit video indexed event:', error);
  }
};

/**
 * Emit a conviction submitted event
 */
export const emitConvictionSubmitted = async (
  videoId: string,
  convictionId: string,
  challenger: string
) => {
  try {
    await initializeSDS();

    const event: ConvictionSubmittedEvent = {
      eventType: 'CONVICTION_SUBMITTED',
      videoId,
      convictionId,
      challenger,
      timestamp: Date.now(),
    };

    emitToChannel('vidrune:activity', event);
    console.log('Conviction submitted event emitted:', event);
  } catch (error) {
    console.error('Failed to emit conviction submitted event:', error);
  }
};

/**
 * Emit a market created event
 */
export const emitMarketCreated = async (
  marketId: string,
  videoId: string,
  question: string
) => {
  try {
    await initializeSDS();

    const event: MarketCreatedEvent = {
      eventType: 'MARKET_CREATED',
      marketId,
      videoId,
      question,
      timestamp: Date.now(),
    };

    emitToChannel('vidrune:activity', event);
    console.log('Market created event emitted:', event);
  } catch (error) {
    console.error('Failed to emit market created event:', error);
  }
};

/**
 * Emit a market vote event
 */
export const emitMarketVote = async (
  marketId: string,
  isYes: boolean,
  voter: string,
  yesCount: number,
  noCount: number
) => {
  try {
    await initializeSDS();

    const event: MarketVoteEvent = {
      eventType: 'MARKET_VOTE',
      marketId,
      isYes,
      voter,
      yesCount,
      noCount,
      timestamp: Date.now(),
    };

    // Publish to both activity feed and market-specific channel
    emitToChannel('vidrune:activity', event);
    emitToChannel(`vidrune:market:${marketId}`, event);

    console.log('Market vote event emitted:', event);
  } catch (error) {
    console.error('Failed to emit market vote event:', error);
  }
};

/**
 * Emit a market resolved event
 */
export const emitMarketResolved = async (marketId: string, winningSide: boolean) => {
  try {
    await initializeSDS();

    const event: MarketResolvedEvent = {
      eventType: 'MARKET_RESOLVED',
      marketId,
      winningSide,
      timestamp: Date.now(),
    };

    emitToChannel('vidrune:activity', event);
    console.log('Market resolved event emitted:', event);
  } catch (error) {
    console.error('Failed to emit market resolved event:', error);
  }
};

/**
 * Emit a processing update event
 */
export const emitProcessingUpdate = async (
  videoId: string,
  stage: string,
  progress: number
) => {
  try {
    await initializeSDS();

    const event: ProcessingUpdateEvent = {
      eventType: 'PROCESSING_UPDATE',
      videoId,
      stage,
      progress,
      timestamp: Date.now(),
    };

    emitToChannel('vidrune:processing', event);
    console.log('Processing update event emitted:', event);
  } catch (error) {
    console.error('Failed to emit processing update event:', error);
  }
};

/**
 * Emit a points awarded event
 */
export const emitPointsAwarded = async (
  user: string,
  amount: number,
  reason: string,
  newTotal: number
) => {
  try {
    await initializeSDS();

    const event: PointsAwardedEvent = {
      eventType: 'POINTS_AWARDED',
      user,
      amount,
      reason,
      newTotal,
      timestamp: Date.now(),
    };

    emitToChannel('vidrune:activity', event);
    console.log('Points awarded event emitted:', event);
  } catch (error) {
    console.error('Failed to emit points awarded event:', error);
  }
};

// ============================================================================
// Internal Event Bus (Demo Implementation)
// ============================================================================

/**
 * Emit event to channel (in-memory for demo)
 */
const emitToChannel = (channel: string, event: ActivityEvent | MarketVoteEvent | ProcessingUpdateEvent) => {
  const handlers = eventHandlers.get(channel) || [];
  handlers.forEach(handler => {
    try {
      handler(event as ActivityEvent);
    } catch (error) {
      console.error(`Error in event handler for channel ${channel}:`, error);
    }
  });
};

/**
 * Subscribe to channel
 */
const subscribeToChannel = (channel: string, callback: EventHandler) => {
  const handlers = eventHandlers.get(channel) || [];
  handlers.push(callback);
  eventHandlers.set(channel, handlers);

  console.log(`Subscribed to channel: ${channel}`);

  // Return unsubscribe function
  return () => {
    const currentHandlers = eventHandlers.get(channel) || [];
    const index = currentHandlers.indexOf(callback);
    if (index > -1) {
      currentHandlers.splice(index, 1);
      eventHandlers.set(channel, currentHandlers);
      console.log(`Unsubscribed from channel: ${channel}`);
    }
  };
};

// ============================================================================
// Subscribe Methods (Listen for Events)
// ============================================================================

/**
 * Subscribe to all platform activity events
 */
export const subscribeToActivity = (callback: (event: ActivityEvent) => void) => {
  const setupSubscription = async () => {
    try {
      await initializeSDS();
      return subscribeToChannel('vidrune:activity', callback);
    } catch (error) {
      console.error('Failed to subscribe to activity feed:', error);
      return () => {};
    }
  };

  return setupSubscription();
};

/**
 * Subscribe to market-specific vote events for live odds updates
 */
export const subscribeToMarketOdds = (
  marketId: string,
  callback: (odds: MarketOdds) => void
) => {
  const setupSubscription = async () => {
    try {
      await initializeSDS();

      return subscribeToChannel(`vidrune:market:${marketId}`, (data: ActivityEvent) => {
        if (data.eventType === 'MARKET_VOTE') {
          const voteEvent = data as MarketVoteEvent;
          const total = voteEvent.yesCount + voteEvent.noCount;
          const odds: MarketOdds = {
            marketId: voteEvent.marketId,
            yesCount: voteEvent.yesCount,
            noCount: voteEvent.noCount,
            yesPercentage: total > 0 ? (voteEvent.yesCount / total) * 100 : 50,
            noPercentage: total > 0 ? (voteEvent.noCount / total) * 100 : 50,
            timestamp: voteEvent.timestamp,
          };

          console.log('Market odds updated:', odds);
          callback(odds);
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to market odds:', error);
      return () => {};
    }
  };

  return setupSubscription();
};

/**
 * Subscribe to video processing status updates
 */
export const subscribeToProcessing = (callback: (status: ProcessingStatus) => void) => {
  const setupSubscription = async () => {
    try {
      await initializeSDS();

      return subscribeToChannel('vidrune:processing', (data: ActivityEvent) => {
        if (data.eventType === 'PROCESSING_UPDATE') {
          const processingEvent = data as ProcessingUpdateEvent;
          const status: ProcessingStatus = {
            videoId: processingEvent.videoId,
            stage: processingEvent.stage,
            progress: processingEvent.progress,
            timestamp: processingEvent.timestamp,
          };

          console.log('Processing status updated:', status);
          callback(status);
        }
      });
    } catch (error) {
      console.error('Failed to subscribe to processing updates:', error);
      return () => {};
    }
  };

  return setupSubscription();
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

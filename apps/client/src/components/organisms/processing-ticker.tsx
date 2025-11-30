/**
 * Processing Ticker Component
 *
 * Real-time ticker showing videos currently being processed.
 * Updates live via Somnia Data Streams.
 */

import { useEffect, useState } from 'react';
import { Card } from '@/components/atoms/card';
import { subscribeToProcessing, type ProcessingStatus } from '@/services/somnia-streams';

const MAX_PROCESSING_ITEMS = 5;

export function ProcessingTicker() {
  const [processingVideos, setProcessingVideos] = useState<ProcessingStatus[]>([]);

  // Subscribe to processing updates
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        const unsub = await subscribeToProcessing((status: ProcessingStatus) => {
          setProcessingVideos((prev) => {
            // Update existing or add new
            const index = prev.findIndex((v) => v.videoId === status.videoId);

            if (index >= 0) {
              // Update existing
              const updated = [...prev];
              updated[index] = status;
              return updated;
            } else {
              // Add new (keep max 5)
              return [status, ...prev].slice(0, MAX_PROCESSING_ITEMS);
            }
          });

          // Remove completed videos (100% progress) after 5 seconds
          if (status.progress >= 100) {
            setTimeout(() => {
              setProcessingVideos((prev) => prev.filter((v) => v.videoId !== status.videoId));
            }, 5000);
          }
        });

        unsubscribe = unsub;
      } catch (error) {
        console.error('Failed to subscribe to processing updates:', error);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  if (processingVideos.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-card text-card-foreground">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        <h3 className="font-outfit font-semibold text-sm text-foreground">
          Processing Videos
        </h3>
      </div>

      <div className="space-y-2">
        {processingVideos.map((video) => (
          <div
            key={video.videoId}
            className="flex items-center gap-3 p-2 rounded-lg bg-muted/30 border border-border/40"
          >
            <div className="flex-shrink-0 text-lg">⚙️</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-foreground truncate">
                  Video #{video.videoId.slice(0, 8)}...
                </p>
                <p className="text-xs text-muted-foreground ml-2">{video.progress}%</p>
              </div>
              <p className="text-xs text-muted-foreground capitalize">{video.stage}</p>
              {/* Progress bar */}
              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${video.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

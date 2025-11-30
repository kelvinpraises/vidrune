/**
 * Global Activity Feed Component
 *
 * Real-time feed of all platform events using Somnia Data Streams.
 * Displays the last 50 activities with auto-scroll and live updates.
 */

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import {
  subscribeToActivity,
  formatRelativeTime,
  getEventIcon,
  getEventDescription,
  type ActivityEvent,
} from '@/services/somnia-streams';

const MAX_ACTIVITIES = 50;

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [isLive, setIsLive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Subscribe to activity stream
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupSubscription = async () => {
      try {
        const unsub = await subscribeToActivity((event: ActivityEvent) => {
          setActivities((prev) => {
            const newActivities = [event, ...prev].slice(0, MAX_ACTIVITIES);
            return newActivities;
          });

          // Auto-scroll to top when new event arrives (if enabled)
          if (autoScroll && containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });

        unsubscribe = unsub;
        setIsLive(true);
      } catch (error) {
        console.error('Failed to setup activity subscription:', error);
        setIsLive(false);
      }
    };

    setupSubscription();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [autoScroll]);

  // Update relative timestamps every 10 seconds
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <span className="text-xl font-semibold">Live Activity</span>
            {isLive && (
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-xs text-red-500 font-medium uppercase tracking-wide">
                  Live
                </span>
              </div>
            )}
          </CardTitle>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              autoScroll
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {autoScroll ? 'Auto-scroll ON' : 'Auto-scroll OFF'}
          </button>
        </div>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">📡</div>
            <p className="text-sm">Waiting for activity...</p>
            <p className="text-xs mt-1">Events will appear here in real-time</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="space-y-2 max-h-96 overflow-y-auto pr-2"
            style={{ scrollbarWidth: 'thin' }}
          >
            {activities.map((activity, index) => (
              <div
                key={`${activity.timestamp}-${index}`}
                className="flex items-start gap-3 p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors"
              >
                {/* Event Icon */}
                <div className="text-2xl flex-shrink-0 mt-0.5">
                  {getEventIcon(activity.eventType)}
                </div>

                {/* Event Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground break-words">
                    {getEventDescription(activity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(activity.timestamp)}
                  </p>
                </div>

                {/* New badge for recent events (< 5 seconds old) */}
                {Date.now() - activity.timestamp < 5000 && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                      New
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activities.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 text-center text-xs text-muted-foreground">
            Showing {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            {activities.length >= MAX_ACTIVITIES && ` (max ${MAX_ACTIVITIES})`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

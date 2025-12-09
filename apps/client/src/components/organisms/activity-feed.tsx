/**
 * TODO: Implement real-time updates using alternative solution
 */

import { useRef, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";

const MAX_ACTIVITIES = 50;

interface ActivityEvent {
  eventType: string;
  timestamp: number;
  data?: any;
}

function getEventIcon(eventType: string): string {
  const icons: Record<string, string> = {
    video_uploaded: "🎥",
    market_created: "📊",
    bet_placed: "🎲",
    market_resolved: "✅",
    default: "📡",
  };
  return icons[eventType] || icons.default;
}

function getEventDescription(activity: ActivityEvent): string {
  return `${activity.eventType} event occurred`;
}

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed() {
  const [activities] = useState<ActivityEvent[]>([]);
  const [isLive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

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
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
            }`}
          >
            {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
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
            style={{ scrollbarWidth: "thin" }}
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
            Showing {activities.length}{" "}
            {activities.length === 1 ? "activity" : "activities"}
            {activities.length >= MAX_ACTIVITIES && ` (max ${MAX_ACTIVITIES})`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

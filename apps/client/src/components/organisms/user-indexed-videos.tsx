import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Info,
} from "lucide-react";

import { Button } from "@/components/atoms/button";
import useStore from "@/store";
import { type IndexedVideo } from "@/store/index-store-slice";
import { cn } from "@/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/atoms/tooltip";

const statusIcons = {
  pending: <Clock className="h-5 w-5 text-yellow-500" />,
  completed: <CheckCircle className="h-5 w-5 text-green-500" />,
  failed: <AlertTriangle className="h-5 w-5 text-red-500" />,
  reassignable: <Clock className="h-5 w-5 text-blue-500" />,
};

const statusText = {
  pending: "Processing",
  completed: "Completed",
  failed: "Failed",
  reassignable: "Reassignable",
};

interface VideoCardProps {
  video: IndexedVideo;
  onRemove: (videoCID: string) => void;
}

const VideoCard = ({ video, onRemove }: VideoCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      onRemove(video.videoCID);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "Unknown";
    return formatDistanceToNow(timestamp * 1000, { addSuffix: true });
  };

  const displayName =
    video.title || video.fileName || video.videoCID.substring(0, 16) + "...";
  const requestTime = formatTimestamp(video.requestTimestamp);
  const lastCheckedTime = video.lastChecked
    ? formatDistanceToNow(video.lastChecked, { addSuffix: true })
    : "Never";

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start p-4 mt-4 w-full mx-auto rounded-md",
        "shadow-sm border border-neutral-200 dark:border-neutral-800",
        video.status === "completed" && "border-l-4 border-l-green-500",
        video.status === "pending" && "border-l-4 border-l-yellow-500",
        video.status === "failed" && "border-l-4 border-l-red-500",
        video.status === "reassignable" && "border-l-4 border-l-blue-500"
      )}
    >
      <div className="flex justify-between w-full items-center gap-4">
        <div className="flex items-center gap-2">
          {statusIcons[video.status]}
          <motion.p
            layout
            className="text-base font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-xs"
          >
            {displayName}
          </motion.p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            {statusText[video.status]}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="p-1"
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {video.description && !expanded && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 line-clamp-1">
          {video.description}
        </p>
      )}

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="w-full mt-4 space-y-2"
        >
          {video.title && (
            <div className="mb-2">
              <h3 className="font-medium text-neutral-800 dark:text-neutral-200">
                {video.title}
              </h3>
              {video.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {video.description}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-neutral-500 dark:text-neutral-400">Video CID:</div>
            <div className="text-neutral-700 dark:text-neutral-300 truncate">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help">{video.videoCID}</span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs break-all">{video.videoCID}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {video.indexCID && (
              <>
                <div className="text-neutral-500 dark:text-neutral-400">Index CID:</div>
                <div className="text-neutral-700 dark:text-neutral-300 truncate">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help">{video.indexCID}</span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs break-all">{video.indexCID}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </>
            )}

            <div className="text-neutral-500 dark:text-neutral-400">Node Address:</div>
            <div className="text-neutral-700 dark:text-neutral-300 truncate">
              {video.nodeAddress ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help">{video.nodeAddress}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs break-all">{video.nodeAddress}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                "Not assigned"
              )}
            </div>

            <div className="text-neutral-500 dark:text-neutral-400">Requested:</div>
            <div className="text-neutral-700 dark:text-neutral-300">{requestTime}</div>

            <div className="text-neutral-500 dark:text-neutral-400">Last Checked:</div>
            <div className="text-neutral-700 dark:text-neutral-300">{lastCheckedTime}</div>

            {video.fileSize && (
              <>
                <div className="text-neutral-500 dark:text-neutral-400">File Size:</div>
                <div className="text-neutral-700 dark:text-neutral-300">
                  {(video.fileSize / (1024 * 1024)).toFixed(2)} MB
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-2 mt-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export const UserIndexedVideos = () => {
  const { getAllVideos, removeVideo } = useStore();
  const videos = getAllVideos();

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => {
      // First by status priority
      const statusPriority = {
        pending: 1,
        reassignable: 2,
        failed: 3,
        completed: 4,
      };

      const statusDiff = statusPriority[a.status] - statusPriority[b.status];
      if (statusDiff !== 0) return statusDiff;

      // Then by timestamp (newest first)
      const aTime = a.requestTimestamp || 0;
      const bTime = b.requestTimestamp || 0;
      return bTime - aTime;
    });
  }, [videos]);

  const handleRemove = (videoCID: string) => {
    removeVideo(videoCID);
  };

  if (videos.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-lg">
        <div className="flex flex-col items-center justify-center gap-2">
          <Info className="h-12 w-12 text-neutral-400" />
          <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
            No indexed videos found
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Upload and index a video to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
          Your Indexed Videos
        </h2>
        <div className="text-sm text-neutral-500 dark:text-neutral-400">
          {videos.length} videos indexed
        </div>
      </div>

      <div className="space-y-2">
        {sortedVideos.map((video: IndexedVideo) => (
          <VideoCard key={video.videoCID} video={video} onRemove={handleRemove} />
        ))}
      </div>
    </div>
  );
};

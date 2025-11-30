import { motion } from "framer-motion";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import { CheckCircle, AlertTriangle, Info, Trash2 } from "lucide-react";

import { Button } from "@/components/atoms/button";
import useStore, { type UserIndexedVideo } from "@/store";
import { cn } from "@/utils";

const statusConfig = {
  pending: { icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />, text: "Pending" },
  indexed: { icon: <CheckCircle className="h-5 w-5 text-green-500" />, text: "Indexed" },
  challenged: { icon: <AlertTriangle className="h-5 w-5 text-red-500" />, text: "Challenged" },
};

interface VideoCardProps {
  video: UserIndexedVideo;
  onRemove: (blobId: string) => void;
}

const VideoCard = ({ video, onRemove }: VideoCardProps) => {
  const config = statusConfig[video.status];

  return (
    <motion.div
      layout
      className={cn(
        "relative overflow-hidden bg-white dark:bg-neutral-900 flex items-center justify-between p-4 w-full rounded-md",
        "shadow-sm border border-neutral-200 dark:border-neutral-800",
        video.status === "indexed" && "border-l-4 border-l-green-500",
        video.status === "pending" && "border-l-4 border-l-yellow-500",
        video.status === "challenged" && "border-l-4 border-l-red-500"
      )}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {config.icon}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">
            {video.title}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {video.description}
          </p>
          <div className="flex gap-4 text-xs text-neutral-400 mt-1">
            <span>{formatDistanceToNow(video.uploadedAt, { addSuffix: true })}</span>
            {video.fileSize && (
              <span>{(video.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
            )}
            {video.scenesCount && <span>{video.scenesCount} scenes</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-neutral-500 px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded">
          {config.text}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(video.blobId)}
          className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export const UserIndexedVideos = () => {
  const { getUserVideos, removeUserVideo } = useStore();
  const videos = getUserVideos();

  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => b.uploadedAt - a.uploadedAt);
  }, [videos]);

  if (videos.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-lg">
        <div className="flex flex-col items-center justify-center gap-2">
          <Info className="h-12 w-12 text-neutral-400" />
          <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300">
            No indexed videos yet
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Upload and index a video to see it here.
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
        <span className="text-sm text-neutral-500">{videos.length} videos</span>
      </div>

      <div className="space-y-2">
        {sortedVideos.map((video) => (
          <VideoCard key={video.blobId} video={video} onRemove={removeUserVideo} />
        ))}
      </div>
    </div>
  );
};

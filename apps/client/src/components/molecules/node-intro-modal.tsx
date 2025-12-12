import { Brain, Eye, Film, Package, Upload, Video, Volume2, Zap } from "lucide-react";
import { useEffect, useState } from "react";

import { IntroModal } from "./intro-modal";

const STORAGE_KEY = "vidrune_node_intro_dismissed";

export function NodeIntroModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setIsOpen(false);
  };

  const steps = [
    {
      title: "Welcome to Node Operations",
      content: (
        <div className="space-y-4">
          <p className="text-base text-muted-foreground leading-relaxed">
            Run a node to index videos and earn ROHR points. All processing happens locally
            in your browser using WebGPU.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Film className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">VISE Scene Extraction</h5>
                <p className="text-sm text-muted-foreground">
                  Analyzes video frame-by-frame to detect scene changes and extract key
                  moments.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Eye className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Florence2 Vision AI</h5>
                <p className="text-sm text-muted-foreground">
                  Generates detailed captions describing what's happening in each scene.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Kokoro Audio Synthesis</h5>
                <p className="text-sm text-muted-foreground">
                  Converts captions into natural-sounding audio descriptions for
                  accessibility.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Package & Submit</h5>
                <p className="text-sm text-muted-foreground">
                  Packages scenes, captions, and audio into a ZIP for decentralized storage on Walrus.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "How to Participate",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Follow these steps to start indexing videos and earning rewards.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Connect Wallet & Upload Video</p>
                <p className="text-sm text-muted-foreground">
                  Connect your wallet to join the node pool, then upload a video with title
                  and description.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Download AI Models (First Time)</p>
                <p className="text-sm text-muted-foreground">
                  Models download automatically (~700MB total) and are cached locally for
                  future use.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Process Video Locally</p>
                <p className="text-sm text-muted-foreground">
                  Click "Start Processing" and monitor progress through VISE, Florence2, and
                  Kokoro stages.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                4
              </div>
              <div>
                <p className="text-sm font-medium">Review & Submit Index</p>
                <p className="text-sm text-muted-foreground">
                  Review generated scenes and captions, then click "Index Video" to submit
                  and earn ROHR.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },

    {
      title: "Pro Tips & Best Practices",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Start Small</h5>
                <p className="text-sm text-muted-foreground">
                  Begin with shorter videos (under 2 minutes) for faster processing and to
                  familiarize yourself with the workflow.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">
                  Stable Connection for Downloads
                </h5>
                <p className="text-sm text-muted-foreground">
                  Model downloads are ~700MB total. Ensure a stable connection. If stuck,
                  refresh the page as downloads resume automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Brain className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">GPU Matters</h5>
                <p className="text-sm text-muted-foreground">
                  Processing speed depends on your GPU. Models are cached in IndexedDB and
                  persist across sessions.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Quality Content</h5>
                <p className="text-sm text-muted-foreground">
                  Index videos with clear visuals and meaningful content. Quality indexes
                  are more valuable to the network.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <IntroModal
      isOpen={isOpen}
      onClose={handleClose}
      steps={steps}
      modalTitle="Node Console Guide"
    />
  );
}

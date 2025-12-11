import { useState, useEffect } from "react";
import { Lightbulb, Search, TrendingUp, Zap, BarChart3, Target, Video } from "lucide-react";
import { IntroModal } from "./intro-modal";

const STORAGE_KEY = "vidrune_home_intro_dismissed";

export function HomeIntroModal() {
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
      title: "Welcome to Vidrune",
      content: (
        <div className="space-y-4">
          <p className="text-base text-muted-foreground leading-relaxed">
            Vidrune is a decentralized video intelligence platform that transforms videos
            into searchable, analyzable insights using AI-powered indexing.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Search className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Semantic Search</h5>
                <p className="text-sm text-muted-foreground">
                  Find videos by content, not just titles. Search through scene descriptions
                  and captions.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">AI-Powered Analysis</h5>
                <p className="text-sm text-muted-foreground">
                  Automatic scene detection, captioning, and audio generation using
                  Florence2 and Kokoro models.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Prediction Markets</h5>
                <p className="text-sm text-muted-foreground">
                  Create and participate in polls about video content and trends.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Earn Rewards</h5>
                <p className="text-sm text-muted-foreground">
                  Index videos and earn points that can be converted to ROHR tokens.
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
            Multiple ways to contribute and earn rewards in the network.
          </p>

          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="text-sm font-medium">Browse Indexed Videos</p>
                <p className="text-sm text-muted-foreground">
                  Explore the dataset to find videos with indexing errors or incomplete tags.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="text-sm font-medium">Submit Convictions</p>
                <p className="text-sm text-muted-foreground">
                  Challenge incorrect indexes with evidence. Your conviction creates a prediction
                  market.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="text-sm font-medium">Trade Prediction Markets</p>
                <p className="text-sm text-muted-foreground">
                  Buy YES/NO shares on conviction led markets based on whether you think the challenge
                  is valid.
                </p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                4
              </div>
              <div>
                <p className="text-sm font-medium">Earn from Accuracy</p>
                <p className="text-sm text-muted-foreground">
                  Correct convictions and winning predictions earn you ROHR tokens and reputation.
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
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Provide Strong Evidence</h5>
                <p className="text-sm text-muted-foreground">
                  Submit convictions with clear Facts and Proofs. Include timestamps, transcript
                  analysis, and specific examples.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Build Your Track Record</h5>
                <p className="text-sm text-muted-foreground">
                  Start with smaller markets to build reputation. Consistent accuracy increases
                  your credibility.
                </p>
              </div>
            </div>

            <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <h5 className="font-semibold text-sm mb-1">Watch for Grouping</h5>
                <p className="text-sm text-muted-foreground">
                  TEE agents group similar convictions into markets. Check if others spotted the
                  same issue.
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
      modalTitle="Welcome to Vidrune"
    />
  );
}

import { Timer } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import type { PredictionMarket } from "@/types/prediction-market";
import { isValidUrl } from "@/utils";

interface PredictionMarketCardProps {
  market: PredictionMarket;
}

export function PredictionMarketCard({ market }: PredictionMarketCardProps) {
  return (
    <a href={`/markets/${market.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="relative">
            <img
              src={
                isValidUrl(market.thumbnailUrl ?? "")
                  ? market.thumbnailUrl
                  : `https://avatar.vercel.sh/${market.id}${market.question}`
              }
              alt={market.videoTitle}
              className="w-16 h-16 rounded-full object-cover"
            />
          </div>
          <CardTitle className="text-lg font-medium">
            {market.question}
          </CardTitle>

          <div className="flex gap-2 mb-2">
            <span
              className={`px-3 py-1 rounded-full text-xs ${
                market.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {market.status}
            </span>
          </div>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Timer className="w-4 h-4" />
              <span>
                Ends {new Date(market.endDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-green-600">
                {market.totalStaked} ROHR
              </span>
              <span>pool</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

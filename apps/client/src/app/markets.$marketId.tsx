import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";

import { Separator } from "@/components/atoms/separator";
import { Skeleton } from "@/components/atoms/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { AppHeader } from "@/components/molecules/app-header";
import { RadialChart } from "@/components/organisms/radial-chart";
import { YesNoChart } from "@/components/organisms/yes-no-chart";
import { usePredictionMarkets } from "@/hooks/use-prediction-markets";
import { useVoteYes, useVoteNo, PREDICTION_MARKET_ADDRESS } from "@/services/contracts";
import { predictionMarketAbi } from "@/contracts/generated";
import { ellipsisAddress, isValidUrl } from "@/utils";
import { useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { readContract } from "wagmi/actions";
import { config } from "@/providers/wagmi/config";

// Activity type enum from contract
enum ActivityType {
  MarketCreated = 0,
  VoteCast = 1,
  MarketClosed = 2,
  MarketResolved = 3,
}

interface ContractActivity {
  activityType: number;
  user: string;
  marketId: string;
  isYes: boolean;
  timestamp: bigint;
}

function MarketTradingPage() {
  const { marketId } = useParams({ from: "/markets/$marketId" });
  const { markets, isLoading: originalLoading } = usePredictionMarkets();
  const market = markets.find((m) => m.id === marketId);

  const { voteYes, isPending: isVotingYes } = useVoteYes();
  const { voteNo, isPending: isVotingNo } = useVoteNo();

  const [isStaking, setIsStaking] = useState(false);

  // Activities from contract
  const [activities, setActivities] = useState<
    Array<{
      id: string;
      user: string;
      action: string;
      choice: "Yes" | "No";
      amount: number;
      timestamp: number;
      avatar: string;
    }>
  >([]);

  // Fetch activities from contract
  useEffect(() => {
    if (!marketId) return;

    const fetchActivities = async () => {
      try {
        const contractActivities = (await readContract(config, {
          address: PREDICTION_MARKET_ADDRESS,
          abi: predictionMarketAbi,
          functionName: "getMarketActivities",
          args: [marketId],
        })) as ContractActivity[];

        // Transform contract activities to display format
        const transformed = contractActivities
          .filter((a) => a.activityType === ActivityType.VoteCast)
          .map((a, idx) => ({
            id: `${a.marketId}-${idx}`,
            user: a.user,
            action: "voted",
            choice: (a.isYes ? "Yes" : "No") as "Yes" | "No",
            amount: 1, // Each vote is 1
            timestamp: Number(a.timestamp) * 1000,
            avatar: `https://avatar.vercel.sh/${a.user}`,
          }))
          .reverse(); // Most recent first

        setActivities(transformed);
      } catch (error) {
        console.error("Failed to fetch activities:", error);
      }
    };

    fetchActivities();
  }, [marketId]); // Refetch when marketId changes
    };
  }, [marketId]);

  if (originalLoading) {
    return (
      <>
        {/* Header */}
        <AppHeader currentPage="markets" showConnectWallet />

        <div className="w-full flex-1 space-y-4 p-6 mt-20">
          <div className="flex md:gap-6 flex-col md:flex-row">
            {/* LEFT SIDE: Market Info Skeleton */}
            <div className="flex flex-col md:w-2/5 gap-6">
              <div className="flex gap-2">
                <Skeleton className="w-12 h-12 rounded-full" />
                <Skeleton className="h-12 flex-1" />
              </div>
              <Skeleton className="h-20 w-full" />
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
              <Skeleton className="h-32 w-full" />
            </div>

            {/* RIGHT SIDE: Trading Interface Skeleton */}
            <div className="md:w-3/5 space-y-6">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-48 w-full" />
              <div className="flex gap-8">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 flex-1" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!market) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 mt-32">
        Market does not exist yet
      </div>
    );
  }

  const handleStake = async (isYes: boolean) => {
    if (!marketId) return;

    setIsStaking(true);
    try {
      if (isYes) {
        await voteYes(marketId);
      } else {
        await voteNo(marketId);
      }

      toast.success(`Successfully voted ${isYes ? "YES" : "NO"}`);
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to vote. Please try again.");
    } finally {
      setIsStaking(false);
    }
  };

  // Use real market data for chart - start from creation with 0, then current state
  const yesPercent = market.yesPercentage;
  const noPercent = market.noPercentage;

  // Create time series with start point (0,0) and current state
  const createdDate = new Date(market.createdAt);
  const now = new Date();

  const timeSeriesData = [
    {
      date: createdDate.toISOString(),
      yes: 0,
      no: 0,
    },
    {
      date: now.toISOString(),
      yes: yesPercent,
      no: noPercent,
    },
  ];

  // Use actual market vote counts
  const yesVotes = market.yesVotes ?? 0;
  const noVotes = market.noVotes ?? 0;

  // Check if market is expired (voting period ended)
  const expiryTime = market.expiresAt ?? market.endDate;
  const isExpired = expiryTime ? new Date() >= new Date(expiryTime) : false;
  const isResolved = market.status === "resolved";

  const radialData = [
    {
      type: "vote",
      yes: yesVotes,
      no: noVotes,
    },
  ];

  // Activities are now fetched from contract via useEffect above

  return (
    <>
      {/* Header */}
      <AppHeader currentPage="markets" showConnectWallet />

      <div className="w-full flex-1 space-y-4 p-6 mt-20">
        <div className="flex md:gap-6 flex-col md:flex-row">
          {/* LEFT SIDE: Market Info */}
          <div className="flex flex-col md:w-2/5 gap-6">
            {/* Avatar + Question */}
            <div className="flex gap-2">
              <img
                src={
                  isValidUrl(market.thumbnailUrl ?? "")
                    ? market.thumbnailUrl
                    : `https://avatar.vercel.sh/${market.id}${market.question}`
                }
                alt={market.videoTitle}
                className="w-12 h-12 rounded-full object-cover"
              />
              <h2 className="text-3xl font-bold tracking-tight">{market.question}</h2>
            </div>

            {/* Description */}
            <p className="text-gray-800 dark:text-gray-200">{market.videoTitle}</p>

            {/* Market stats card */}
            <Card className="flex">
              <div className="w-1/2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Market ID</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{ellipsisAddress(market.id)}</div>
                  <p className="text-xs text-muted-foreground">
                    Created{" "}
                    {formatDistanceToNow(market.createdAt, {
                      addSuffix: true,
                    })}
                  </p>
                </CardContent>
              </div>

              <div className="w-1 flex items-center">
                <Separator orientation="vertical" className="h-3/4" />
              </div>

              <div className="w-1/2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-2xl font-bold">
                    {yesVotes + noVotes}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {yesVotes} Yes • {noVotes} No
                  </p>
                </CardContent>
              </div>
            </Card>

            {/* Conviction Evidence - Accordion */}
            <div>
              <h3 className="text-lg font-semibold">Conviction Evidence:</h3>
              <Accordion type="single" collapsible className="w-full">
                {market.convictions.map((conviction, idx) => (
                  <AccordionItem key={conviction.id} value={`item-${idx}`}>
                    <AccordionTrigger>
                      <div className="text-left">
                        <p className="font-medium">{conviction.fact}</p>
                        <p className="text-xs text-gray-500">
                          By {ellipsisAddress(conviction.submittedBy)} •{" "}
                          {conviction.stakeAmount} ROHR
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 pt-2">
                        <p className="text-sm font-medium">Proofs:</p>
                        {conviction.proofs.map((proof, i) => (
                          <p key={i} className="text-sm text-gray-600 dark:text-gray-400">
                            • {proof}
                          </p>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>

          <div className="w-1 hidden md:block">
            <Separator orientation="vertical" className="" />
          </div>

          {/* RIGHT SIDE: Trading Interface */}
          <Tabs defaultValue="market" className="space-y-4 md:w-3/5 pt-6 md:pt-0">
            <div className="flex border-b">
              <TabsList className="bg-white dark:bg-transparent">
                <TabsTrigger
                  value="market"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-green-300 rounded-none data-[state=active]:shadow-none text-lg"
                >
                  Market
                </TabsTrigger>
                <TabsTrigger
                  value="activities"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-green-300 rounded-none data-[state=active]:shadow-none text-lg"
                >
                  Activities
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="market" className="space-y-10">
              <YesNoChart data={timeSeriesData} />

              {/* Show different UI based on market state */}
              {!isExpired && !isResolved ? (
                <>
                  {/* Voting period - show vote buttons */}
                  <div className="flex gap-5 pt-5">
                    <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <span className="font-medium">Test Mode:</span> Simply click YES or
                        NO to cast your vote. No staking required during testing.
                      </p>
                    </div>
                    <RadialChart data={radialData} />
                  </div>
                  <div className="flex gap-8">
                    <Button
                      className="flex-1 h-12 bg-green-500 hover:bg-green-400"
                      onClick={() => handleStake(true)}
                      disabled={isStaking || isVotingYes || isVotingNo}
                    >
                      {isVotingYes ? "Voting..." : "Vote YES"}
                    </Button>
                    <Button
                      className="flex-1 h-12 bg-red-500 hover:bg-red-400"
                      onClick={() => handleStake(false)}
                      disabled={isStaking || isVotingYes || isVotingNo}
                    >
                      {isVotingNo ? "Voting..." : "Vote NO"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Resolution period - show results */}
                  <div className="flex gap-5 pt-5">
                    <div className="flex-1 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <span className="font-medium">
                          {isResolved ? "Market Resolved" : "Voting Ended"}
                        </span>
                        {isResolved
                          ? ` — Winner: ${yesVotes >= noVotes ? "YES" : "NO"}`
                          : " — Awaiting resolution"}
                      </p>
                    </div>
                    <RadialChart data={radialData} />
                  </div>
                  <div className="flex gap-8">
                    <div
                      className={`flex-1 h-12 rounded-md flex items-center justify-center font-medium ${
                        yesVotes >= noVotes
                          ? "bg-green-500/20 border-2 border-green-500 text-green-600"
                          : "bg-green-500/10 text-green-600/50"
                      }`}
                    >
                      YES: {yesVotes} votes ({yesPercent}%)
                    </div>
                    <div
                      className={`flex-1 h-12 rounded-md flex items-center justify-center font-medium ${
                        noVotes > yesVotes
                          ? "bg-red-500/20 border-2 border-red-500 text-red-600"
                          : "bg-red-500/10 text-red-600/50"
                      }`}
                    >
                      NO: {noVotes} votes ({noPercent}%)
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <div className="space-y-8">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No activity yet</p>
                    <p className="text-sm">Be the first to vote on this market!</p>
                  </div>
                ) : (
                  activities.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 justify-between">
                      <img src={item.avatar} alt="" className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{ellipsisAddress(item.user)}</span>{" "}
                          {item.action}{" "}
                          <span
                            className={
                              item.choice === "Yes" ? "text-green-600" : "text-red-600"
                            }
                          >
                            {item.choice}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default MarketTradingPage;

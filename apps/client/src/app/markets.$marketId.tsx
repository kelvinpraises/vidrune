import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/atoms/accordion";
import { Button } from "@/components/atoms/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/atoms/card";
import { Input } from "@/components/atoms/input";
import { Separator } from "@/components/atoms/separator";
import { Skeleton } from "@/components/atoms/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/atoms/tabs";
import { AppHeader } from "@/components/molecules/app-header";
import { RadialChart } from "@/components/organisms/radial-chart";
import { YesNoChart } from "@/components/organisms/yes-no-chart";
import { usePredictionMarkets } from "@/hooks/use-prediction-markets";
import { ellipsisAddress, isValidUrl } from "@/utils";
import { useParams } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

function MarketTradingPage() {
  const { marketId } = useParams({ from: "/markets/$marketId" });
  const { markets, isLoading: originalLoading } = usePredictionMarkets();
  const market = markets.find((m) => m.id === marketId);

  const [stakeAmount, setStakeAmount] = useState(0);
  const [isStaking, setIsStaking] = useState(false);

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
    if (!stakeAmount) return;

    setIsStaking(true);
    try {
      // TODO: Call SUI smart contract
      console.log(`Staking ${stakeAmount} ROHR on ${isYes ? "YES" : "NO"}`);
      toast.success(`Successfully staked ${stakeAmount} ROHR for ${isYes ? "YES" : "NO"}`);
    } catch (error) {
      console.error("Error staking:", error);
      toast.error("Failed to stake");
    } finally {
      setIsStaking(false);
    }
  };

  // Dummy data for charts - generate dates for last 30 days
  const timeSeriesData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i)); // 30 days ago to today
    return {
      date: date.toISOString().split("T")[0],
      yes: 40 + Math.floor(Math.random() * 30),
      no: 30 + Math.floor(Math.random() * 20),
    };
  });

  const radialData = [
    {
      type: "vote",
      yes: market.yesPercentage,
      no: market.noPercentage,
    },
  ];

  const recentActivity = [
    {
      id: "1",
      user: "0x849290385d44652f",
      action: "staked",
      choice: "Yes" as const,
      amount: 2.5,
      timestamp: Date.now() - 5 * 60 * 1000,
      avatar: `https://avatar.vercel.sh/0x849290385d44652f`,
    },
    {
      id: "2",
      user: "0xa12b34c56d78e90f",
      action: "staked",
      choice: "No" as const,
      amount: 1.8,
      timestamp: Date.now() - 15 * 60 * 1000,
      avatar: `https://avatar.vercel.sh/0xa12b34c56d78e90f`,
    },
    {
      id: "3",
      user: "0xdef456789abcdef0",
      action: "staked",
      choice: "Yes" as const,
      amount: 3.2,
      timestamp: Date.now() - 30 * 60 * 1000,
      avatar: `https://avatar.vercel.sh/0xdef456789abcdef0`,
    },
    {
      id: "4",
      user: "0x123abc456def789g",
      action: "staked",
      choice: "No" as const,
      amount: 0.5,
      timestamp: Date.now() - 45 * 60 * 1000,
      avatar: `https://avatar.vercel.sh/0x123abc456def789g`,
    },
    {
      id: "5",
      user: "0xfedcba9876543210",
      action: "staked",
      choice: "Yes" as const,
      amount: 5.0,
      timestamp: Date.now() - 60 * 60 * 1000,
      avatar: `https://avatar.vercel.sh/0xfedcba9876543210`,
    },
  ];

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
                    {formatDistanceToNow(Date.now() - 2 * 60 * 60 * 1000, {
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
                  <CardTitle className="text-sm font-medium">Total Staked</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-2xl font-bold">
                    {market.totalStaked}&nbsp;{" "}
                    <span className="text-lg font-medium">ROHR</span>
                  </div>
                  <p className="text-xs text-muted-foreground">+0% from last month</p>
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

              <div className="flex gap-5 pt-5">
                <Input
                  placeholder="Enter stake amount (ROHR)"
                  className="h-12"
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(Number(e.target.value))}
                />
                <RadialChart data={radialData} />
              </div>
              <div className="flex gap-8">
                <Button
                  className="flex-1 h-12 bg-green-500 hover:bg-green-400"
                  onClick={() => handleStake(true)}
                  disabled={isStaking || !stakeAmount}
                >
                  {isStaking ? "Staking..." : "Stake YES"}
                </Button>
                <Button
                  className="flex-1 h-12 bg-red-500 hover:bg-red-400"
                  onClick={() => handleStake(false)}
                  disabled={isStaking || !stakeAmount}
                >
                  {isStaking ? "Staking..." : "Stake NO"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="activities" className="space-y-4">
              <div className="space-y-8">
                {recentActivity.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 justify-between">
                    <img src={item.avatar} alt="" className="w-8 h-8 rounded-full" />
                    <div className="flex-1">
                      <div className="text-sm">
                        <span className="font-medium">{item.user}</span> {item.action}{" "}
                        <span
                          className={
                            item.choice === "Yes" ? "text-green-600" : "text-red-600"
                          }
                        >
                          {item.choice}
                        </span>{" "}
                        at (${item.amount})
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(item.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default MarketTradingPage;

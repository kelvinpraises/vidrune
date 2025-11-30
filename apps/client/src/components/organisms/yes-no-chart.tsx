"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/atoms/chart";
import type { ChartConfig } from "@/components/atoms/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";

const chartConfig = {
  staking: {
    label: "Staked",
  },
  yes: {
    label: "Yes",
    color: "var(--chart-2)",
  },
  no: {
    label: "No",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

interface YesNoChartProps {
  data: Array<{
    date: string;
    yes: number;
    no: number;
  }>;
}

export function YesNoChart({ data }: YesNoChartProps) {
  const [timeRange, setTimeRange] = React.useState("all");

  const filteredData = React.useMemo(() => {
    // Always return all data - we need at least 2 points to draw a line
    // The time range selector is kept for future use when we have more data points
    if (data.length <= 2) return data;

    if (timeRange === "all") return data;

    const referenceDate = new Date();
    let minutesToSubtract = 60 * 24 * 7; // 7 days default

    switch (timeRange) {
      case "5m":
        minutesToSubtract = 5;
        break;
      case "15m":
        minutesToSubtract = 15;
        break;
      case "30m":
        minutesToSubtract = 30;
        break;
      case "45m":
        minutesToSubtract = 45;
        break;
    }

    const startDate = new Date(referenceDate.getTime() - minutesToSubtract * 60 * 1000);
    const filtered = data.filter((item) => new Date(item.date) >= startDate);

    // Always include at least 2 points for the chart to render properly
    if (filtered.length < 2 && data.length >= 2) {
      // Find the closest point JUST BEFORE the filter cutoff to use as anchor
      // This prevents jumping back to the very first data point
      let anchorPoint = null;
      for (let i = data.length - 1; i >= 0; i--) {
        const itemDate = new Date(data[i].date);
        if (itemDate < startDate) {
          anchorPoint = data[i];
          break;
        }
      }
      
      // If no point before cutoff, use the earliest available point
      if (!anchorPoint && data.length > 0) {
        anchorPoint = data[0];
      }
      
      if (anchorPoint && !filtered.some((p) => p.date === anchorPoint!.date)) {
        return [anchorPoint, ...filtered];
      }
    }

    return filtered.length > 0 ? filtered : data;
  }, [data, timeRange]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Vote Distribution</CardTitle>
          <CardDescription>
            Shows the relationship between 'Yes' and 'No' votes over time
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a value"
          >
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="rounded-lg">
              All time
            </SelectItem>
            <SelectItem value="45m" className="rounded-lg">
              Last 45 min
            </SelectItem>
            <SelectItem value="30m" className="rounded-lg">
              Last 30 min
            </SelectItem>
            <SelectItem value="15m" className="rounded-lg">
              Last 15 min
            </SelectItem>
            <SelectItem value="5m" className="rounded-lg">
              Last 5 min
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillNo" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-no)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-no)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillYes" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-yes)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-yes)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                // For short time ranges, show time; for longer, show date
                const now = new Date();
                const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
                if (diffHours < 24) {
                  return date.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                }
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="yes"
              type="natural"
              fill="url(#fillYes)"
              stroke="var(--color-yes)"
              stackId="a"
            />
            <Area
              dataKey="no"
              type="natural"
              fill="url(#fillNo)"
              stroke="var(--color-no)"
              stackId="a"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { Pie, PieChart, Sector } from "recharts";
import { Models } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_ID } from "@/appwrite/config";
import { databases } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { useRouter } from "next/navigation";

const chartConfig = {
  visitors: {
    label: "Startups",
  },
} satisfies ChartConfig;

interface ChartDataItem {
  domain: string;
  startups: number;
  fill: string;
}

export function Domain() {
  const [chartData, setChartData] = useState<ChartDataItem[]>([]);
  const router = useRouter();

  const fetchDomains = async () => {
    try {
      const response = await databases.listDocuments<Models.Document>(STAGING_DATABASE_ID, STARTUP_ID);
      const startups = response.documents;

      const domainCounts: { [key: string]: number } = startups.reduce((acc, startup) => {
        const domain = startup.domain || "Other";
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const sortedDomains = Object.entries(domainCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

      const colors = [
        "hsl(var(--chart-1))",
        "hsl(var(--chart-2))",
        "hsl(var(--chart-3))",
        "hsl(var(--chart-4))",
        "hsl(var(--chart-5))",
      ];

      const formattedData: ChartDataItem[] = sortedDomains.map(([domain, count], index) => ({
        domain,
        startups: count,
        fill: colors[index],
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching domains:", error);
    }
  };

  useEffect(() => {
    fetchDomains();

    // Listen for startup data changes
    const handleStartupDataChange = () => {
      fetchDomains();
    };

    window.addEventListener('startupDataChanged', handleStartupDataChange);

    return () => {
      window.removeEventListener('startupDataChanged', handleStartupDataChange);
    };
  }, []);

  const handlePieClick = (data: any) => {
    if (data && data.payload) {
      const domain = data.payload.domain;
      router.push(`/home/domain/${domain}`);
    }
  };
  

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 5 Domains</CardTitle>
      </CardHeader>
      <CardContent className="flex mt-3 gap-5">
        <ChartContainer config={chartConfig} className="w-[120px] h-[120px]">
        <PieChart width={300} height={300}>
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Pie
            className="cursor-pointer"
            data={chartData}
            dataKey="startups"
            nameKey="domain"
            innerRadius={30}
            strokeWidth={5}
            activeIndex={0}
            activeShape={({ outerRadius = 0, ...props }: any) => (
              <Sector {...props} outerRadius={outerRadius + 10} />
            )}
            onClick={handlePieClick}
          />
        </PieChart>
        </ChartContainer>
        <div className="flex flex-col text-xs gap-1 mt-3">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.fill }}
              ></div>
              <span>{item.domain}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

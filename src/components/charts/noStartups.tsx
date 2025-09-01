"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts";
import { databases } from "@/lib/utils";
import { STAGING_DATABASE_ID, STARTUP_ID} from "@/appwrite/config";

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

const chartConfig = {
  desktop: {
    label: "Startups",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function NoStartups() {
  const [chartData, setChartData] = useState<{ year: string; Startups: number }[]>([]);
  const router = useRouter();

  const fetchStartups = async () => {
    try {
      const response = await databases.listDocuments(STAGING_DATABASE_ID, STARTUP_ID);
      const startups = response.documents;

      // Extract only the year from "Feb 2025" -> "2025"
      const startupsByYear: { [key: string]: number } = startups.reduce((acc, startup) => {
        const year = startup.year.split(" ")[1] || "Unknown"; // Extracts last part as year
        acc[year] = (acc[year] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });

      const formattedData = Object.entries(startupsByYear)
        .map(([year, count]) => ({ year, Startups: count }))
        .sort((a, b) => a.year.localeCompare(b.year));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching startups:", error);
    }
  };

  useEffect(() => {
    fetchStartups();

    // Listen for startup data changes
    const handleStartupDataChange = () => {
      fetchStartups();
    };

    window.addEventListener('startupDataChanged', handleStartupDataChange);

    return () => {
      window.removeEventListener('startupDataChanged', handleStartupDataChange);
    };
  }, []);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const year = data.activePayload[0].payload.year;
      router.push(`/home/${year}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Startups</CardTitle>
        <CardDescription>
          {chartData.length > 0
            ? `${chartData[0].year} - ${chartData[chartData.length - 1].year}`
            : "No data available"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              top: 25,
            }}
            onClick={handleBarClick}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 4)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="Startups" fill="var(--color-desktop)" radius={8} cursor="pointer">
              <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

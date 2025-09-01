"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { Models } from "appwrite";
import {
  STAGING_DATABASE_ID,
  PROJECT_ID,
  API_ENDPOINT,
  PROJECTS_ID,
} from "@/appwrite/config";
import { databases } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

type ProjectDocument = Models.Document & {
  services: string | null;
  name:string;
};

// Type for service counts
type ServiceCounts = {
  Consulting: number;
  BDD: number;
  "Business Structuring": number;
  Events: number;
};

type ChartData = {
  service: string;
  count: number;
};

const chartConfig = {
  service: {
    label: "Service",
    color: "hsl(var(--chart-1))",
  },
  label: {
    color: "hsl(var(--background))",
  },
} satisfies ChartConfig;

export function ServicesChart() {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await databases.listDocuments<ProjectDocument>(
          STAGING_DATABASE_ID,
          PROJECTS_ID
        );
        const projects = response.documents;
        const serviceCounts: ServiceCounts = {
          Consulting: 0,
          BDD: 0,
          "Business Structuring": 0,
          Events: 0,
        };

        // Count startups for each service
        projects.forEach((project) => {
          const services = project.services?.split(",") || [];
          services.forEach((service) => {
            const trimmedService = service.trim() as keyof ServiceCounts;
            if (serviceCounts[trimmedService] !== undefined) {
              serviceCounts[trimmedService] += 1;
            }
          });
        });

        // Prepare data for chart
        const data: ChartData[] = Object.keys(serviceCounts).map((service) => ({
          service,
          count: serviceCounts[service as keyof ServiceCounts],
        }));

        setChartData(data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);
  // Handle bar click to navigate to the dynamic route
  const handleBarClick = (data: ChartData) => {
    router.push(`/home/service/${data.service}`); 
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Startups by Services</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart
            accessibilityLayer
            data={chartData}
            layout="vertical"
            margin={{
              right: 16,
            }}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="service"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              hide
            />
            <XAxis dataKey="count" type="number" hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Bar
              dataKey="count"
              layout="vertical"
              fill="hsl(var(--chart-1))"
              radius={4}
              onClick={(data) => handleBarClick(data)}
              className="cursor-pointer"
            >
              <LabelList
                dataKey="service"
                position="insideLeft"
                offset={8}
                className="fill-[--color-label]"
                fontSize={12}
              />
              <LabelList
                dataKey="count"
                position="right"
                offset={8}
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

export default ServicesChart;

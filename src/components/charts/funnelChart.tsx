"use client";

import React, { useState, useEffect } from "react";
import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import "highcharts/modules/funnel";
import { Card, CardContent } from "@/components/ui/card";
import { Models } from "appwrite";
import { STAGING_DATABASE_ID, PROJECTS_ID } from "@/appwrite/config";
import { databases } from "@/lib/utils";

const STATUSES = [
  "Pipeline",
  "In Progress",
  "On Hold",
  "Non Responsive",
  "Backed out",
  "Rejected",
  "Completed"
];

interface StatusCount {
  name: string;
  y: number;
}

const StartupFunnelChart = () => {
  const [chartData, setChartData] = useState<StatusCount[]>([]);

  const fetchStatusCounts = async () => {
    try {
      const response = await databases.listDocuments<Models.Document>(
        STAGING_DATABASE_ID,
        PROJECTS_ID
      );
      const projects = response.documents;

      // Count each status
      const counts = STATUSES.reduce((acc, status) => {
        acc[status] = projects.filter(p => p.startupStatus === status).length;
        return acc;
      }, {} as Record<string, number>);

      // Format for Highcharts
      const formattedData = STATUSES.map(status => ({
        name: status,
        y: counts[status] || 0
      }));

      setChartData(formattedData);
    } catch (error) {
      console.error("Error fetching status counts:", error);
    }
  };

  useEffect(() => {
    fetchStatusCounts();

    // Listen for project data changes
    const handleProjectDataChange = () => {
      fetchStatusCounts();
    };

    window.addEventListener('projectDataChanged', handleProjectDataChange);

    return () => {
      window.removeEventListener('projectDataChanged', handleProjectDataChange);
    };
  }, []);

  const chartOptions: Highcharts.Options = {
    chart: { type: "funnel", height: "78%" },
    title: { text: "Projects Status", align: "center", style: { fontSize: "13px" } },
    credits: { enabled: false },
    tooltip: {
      formatter: function (this: any) {
        return `<b>${this.point?.name}</b>: ${this.point?.y}`;
      },
    },
    plotOptions: {
      funnel: {
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.y}",
          softConnector: true,
          style: { fontSize: "8px" }
        },
        center: ["36%", "53%"],
        neckWidth: "30%",
        neckHeight: "25%",
        width: "80%",
      }
    },
    series: [{
      name: "Startups",
      type: "funnel",
      data: chartData
    }]
  };

  return (
    <Card>
      <CardContent>
        <div className="w-full h-[200px] max-w-4xl mx-auto">
          <HighchartsReact highcharts={Highcharts} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
};

export default StartupFunnelChart;

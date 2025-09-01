"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_ID, PROJECTS_ID } from "@/appwrite/config";
import { databases } from "@/lib/utils";
interface StatCardProps {
  title: string;
  mainValue: string | number;
  subValue: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface StartupStatsProps {
  showInvestmentCard?: boolean; 
}

const StartupStats: React.FC<StartupStatsProps> = ({ showInvestmentCard }) => {
  const [startupCount, setStartupCount] = useState<number>(0);
  const [totalInvestment, setTotalInvestment] = useState<number>(0);
  const [pipelineCount, setPipelineCount] = useState<number>(0);
  const [rejectedCount, setRejectedCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalProjects, setTotalProjects] = useState<number>(0);
  const router = useRouter();

  const fetchStartupCount = async () => {
    try {
      const response = await databases.listDocuments(STAGING_DATABASE_ID, STARTUP_ID);
      setStartupCount(response.total);
    } catch (error) {
      console.error("Error fetching startups count:", error);
    }
  };

  const fetchStatusCounts = async () => {
    try {
      // Pipeline
      const pipelineResponse = await databases.listDocuments(
        STAGING_DATABASE_ID,
        PROJECTS_ID,
        [Query.equal("startupStatus", "Pipeline")]
      );
      setPipelineCount(pipelineResponse.total);

      // Rejected
      const rejectedResponse = await databases.listDocuments(
        STAGING_DATABASE_ID,
        PROJECTS_ID,
        [Query.equal("startupStatus", "Rejected")]
      );
      setRejectedCount(rejectedResponse.total);

      // Completed
      const completedResponse = await databases.listDocuments(
        STAGING_DATABASE_ID,
        PROJECTS_ID,
        [Query.equal("startupStatus", "Completed")]
      );
      setCompletedCount(completedResponse.total);
    } catch (error) {
      console.error("Error fetching status counts:", error);
    }
  };

  const fetchTotalInvestment = async () => {
    try {
      const FUND_RAISED_ID = "6731e2fb000d9580025f";
      const response = await databases.listDocuments(STAGING_DATABASE_ID, FUND_RAISED_ID);

      const totalAmount = response.documents.reduce((sum: number, doc: any) => {
        const amount = parseFloat(doc.amount.replace(/[^0-9.-]+/g, ""));
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      setTotalInvestment(totalAmount);
    } catch (error) {
      console.error("Error fetching total investment:", error);
    }
  };

  const fetchTotalProjects = async () => {
    try {
      const response = await databases.listDocuments(STAGING_DATABASE_ID, PROJECTS_ID);
      setTotalProjects(response.total);
    } catch (error) {
      console.error("Error fetching total projects:", error);
    }
  };

  const fetchAllData = useCallback(() => {
    fetchStartupCount();
    fetchStatusCounts();
    fetchTotalInvestment();
    fetchTotalProjects();
  }, []);

  useEffect(() => {
    fetchAllData();

    // Listen for data changes
    const handleStartupDataChange = () => {
      fetchStartupCount();
    };

    const handleProjectDataChange = () => {
      fetchStatusCounts();
      fetchTotalProjects();
    };

    const handleFundRaisedDataChange = () => {
      fetchTotalInvestment();
    };

    window.addEventListener('startupDataChanged', handleStartupDataChange);
    window.addEventListener('projectDataChanged', handleProjectDataChange);
    window.addEventListener('fundRaisedDataChanged', handleFundRaisedDataChange);

    return () => {
      window.removeEventListener('startupDataChanged', handleStartupDataChange);
      window.removeEventListener('projectDataChanged', handleProjectDataChange);
      window.removeEventListener('fundRaisedDataChanged', handleFundRaisedDataChange);
    };
  }, [fetchAllData]);

  // Calculate the number of cards dynamically
  const statCards = [
    <StatCard
      key="total-startups"
      title="Total Startups"
      mainValue={`+${startupCount}`}
      subValue="+1% from last month"
      onClick={() => router.push("/startup")}
      icon={
        <svg
          className="w-6 h-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      }
    />,
    showInvestmentCard && (
      <StatCard
        key="total-investment"
        title="Total Investment Raised"
        mainValue={`${(totalInvestment / 10000000).toFixed(2)} Cr`}
        subValue="+10% from last year"
        icon={
          <svg
            className="w-6 h-5 text-yellow-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v8M16 12H8"
          />
          </svg>
        }
      />
    ),
    <StatCard
      key="total-projects"
      title="Total Projects"
      mainValue={`+${totalProjects}`}
      subValue="+1% from last month"
      onClick={() => router.push("/projects")}
      icon={
        <svg
          className="w-6 h-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 7l5 5m0 0l-5 5m5-5H6"
          />
        </svg>
      }
      />,
    <StatCard
      key="pipeline-startups"
      title="Pipeline Projects"
      mainValue={`+${pipelineCount}`}
      subValue="+0% from last month"
      onClick={() => router.push("/home/pipeline/Pipeline")}
      icon={
        <svg
          className="w-6 h-5 text-blue-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      }
    />,
    <StatCard
      key="rejected-startups"
      title="Rejected Projects"
      mainValue={`+${rejectedCount}`}
      subValue="+0% from last year"
      onClick={() => router.push("/home/RejectedProjects/RejectedProjects")}
      icon={
        <svg
          className="w-6 h-5 text-red-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      }
    />,
    <StatCard
      key="completed-startups"
      title="Completed Projects"
      mainValue={`+${completedCount}`}
      subValue="+0 since last year"
      onClick={() => router.push("/home/CompletedProjects/CompletedProjects")}
      icon={
        <svg
          className="w-6 h-5 text-green-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      }
    />,
  ].filter(Boolean); // Filter out undefined cards if `showInvestmentCard` is false

  // Determine grid column count based on the number of cards
  const gridClass =
    statCards.length === 4 ? "lg:grid-cols-6" : "lg:grid-cols-6";

  return (
    <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 ${gridClass} gap-4 p-2`}>
      {statCards}
    </div>
  );
};

const StatCard: React.FC<StatCardProps> = ({ title, mainValue, subValue, icon, onClick }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 max-w-full h-20 sm:max-w-sm cursor-pointer" onClick={onClick}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-600 p-2">{title}</h3>
        <span className="text-gray-600 mr-2">{icon}</span>
      </div>
      <h2 className="text-lg font-semibold mb-2 ml-3 -mt-4">{mainValue}</h2>
    </div>
  );
};

export default StartupStats;

"use client";

import React, { useEffect, useState } from "react";
import { Mail, MessageCircle, Globe } from "lucide-react";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, PROJECTS_ID } from "@/appwrite/config";
import { databases } from "@/lib/utils";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MigrationButton } from "@/lib/migration";

type Project = {
  startDate: string;
  receivedDate: string;
  projectEndDate: string;
  projectTemplate: string;
  services: string;
  appliedFor: string;
  stage: string;
  startupStatus: string;
};

interface InfoBoxProps {
  startupId: string;
  projectId: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({ startupId, projectId }) => {
  const [projectData, setProjectData] = useState<Project | null>(null);
  const [validatedFund, setValidatedFund] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedStage, setUpdatedStage] = useState<string>("");
  const [updatedStartupStatus, setUpdatedStartupStatus] = useState<string>("");
  const [updatedStartDate, setUpdatedStartDate] = useState(projectData?.startDate || "");
  const [updatedEndDate, setUpdatedEndDate] = useState(projectData?.projectEndDate || "");
  const [receivedDate, setReceivedDate] = useState<string | null>(null);
  const [updatedAppliedFor, setUpdatedAppliedFor] = useState<string>("");

  useEffect(() => {
    const fetchProjectData = async () => {
      try {
        // Query projects collection for matching startupId
        const response = await databases.listDocuments(STAGING_DATABASE_ID, PROJECTS_ID, [
          Query.equal("startupId", startupId),
          Query.equal("$id", projectId),
        ]);

        if (response.documents.length > 0) {
          const project = response.documents[0];
          setReceivedDate(project.receivedDate || null);
          setProjectData({
            startDate: project.startDate || "",
            receivedDate: project.receivedDate || "",
            projectEndDate: project.projectEndDate || "",
            projectTemplate: project.projectTemplate || "",
            appliedFor: project.appliedFor || "",
            services: project.services || "",
            stage: project.stage || "",
            startupStatus: project.startupStatus || "",
          });
          setUpdatedStage(project.stage || "");
          setUpdatedStartupStatus(project.startupStatus || "");
          setUpdatedStartDate(project.startDate || "");
          setUpdatedEndDate(project.projectEndDate || "");
          setUpdatedAppliedFor(project.appliedFor || "");
        } else {
          console.warn("No projects found for this startup.");
        }
      } catch (error) {
        console.error("Error fetching project data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectData();
  }, [startupId, projectId]);

  useEffect(() => {
    if (updatedStartDate && updatedStartDate !== "") {
      setUpdatedStartupStatus("In Progress");
    }
  }, [updatedStartDate]);
  

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  const getBorderColor = (): string => {
    if (projectData?.startupStatus === "Completed") return "border-green-500 text-green-500";
    if (projectData?.startupStatus === "Rejected") return "border-red-500 text-red-500";
    if (projectData?.startupStatus === "Pipeline") return "border-blue-500 text-blue-500";
    return "border-gray-300"; // Default border color
  };

  const handleUpdateClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    try {
      if (projectData) {
        let newStartupStatus = updatedStartupStatus;
        if (updatedStartDate && updatedStartDate !== "") {
          newStartupStatus = "In Progress";
        }

        await databases.updateDocument(STAGING_DATABASE_ID, PROJECTS_ID, projectId, {
          stage: updatedStage,
          startupStatus: updatedStartupStatus,
          startDate: updatedStartDate,
          projectEndDate: updatedEndDate,
          appliedFor: updatedAppliedFor,
        });
        setProjectData((prev) =>
          prev ? { 
            ...prev, 
            stage: updatedStage, 
            startupStatus: updatedStartupStatus,
            startDate: updatedStartDate,
            projectEndDate: updatedEndDate, 
            appliedFor: updatedAppliedFor,
          } : null
        );
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating data:", error);
    }
  };
  const isDateValid = (date: string, compareDate: string | null, isAfter: boolean): boolean => {
    if (!compareDate) return true;
    const dateToCheck = new Date(date);
    const comparisonDate = new Date(compareDate);
    return isAfter ? dateToCheck > comparisonDate : dateToCheck < comparisonDate;
  };
  
  const isStartDateValid = (date: string): boolean => {
    return isDateValid(date, receivedDate, true);
  };
  
  const isEndDateValid = (date: string): boolean => {
    return isDateValid(date, updatedStartDate, true);
  };
  
  if (loading) {
    return (
      <div className="p-2 mx-auto rounded-xl border border-gray-300 space-y-4 sm:space-y-0">
        Loading...
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="flex flex-wrap items-center justify-between p-2 mx-auto rounded-xl border border-gray-300 space-y-4 sm:space-y-0">
        No projects found for this startup.
        <div className="flex items-center space-x-4 sm:space-x-6 text-black hover:text-gray-700 transition-colors duration-200 ease-in-out">
          <Mail className="icon-class h-5 w-5 sm:h-6 sm:w-6" />
          <MessageCircle className="icon-class h-5 w-5 sm:h-6 sm:w-6" />
          <Globe className="icon-class h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between p-3 mx-auto rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 space-y-4 sm:space-y-0">
      <div className="flex items-center gap-3 flex-nowrap overflow-x-auto">
      {isEditing ? (
          <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-gray-700">Start Date</Label>
            <input
              type="date"
              value={updatedStartDate}
              min={receivedDate || undefined}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => {
                const newDate = e.target.value;
                if (isStartDateValid(newDate)) {
                  setUpdatedStartDate(newDate);
                  if (newDate !== "") {
                    setUpdatedStartupStatus("In Progress");
                  }
                } else {
                  console.log("Start date must be after the received date.");
                }
              }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-gray-700">End Date</Label>
            <input
              type="date"
              value={updatedEndDate}
              min={updatedStartDate || undefined}
              onChange={(e) => {
                const newDate = e.target.value;
                if (isEndDateValid(newDate)) {
                  setUpdatedEndDate(newDate);
                } else {
                  console.log("End date must be after the start date.");
                }
              }}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all w-32"
            />
          </div>
        </div>
        
        ) : (
          <span className="text-gray-700 font-medium sm:text-base whitespace-nowrap">
            {projectData.startDate ? formatDate(projectData.startDate) : "Start Date"} - {projectData.projectEndDate ? formatDate(projectData.projectEndDate) : "End Date"}
          </span>
        )}
        {projectData.receivedDate && (
          <span className="text-gray-700 font-medium bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm whitespace-nowrap">
            {formatDate(projectData.receivedDate)}
          </span>
        )}
        <span className="text-gray-700 font-medium bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm whitespace-nowrap">
            {projectData.services || "Services"}
          </span>
        {/* Funding Need Field */}
        {isEditing ? (
          <div className="w-32 flex-shrink-0">
            <Label htmlFor="appliedFor" className="text-xs font-medium text-gray-700">Funding Need</Label>
            <Select
              value={updatedAppliedFor}
              onValueChange={setUpdatedAppliedFor}
            >
              <SelectTrigger className="w-full border-gray-200 focus:ring-2 focus:ring-blue-500 h-8">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {["Equity", "Grant", "Debt"].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-gray-700 font-medium bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm whitespace-nowrap">{projectData?.appliedFor || "Funding Need"}</span>
        )}

        {/* Editable Stage */}
        {projectData.projectTemplate === 'TANSIM' && (
          isEditing ? (
            <div className="w-32 flex-shrink-0">
              <Label className="text-xs font-medium text-gray-700">TANSIM Stage</Label>
              <Select value={updatedStage} onValueChange={setUpdatedStage}>
                <SelectTrigger className="border-gray-200 focus:ring-2 focus:ring-blue-500 h-8">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Pre First Connect",
                    "First Connect",
                    "SME",
                    "Deep Dive",
                    "IM",
                    "IC",
                    "PSC",
                    "SHA",
                  ].map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <>
              <span className="text-gray-700 flex items-center gap-2 font-medium bg-gray-50 border border-gray-200 px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm whitespace-nowrap">
                  <div className="bg-red-500 rounded-full h-2.5 w-2.5" />
                  {projectData.stage || "TANSIM Stage"}
                </span>
            </>
          )
        )}

        {/* Editable Startup Status */}
        {isEditing ? (
          <div className="w-32 flex-shrink-0">
            <Label className="text-xs font-medium text-gray-700">Project Status</Label>
          <Select value={updatedStartupStatus} onValueChange={setUpdatedStartupStatus}>
            <SelectTrigger className="border-gray-200 focus:ring-2 focus:ring-blue-500 h-8">
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Pipeline",
                "In Progress",
                "On Hold",
                "Non Responsive",
                "Backed out",
                "Rejected",
                "Completed",
              ].map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>
        ) : (
          <>
          <span
              className={`border ${getBorderColor()} font-medium px-3 py-1 rounded-full text-xs sm:text-sm shadow-sm whitespace-nowrap`}
            >
              {projectData.startupStatus || "Project Status"}
            </span>
          </>
        )}

        {/* Update/Save Button */}
        {!isEditing ? (
          <Button
            onClick={handleUpdateClick}
            variant={"outline"}
            className="border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all h-8 px-3 flex-shrink-0"
          >
            Update
          </Button>
        ) : (
          <Button
            onClick={handleSaveClick}
            variant={"outline"}
            className="border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-all h-8 px-3 flex-shrink-0"
          >
            Save
          </Button>
        )}
        {projectData.startupStatus === "Completed" && (
          <MigrationButton startupId={startupId} />
        )}
      </div>
    </div>
  );
};

export default InfoBox;

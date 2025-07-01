"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  STAGING_DATABASE_ID,
  PROJECTS_ID,
  STARTUP_ID,
} from "@/appwrite/config";
import { databases } from "@/lib/utils";
import InfoBox from "./Infobox";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

// Import components for tabs
import CompanyInformation from "@/components/Collections/view/CompanyInformation";
import RegulatoryInformation from "@/components/Collections/view/CompanyInfotabs/RegulatoryInformation";
import Contact from "@/components/Collections/view/CompanyInfotabs/Contact";
import AboutBusiness from "@/components/Collections/view/CompanyInfotabs/AboutBusiness";
import CustomerTestimonials from "@/components/Collections/view/CompanyInfotabs/CustomerTestimonials";

import FundingMilestones from "@/components/Collections/view/FundingMilestones";
import FundRaisedSoFar from "@/components/Collections/view/FundingMilestonestabs/FundRaised";
import Shareholders from "@/components/Collections/view/FundingMilestonestabs/Shareholders";
import CapTable from "@/components/Collections/view/FundingMilestonestabs/CapTable";
import FundAsk from "@/components/Collections/view/FundingMilestonestabs/FundAsk";
import TranchesMilestones from "@/components/Collections/view/FundingMilestonestabs/Milestones";

import Compliance from "@/components/Collections/view/Compliance";
import IncomeTaxCompliance from "@/components/Collections/view/Compliancetabs/IncomeTax";
import RocCompliance from "@/components/Collections/view/Compliancetabs/ROCcompliance";
import GstCompliance from "@/components/Collections/view/Compliancetabs/GSTcompliance";
import GstrCompliance from "@/components/Collections/view/Compliancetabs/GSTR1";
import ESICDetails from "@/components/Collections/view/Compliancetabs/esic";

import Documents from "@/components/Collections/view/Documents";
import DocumentChecklist from "@/components/Collections/view/Documentstabs/DocumentsChecklist";
import Patents from "@/components/Collections/view/Documentstabs/Patents";
import Incubation from "@/components/Collections/view/Documentstabs/Incubation";
import LoadingSpinner from "@/components/ui/loading";

type ProjectDetails = {
  id: string;
  name: string;
  startupId: string;
  startDate: string;
  receivedDate: string;
  projectEndDate: string;
  appliedFor: string;
  services: string;
  projectTemplate: string;
  startupStatus: string;
  stage: string;
};

type StartupDetails = {
  id: string;
  name: string;
};

const ProjectViewPage = ({ id }: { id: string }) => {
  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [startupData, setStartupData] = useState<StartupDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [isDirty, setIsDirty] = useState(false);
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  const [storedTab, setStoredTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      const storedTab = localStorage.getItem(`activeTab_${id}`);
      return storedTab || "companyInfo";
    } else {
      return "companyInfo";
    }
  });
  const [companyInfoKey, setCompanyInfoKey] = useState(0);
  const [fundingMilestonesKey, setFundingMilestonesKey] = useState(0);
  const [complianceKey, setComplianceKey] = useState(0);
  const [documentsKey, setDocumentsKey] = useState(0);

  const [showProjectAlert, setShowProjectAlert] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("projectsScreenInstructionsAlertHide") === "true") return;
    const alertCount = parseInt(sessionStorage.getItem("projectsScreenInstructionsAlertCount") || "0", 10);
    if (alertCount < 1) {
      const timer = setTimeout(() => {
        setShowProjectAlert(true);
        sessionStorage.setItem("projectsScreenInstructionsAlertCount", String(alertCount + 1));
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Use useEffect to manage storedTab based on changes to id and activeTab
  useEffect(() => {
    const localStorageKey = `activeTab_${id}`;

    // Function to update localStorage and storedTab state
    const updateStoredTab = (tab: string) => {
      localStorage.setItem(localStorageKey, tab);
      setStoredTab(tab);
    };

    // Initial setup: Load from localStorage if available
    if (typeof localStorage !== 'undefined') {
      const initialTab = localStorage.getItem(localStorageKey);
      setStoredTab(initialTab);
    }

    // Update storedTab when activeTab changes and the id is the same
    if (activeTab && typeof localStorage !== 'undefined') {
      if (localStorage.getItem(localStorageKey) !== activeTab) {
        updateStoredTab(activeTab);
      }
    }

    // Clear storedTab when the id changes
    return () => {
      localStorage.removeItem(localStorageKey);
      setStoredTab(null);
    };
  }, [id, activeTab]);
  

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        // Fetch project details
        const response = await databases.getDocument(STAGING_DATABASE_ID, PROJECTS_ID, id);
        setProject({
          id: response.$id,
          name: response.name || "",
          startupId: response.startupId || "",
          startDate: response.startDate || "",
          receivedDate: response.receivedDate || "",
          projectEndDate: response.projectEndDate || "",
          appliedFor: response.appliedFor || "",
          services: response.services || "",
          projectTemplate: response.projectTemplate || "",
          startupStatus: response.startupStatus || "",
          stage: response.stage || "",
        });

        // Fetch startup details based on startupId
        if (response.startupId) {
          const startupResponse = await databases.getDocument(STAGING_DATABASE_ID, STARTUP_ID, response.startupId);
          setStartupData({
            id: startupResponse.$id,
            name: startupResponse.name || "Unknown Startup",
          });
        }
      } catch (error) {
        console.error("Error fetching project or startup details:", error);
        router.push("/projects"); // Redirect to projects page if ID is invalid
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id, router]);

  const handleTabChange = (newTab: string) => {
    if (isDirty) {
      setShowAlertDialog(true);
      setPendingTab(newTab);
    } else {
      setActiveTab(newTab);
  
      // Reset the menu item to close the dropdown
      if (
        ["companyInfo", "regulatoryInfo", "contact", "aboutBusiness", "customerTestimonials"].includes(newTab)
      ) {
        setCompanyInfoKey((k) => k + 1);
      } else if (
        ["fundraisedsofar", "shareholders", "captable", "fundask", "milestones"].includes(newTab)
      ) {
        setFundingMilestonesKey((k) => k + 1);
      } else if (
        ["compliance", "incometax", "roccompliance", "gstcompliance", "gstrcompliance", "esic"].includes(newTab)
      ) {
        setComplianceKey((k) => k + 1);
      } else if (
        ["documents", "documentchecklist", "patents", "incubation"].includes(newTab)
      ) {
        setDocumentsKey((k) => k + 1);
      }
    }
  };
  
  const confirmTabChange = () => {
    setIsDirty(false);
    setActiveTab(pendingTab!);
    setShowAlertDialog(false);
    setPendingTab(null);
  };

  const cancelTabChange = () => {
    setShowAlertDialog(false);
    setPendingTab(null);
  };
  
  if (loading) {
    return (
      <div>
        {/* Loading Spinner */}
        <LoadingSpinner />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "companyInfo":
        return <CompanyInformation startupId={project?.startupId} activeTab={activeTab} setActiveTab={setActiveTab} setIsDirty={setIsDirty} />;
      case "regulatoryInfo":
        return <RegulatoryInformation startupId={project?.startupId} setIsDirty={setIsDirty} />;
      case "contact":
        return <Contact startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "aboutBusiness":
        return <AboutBusiness startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "customerTestimonials":
        return <CustomerTestimonials startupId={project?.startupId} setIsDirty={setIsDirty}/>

      case "fundingMilestones":
        return <FundingMilestones startupId={project?.startupId} activeTab={activeTab} setIsDirty={setIsDirty} />;
      case "fundraisedsofar":
        return <FundRaisedSoFar startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "shareholders":
        return <Shareholders startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "captable":
        return <CapTable startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "fundask":
        return <FundAsk startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "milestones":
        return <TranchesMilestones startupId={project?.startupId} setIsDirty={setIsDirty}/>;

      case "compliance":
        return <Compliance startupId={project?.startupId} activeTab={activeTab} setIsDirty={setIsDirty}/>;
  
      case "incometax":
        return <IncomeTaxCompliance startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "roccompliance":
        return <RocCompliance startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "gstcompliance":
        return <GstCompliance startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "gstrcompliance":
        return <GstrCompliance startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "esic":
        return <ESICDetails startupId={project?.startupId} setIsDirty={setIsDirty}/>;

      case "documents":
        return <Documents startupId={project?.startupId} activeTab={activeTab} setIsDirty={setIsDirty}/>;
      case "documentchecklist":
        return <DocumentChecklist startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "patents":
        return <Patents startupId={project?.startupId} setIsDirty={setIsDirty}/>;
      case "incubation":
        return <Incubation startupId={project?.startupId} setIsDirty={setIsDirty}/>;

      default:
        return null;
    }
  };

  return (
    <>
    {/* Alert Dialog */}
    <AlertDialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to switch tabs?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelTabChange}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTabChange}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Header */}
      <div className="p-2">
        {startupData && (
          <div className="flex items-center space-x-2 mb-2">
            <button
              onClick={() => router.push(`/startup/${startupData.id}`)}
              className="text-2xl font-semibold text-gray-800 px-1 hover:text-blue-500 transition"
            >
              {startupData.name}
            </button>
          </div>
        )}

        {/* Render InfoBox */}
        {project.startupId && <InfoBox startupId={project.startupId} projectId={project.id} />}

        {/* Tabs for Navigation */}
                  <NavigationMenu className="-ml-2">
                    <NavigationMenuList className="flex flex-wrap space-x-2 mt-2">
                      <NavigationMenuItem key={`companyInfo-${companyInfoKey}`}>
                        <NavigationMenuTrigger className="font-bold bg-transparent">
                          Company Information
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="absolute left-0 bg-white shadow-lg rounded-lg w-full sm:w-64 z-20">
                          <ul className="flex flex-col text-sm font-semibold">
                            <li>
                              <button
                                onClick={() => handleTabChange("companyInfo")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Company Details
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("regulatoryInfo")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Regulatory Information
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("contact")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Contact
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("aboutBusiness")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                About Business
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("customerTestimonials")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Customer Testimonials
                              </button>
                            </li>
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                      <NavigationMenuItem key={`fundingMilestones-${fundingMilestonesKey}`}>
                        <NavigationMenuTrigger className="font-bold bg-transparent">
                          Funding and Milestones
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="absolute left-0 sm:left-48 w-full bg-white shadow-lg rounded-lg z-10">
                          <ul className="flex flex-col text-sm font-semibold">
                            <li>
                              <button
                                onClick={() => handleTabChange("fundraisedsofar")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Funds Raised So Far
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("shareholders")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Shareholders
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("captable")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Cap Table
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("fundask")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Fund Ask
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("milestones")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Tranches Milestones
                              </button>
                            </li>
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                      <NavigationMenuItem key={`compliance-${complianceKey}`}>
                        <NavigationMenuTrigger className="font-bold bg-transparent">
                          Compliance
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="absolute left-0 sm:left-96 w-full bg-white shadow-lg rounded-lg z-10">
                          <ul className="flex flex-col text-sm font-semibold">
                            <li>
                              <button
                                onClick={() => handleTabChange("roccompliance")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                ROC Compliance
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("incometax")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Income Tax
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("gstcompliance")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                GST Compliance
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("gstrcompliance")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                GSTR Compliance
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("esic")}
                                className="block w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                ESIC & EPF
                              </button>
                            </li>
                            
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                      <NavigationMenuItem  key={`documents-${documentsKey}`}>
                        <NavigationMenuTrigger  className="font-bold bg-transparent">
                          Documents
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="absolute left-0 ml-36 sm:left-96 w-full bg-white shadow-lg rounded-lg">
                          <ul className="flex flex-col text-sm font-semibold">
                            <li>
                              <button
                                onClick={() => handleTabChange("documentchecklist")}
                                className="w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Document Checklist
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("patents")}
                                className="w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Patents
                              </button>
                            </li>
                            <li>
                              <button
                                onClick={() => handleTabChange("incubation")}
                                className="w-full text-left px-4 py-2 rounded-xl hover:bg-gray-100"
                              >
                                Incubation
                              </button>
                            </li>
                          </ul>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    </NavigationMenuList>
                  </NavigationMenu>
                  {/* Render the active tab content */}
              <div className="mt-2 p-2">{renderTabContent()}</div>
              <AlertDialog open={showProjectAlert} onOpenChange={setShowProjectAlert}>
                      <AlertDialogContent className="w-full max-w-2xl p-6 max-h-[70vh] overflow-y-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle>{project.name}</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                          <ol className="list-decimal list-inside space-y-2 text-black">
                            <li>
                              Project details are in Info box below startup name, Progress can be updated by <b className="text-blue-500">update</b> button.
                            </li>
                            <li>
                              Each Sections has SubSections of Company Information, Funding and Milestones, Compliance and Documents.
                            </li>
                            <li>
                              Click on the <b className="text-blue-500">Company Information</b> tab to view and edit company details. same follows for other tabs.
                            </li>
                            
                          </ol>
                        </AlertDialogDescription>
                        <div className="flex items-center mt-4">
                          <input
                            type="checkbox"
                            id="projectsScreenInstructionsDontShowAgain"
                            checked={dontShowAgain}
                            onChange={e => setDontShowAgain(e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor="projectsScreenInstructionsDontShowAgain">Don&apos;t show again</label>
                        </div>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => {
                            setShowProjectAlert(false);
                            if (dontShowAgain) {
                              localStorage.setItem("projectsScreenInstructionsAlertHide", "true");
                            }
                          }}>
                            Got it
                          </AlertDialogCancel>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
      </div>
    </>
  );
};

export default ProjectViewPage;

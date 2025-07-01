"use client";

import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { NoUsers } from "@/components/charts/noUsers";
import { NoStartups } from "@/components/charts/noStartups";
import StartupStats from "@/components/charts/startupStats";
import { Domain } from "@/components/charts/domains";
import { AreaChartPortfolio } from "@/components/charts/areaChart";
import { ServicesChart } from "@/components/charts/services";
import { client, databases } from "@/lib/utils";
import { STAGING_DATABASE_ID, STARTUP_ID, PROJECTS_ID } from "@/appwrite/config";

// Dynamically import StartupFunnelChart with SSR disabled
import dynamic from "next/dynamic";
const StartupFunnelChart = dynamic(
  () => import("@/components/charts/funnelChart"),
  { ssr: false }
);

const Dashboard = () => {
  const [showWelcomeAlert, setShowWelcomeAlert] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("dashboardWelcomeAlertHide") === "true") return;
    const alertCount = parseInt(sessionStorage.getItem("dashboardWelcomeAlertCount") || "0", 10);
    if (alertCount < 1) {
      const timer = setTimeout(() => {
        setShowWelcomeAlert(true);
        sessionStorage.setItem("dashboardWelcomeAlertCount", String(alertCount + 1));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    let isSubscribed = true;
    let subscriptions: Array<(() => void) | null> = [];

    const setupSubscriptions = async () => {
      try {
        const unsubscribeStartups = client.subscribe(
          `databases.${STAGING_DATABASE_ID}.collections.${STARTUP_ID}.documents`,
          (response: any) => {
            if (!isSubscribed) return;
            window.dispatchEvent(new CustomEvent('startupDataChanged'));
          }
        );
        subscriptions.push(unsubscribeStartups);

        const unsubscribeProjects = client.subscribe(
          `databases.${STAGING_DATABASE_ID}.collections.${PROJECTS_ID}.documents`,
          (response: any) => {
            if (!isSubscribed) return;
            window.dispatchEvent(new CustomEvent('projectDataChanged'));
          }
        );
        subscriptions.push(unsubscribeProjects);

        const unsubscribeFundRaised = client.subscribe(
          `databases.${STAGING_DATABASE_ID}.collections.6731e2fb000d9580025f.documents`,
          (response: any) => {
            if (!isSubscribed) return;
            window.dispatchEvent(new CustomEvent('fundRaisedDataChanged'));
          }
        );
        subscriptions.push(unsubscribeFundRaised);
      } catch (error) {
        console.error("Error setting up subscriptions:", error);
      }
    };

    setupSubscriptions();

    return () => {
      isSubscribed = false;
      subscriptions.forEach((unsubscribe) => {
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch (error) {
            console.error("Error unsubscribing:", error);
          }
        }
      });
    };
  }, []);

  return (
    <>
      <AlertDialog open={showWelcomeAlert} onOpenChange={setShowWelcomeAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Welcome to the application!</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  To add <b>Projects</b> Navigate to Projects which is on <b>Side bar</b>.
                </li>
                <li>
                  You can view stats, services, and startup information on this dashboard.
                </li>
              </ol>
            </AlertDialogDescription>
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                id="dashboardWelcomeDontShowAgain"
                checked={dontShowAgain}
                onChange={e => setDontShowAgain(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="dashboardWelcomeDontShowAgain">Don&apos;t show again</label>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowWelcomeAlert(false);
              if (dontShowAgain) {
                localStorage.setItem("dashboardWelcomeAlertHide", "true");
              }
            }}>
              Got it
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <StartupStats showInvestmentCard={true} />
      <div className="grid grid-cols-3 gap-4 p-2">
        <StartupFunnelChart />
        <ServicesChart />
        <Domain />
        <NoStartups />
        <AreaChartPortfolio />
        <NoUsers />
      </div>
    </>
  );
};

export default Dashboard;

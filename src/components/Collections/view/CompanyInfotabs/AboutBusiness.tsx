"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EditIcon, SaveIcon, XIcon } from "lucide-react";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

export const ABOUT_COLLECTION_ID = "67207029001de651f13d";
export const ABOUT_BUSINESS_HISTORY_COLLECTION_ID = "67cd3c3200358b51bdc9";


interface AboutBusinessProps {
  startupId: string;
  setIsDirty?: (isDirty: boolean) => void;
}

interface DataType {
  [key: string]: string | null;
}

const fields = [
  { id: "problemStatement", label: "Problem Statement" },
  { id: "solutionStage", label: "Current Stage of Solution/Idea" },
  { id: "businessLines", label: "Other Current Business Lines" },
  { id: "futureLines", label: "Future Business Lines" },
  { id: "marketOverview", label: "Market Overview" },
  { id: "solutionOverview", label: "Solution Overview" },
  { id: "competition", label: "Competition" },
  { id: "opportunityAnalysis", label: "Opportunity Analysis" },
];

const AboutBusiness: React.FC<AboutBusinessProps> = ({ startupId, setIsDirty }) => {
  const [data, setData] = useState<DataType>({});
  const [originalData, setOriginalData] = useState<DataType>({});
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [changes, setChanges] = useState<{ fieldChanged: string; oldValue: string; newValue: string }[]>([]);
  const { toast } = useToast();
  const isStartupRoute = useIsStartupRoute();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? ABOUT_COLLECTION_ID : ABOUT_COLLECTION_ID;

        const response = await databases.listDocuments(
          databaseId,
          collectionId,
          [Query.equal("startupId", startupId)]
        );
        if (response.documents.length > 0) {
          const document = response.documents[0];
          setData(document);
          setOriginalData(document);
          setDocumentId(document.$id);
        } else {
          const emptyData: DataType = {};
          fields.forEach(f => emptyData[f.id] = "");
          setData(emptyData);
          setOriginalData(emptyData);
          setDocumentId(null);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({ variant: "destructive", title: "Failed to fetch About Business data." });
        const emptyData: DataType = {};
        fields.forEach(f => emptyData[f.id] = "");
        setData(emptyData);
        setOriginalData(emptyData);
        setDocumentId(null);
      }
    };

    if (startupId) {
      fetchData();
    }
  }, [startupId, toast, isStartupRoute]);

  const handleEdit = () => {
    setIsEditing(true);
    setIsDirty?.(true);
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setIsDirty?.(false);

    try {
      const { $id, $databaseId, $collectionId, ...userDefinedData } = data;

      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? ABOUT_COLLECTION_ID : ABOUT_COLLECTION_ID;

      if (documentId) {
        await databases.updateDocument(databaseId, collectionId, documentId, userDefinedData);
      } else {
        const response = await databases.createDocument(
          databaseId,
          collectionId,
          "unique()",
          { ...userDefinedData, startupId }
        );
        setDocumentId(response.$id);
      }

      const historyEntries = changes.map((change) => ({
        startupId,
        fieldChanged: change.fieldChanged,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changedAt: new Date().toISOString(),
      }));

      await Promise.all(
        historyEntries.map((entry) =>
          databases.createDocument(STAGING_DATABASE_ID, ABOUT_BUSINESS_HISTORY_COLLECTION_ID, "unique()", entry)
        )
      );

      setOriginalData(data);
      setChanges([]);
      setIsEditing(false);
      toast({ title: "About Business saved successfully!" });
    } catch (error) {
      console.error("Error saving About Business:", error);
      toast({ variant: "destructive", title: "Failed to save About Business." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setData(originalData);
    setIsEditing(false);
    setIsDirty?.(false);
    setChanges([]);
  };

  const handleChange = (field: string, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));

    if (originalData[field] !== value) {
      const change = {
        fieldChanged: field,
        oldValue: originalData[field] ?? "N/A",
        newValue: value,
      };

      setChanges((prev) => {
        const index = prev.findIndex((c) => c.fieldChanged === field);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = change;
          return updated;
        } else {
          return [...prev, change];
        }
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium">About Business</h2>
          {isStartupRoute && (
            <Link href={`/startup/${startupId}/AboutBusinessHistory`}>
              <span className="text-blue-500 hover:underline text-sm">Audit Trails</span>
            </Link>
          )}
        </div>

        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="flex items-center gap-1 border border-green-500 text-green-500 rounded-full px-2 py-1 text-xs hover:bg-green-100"
            >
              <SaveIcon size={15} />
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 border border-red-500 text-red-500 rounded-full px-2 py-1 text-xs hover:bg-red-100"
            >
              <XIcon size={15} />
              Cancel
            </button>
          </div>
        ) : (
          ! isStartupRoute && (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1 border border-gray-300 rounded-full px-2 py-1 text-xs hover:bg-gray-100"
          >
            <EditIcon size={15} />
            Edit
          </button>
          )
        )}
      </div>

      <AccordionDemo data={data} isEditing={isEditing} onChange={handleChange} />
    </div>
  );
};

interface AccordionDemoProps {
  data: DataType;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}

const AccordionDemo: React.FC<AccordionDemoProps> = ({ data, isEditing, onChange }) => {
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <Accordion
      type="single"
      collapsible
      value={openItem ?? undefined}
      onValueChange={(value) => setOpenItem(value)}
    >
      {fields.map((field) => (
        <AccordionItem
          key={field.id}
          value={field.id}
          className="px-3 mb-3 mx-auto bg-white rounded-lg shadow-md border"
        >
          <AccordionTrigger className="text-sm font-semibold">
            {field.label}
          </AccordionTrigger>
          <AccordionContent>
            <ReactQuill
              key={`${field.id}-${isEditing}-${openItem === field.id}`} // ensures re-render when mode changes
              theme={isEditing ? "snow" : "bubble"}
              value={data[field.id] || ""}
              onChange={(value) => onChange(field.id, value)}
              readOnly={!isEditing}
              className="h-96"
            />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default AboutBusiness;

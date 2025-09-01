"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ID, Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_DATABASE, STARTUP_ID } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FORMS_ID } from "./ROCcompliance";

export const INCOME_TAX_TABLE_ID = "6736e636001bd105c8c8";

interface IncomeTaxComplianceProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

const IncomeTaxCompliance: React.FC<IncomeTaxComplianceProps> = ({ startupId, setIsDirty }) => {
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [editingCompliance, setEditingCompliance] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [queryOptions, setQueryOptions] = useState<string[]>([]);
  const [natureOfCompany, setNatureOfCompany] = useState<string>("");
  const [formsData, setFormsData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const isStartupRoute = useIsStartupRoute();
  const [itChecklistGenerated, setItChecklistGenerated] = useState<boolean | null>(null);
  const hasRunChecklist = useRef(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);


  useEffect(() => {
    const fetchComplianceData = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? INCOME_TAX_TABLE_ID : INCOME_TAX_TABLE_ID;

        const response = await databases.listDocuments(databaseId, collectionId, [
          Query.equal("startupId", startupId),
        ]);
        const filteredDocuments = response.documents.map(doc => {
          const { $id, query, yesNo, date, description } = doc;
          return { $id, query, yesNo, date, description };
        });
        setComplianceData(filteredDocuments);
        //Fetch natureOfCompany from Startups
        const startupResponse = await databases.getDocument(
          STAGING_DATABASE_ID,
          STARTUP_ID,
          startupId
        );
        setNatureOfCompany(startupResponse.natureOfCompany);
        setItChecklistGenerated(startupResponse.itChecklistGenerated ?? false);
      } catch (error) {
        console.error("Error fetching compliance data:", error);
      }
    };
    fetchComplianceData();
  }, [startupId, isStartupRoute]);

  useEffect(() => {
    const fetchQueryOptions = async () => {
      try {
        const response = await databases.listDocuments(STAGING_DATABASE_ID, FORMS_ID, [
          Query.equal("natureOfCompany", natureOfCompany),
          Query.equal("types", "it"),
        ]);
        const documents = response.documents;
        const options = documents.map((doc) => doc.query);
        setQueryOptions(options);
        setFormsData(documents);
      } catch (error) {
        console.error("Error fetching query options:", error);
      }
    };
    fetchQueryOptions();
  }, [natureOfCompany]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  // --- MAIN LOGIC: Auto-generate IT checklist ---
  useEffect(() => {
    const generateITChecklistIfNeeded = async () => {
      if (
        itChecklistGenerated === false &&
        !hasRunChecklist.current &&
        natureOfCompany &&
        queryOptions.length > 0
      ) {
        hasRunChecklist.current = true;
        setIsGeneratingChecklist(true);
        // Identify missing queries
        const missing = queryOptions.filter(
          (query) => !complianceData.some((doc) => doc.query === query)
        );

        // Create missing docs
        for (const query of missing) {
          await databases.createDocument(
            STAGING_DATABASE_ID,
            INCOME_TAX_TABLE_ID,
            ID.unique(),
            {
              startupId,
              query,
              yesNo: "",
              date: "",
              description: "",
            }
          );
        }

        // Mark checklist as generated in Startups collection
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          STARTUP_ID,
          startupId,
          { itChecklistGenerated: true }
        );
        setItChecklistGenerated(true);

        // Refresh compliance data
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          INCOME_TAX_TABLE_ID,
          [Query.equal("startupId", startupId)]
        );
        const filteredDocuments = response.documents.map(doc => {
          const { $id, query, yesNo, date, description } = doc;
          return { $id, query, yesNo, date, description };
        });
        setComplianceData(filteredDocuments);
        setIsGeneratingChecklist(false);
      }
    };
    generateITChecklistIfNeeded();
  }, [
    itChecklistGenerated,
    natureOfCompany,
    queryOptions,
    complianceData,
    startupId,
  ]);
  // --- END MAIN LOGIC ---

  const getDescriptionForYesNo = (yesNoValue: string, queryValue: string): string => {
    const formData = formsData.find((doc) => doc.query === queryValue);
    if (formData && formData.yesNo && Array.isArray(formData.yesNo) && formData.yesNo.length > 0) {
      const index = yesNoValue === 'Yes' ? 0 : 1;
      return formData.yesNo[index] || '';
    }
    return '';
  };

  const handleSaveCompliance = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (!editingCompliance) return;
    try {
      const allowedFields = ["query", "yesNo", "date", "description"];
      const updateData = Object.fromEntries(
        Object.entries(editingCompliance).filter(([key]) =>
          allowedFields.includes(key)
        )
      );
      await databases.updateDocument(STAGING_DATABASE_ID, INCOME_TAX_TABLE_ID, editingCompliance.$id, updateData);
      const updatedCompliances = complianceData.map(c => c.$id === editingCompliance.$id ? { ...c, ...updateData } : c);
      setComplianceData(updatedCompliances);
      setEditingCompliance(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving compliance data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompliance = async () => {
    if (!editingCompliance) return;
    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, INCOME_TAX_TABLE_ID, editingCompliance.$id);
      const updatedCompliances = complianceData.filter(c => c.$id !== editingCompliance.$id);
      setComplianceData(updatedCompliances);
      setEditingCompliance(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting compliance:", error);
    }
  };

  const handleEditYesNoChange = (value: string) => {
    if (editingCompliance) {
      const description = getDescriptionForYesNo(value, editingCompliance.query);
      setEditingCompliance({
        ...editingCompliance,
        yesNo: value,
        description: description,
      });
      setHasUnsavedChanges(true);
    }
  };

  // Determine if all documents are created
  const allDocumentsCreated =
    queryOptions.length > 0 &&
    queryOptions.every((query) =>
      complianceData.some((doc) => doc.query === query)
  );

  const closeDialog = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setEditingCompliance(null);
        setHasUnsavedChanges(false);
      }
    } else {
      setEditingCompliance(null);
    }
  }, [hasUnsavedChanges, setEditingCompliance]);


  return (
    <div>
      <div className="flex items-center space-x-2 p-2">
        <h3 className="text-lg font-medium">Income Tax Compliance</h3>
        {isGeneratingChecklist && (
            <span className="text-sm text-gray-500 border border-gray-50 p-1">
              generating queries..
            </span>
          )}
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Table>
          <TableCaption>Income Tax Compliance Information</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/3">Form Queries</TableHead>
              <TableHead>Yes/No</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-1/3">Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complianceData.map((row) => (
              <TableRow key={row.$id} onDoubleClick={() => setEditingCompliance(row)}>
                <TableCell>{row.query}</TableCell>
                <TableCell>{row.yesNo}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingCompliance && (
        <Dialog open={!!editingCompliance} onOpenChange={closeDialog}>
          <DialogContent className="w-full max-w-5xl">
            <DialogHeader>
              {editingCompliance.query && (
                <DialogTitle>
                  {editingCompliance.query}
                </DialogTitle>
              )}
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              <div>
                <Label htmlFor="edit-yesNo" className="text-right">Yes/No</Label>
                <Select value={editingCompliance.yesNo}
                  onValueChange={handleEditYesNoChange}>
                  <SelectTrigger id="edit-yesNo" className="col-span-3">
                    <SelectValue placeholder="Select Yes/No" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Yes">Yes</SelectItem>
                    <SelectItem value="No">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-date" className="text-right">Date</Label>
                <Input 
                id="edit-date" 
                type="month"
                max={new Date().toISOString().slice(0, 7)}
                value={editingCompliance.date} 
                onChange={(e) => {
                  setEditingCompliance({ ...editingCompliance, date: e.target.value })
                  setHasUnsavedChanges(true);
                }} 
                  className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Textarea id="edit-description" value={editingCompliance.description} 
                onChange={(e) => {
                  setEditingCompliance({ ...editingCompliance, description: e.target.value });
                  setHasUnsavedChanges(true);
                }} 
                  className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleDeleteCompliance} className="bg-white text-black border border-black hover:bg-neutral-200">Delete</Button>
              <Button onClick={handleSaveCompliance} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default IncomeTaxCompliance;

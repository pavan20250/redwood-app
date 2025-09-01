"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import { Query } from "appwrite";
import { API_ENDPOINT, PROJECT_ID, STAGING_DATABASE_ID, STARTUP_DATABASE, STARTUP_ID } from "@/appwrite/config";
import { client, databases, useIsStartupRoute } from "@/lib/utils";
import { ID, Storage, Databases } from "appwrite";

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
import { FUND_DOCUMENTS_ID } from "../FundingMilestonestabs/FundRaised";
import { Trash2, UploadCloud } from "lucide-react";
import { FaEye } from "react-icons/fa";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const GST_ID = "6739ce42002b5b5036a8";
export const MISC_COLLECTION_ID = "6810ae530025f9307c3b";

interface GstComplianceProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

const GstCompliance: React.FC<GstComplianceProps> = ({ startupId, setIsDirty }) => {
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [editingCompliance, setEditingCompliance] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [queryOptions, setQueryOptions] = useState<string[]>([]);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]); // Track missing documents
  const [natureOfCompany, setNatureOfCompany] = useState<string>("all");
  const [formsData, setFormsData] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [gstDocument, setGstDocument] = useState<{ fileId: string; fileName: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const storage = useMemo(() => new Storage(client), []);
  const [isDeletePopoverOpen, setIsDeletePopoverOpen] = useState(false);
  const [gstNumber, setGstNumber] = useState<string>("");
  const [gstDocId, setGstDocId] = useState<string | null>(null);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const isStartupRoute = useIsStartupRoute();
  const [gstChecklistGenerated, setGstChecklistGenerated] = useState<boolean | null>(null);
  const hasRunChecklist = useRef(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);
  
  useEffect(() => {
    const fetchComplianceData = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? GST_ID : GST_ID;

        const response = await databases.listDocuments(
          databaseId,
          collectionId,
          [Query.equal("startupId", startupId)]
        );
        const filteredDocuments = response.documents.map((doc) => {
          const { $id, query, yesNo, date, description } = doc;
          return { $id, query, yesNo, date, description };
        });
        setComplianceData(filteredDocuments);

        const startupResponse = await databases.getDocument(
          STAGING_DATABASE_ID,
          STARTUP_ID,
          startupId
        );
        setGstChecklistGenerated(startupResponse.gstChecklistGenerated ?? false);
      } catch (error) {
        console.error("Error fetching compliance data:", error);
      }
    };
    fetchComplianceData();
  }, [startupId, isStartupRoute]);

  // Fetch dynamic query options
  useEffect(() => {
    const fetchQueryOptions = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          FORMS_ID,
          [Query.equal("natureOfCompany", "all")]
        );
        const options = response.documents.map((doc) => doc.query);
        setQueryOptions(options);
        setFormsData(response.documents);
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

  // --- MAIN LOGIC: Auto-generate GST checklist if needed ---
  useEffect(() => {
    const generateGstChecklistIfNeeded = async () => {
      if (
        gstChecklistGenerated === false &&
        !hasRunChecklist.current &&
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
            GST_ID,
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
          { gstChecklistGenerated: true }
        );
        setGstChecklistGenerated(true);

        // Refresh compliance data
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          GST_ID,
          [Query.equal("startupId", startupId)]
        );
        const filteredDocuments = response.documents.map((doc) => {
          const { $id, query, yesNo, date, description } = doc;
          return { $id, query, yesNo, date, description };
        });
        setComplianceData(filteredDocuments);
        setIsGeneratingChecklist(false);
      }
    };
    generateGstChecklistIfNeeded();
  }, [
    gstChecklistGenerated,
    queryOptions,
    complianceData,
    startupId,
  ]);
  // --- END MAIN LOGIC ---

  // Function to get description based on yesNo value
  const getDescriptionForYesNo = (
    yesNoValue: string,
    queryValue: string
  ): string => {
    const formData = formsData.find((doc) => doc.query === queryValue);
    if (
      formData &&
      formData.yesNo &&
      Array.isArray(formData.yesNo) &&
      formData.yesNo.length > 0
    ) {
      const index = yesNoValue === "Yes" ? 0 : 1;
      return formData.yesNo[index] || ""; // Return corresponding description
    }
    return "";
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
      await databases.updateDocument(
        STAGING_DATABASE_ID,
        GST_ID,
        editingCompliance.$id,
        updateData
      );
      const updatedCompliances = complianceData.map((c) =>
        c.$id === editingCompliance.$id ? { ...c, ...updateData } : c
      );
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
      await databases.deleteDocument(
        STAGING_DATABASE_ID,
        GST_ID,
        editingCompliance.$id
      );
      const updatedCompliances = complianceData.filter(
        (c) => c.$id !== editingCompliance.$id
      );
      setComplianceData(updatedCompliances);
      setEditingCompliance(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting compliance:", error);
    }
  };

  const handleEditYesNoChange = (value: string) => {
    if (editingCompliance) {
      const description = getDescriptionForYesNo(
        value,
        editingCompliance.query
      );
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

  const handleGstDocumentUpload = async (file: File) => {
    setUploading(true);
    try {
      // 1. Upload file to storage bucket
      const fileId = ID.unique();
      const storageRes = await storage.createFile(
        FUND_DOCUMENTS_ID,
        fileId,
        file
      );
  
      // 2. Check if a document already exists for this startupId and type
      const existingDocs = await databases.listDocuments(
        STAGING_DATABASE_ID,
        MISC_COLLECTION_ID,
        [
          Query.equal("startupId", startupId),
          Query.equal("type", "GST_DOCUMENT"),
        ]
      );
  
      if (existingDocs.documents.length > 0) {
        // 3a. Update existing document with new fileId and fileName
        const docId = existingDocs.documents[0].$id;
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          MISC_COLLECTION_ID,
          docId,
          {
            fileId: storageRes.$id,
            fileName: storageRes.name,
          }
        );
        setGstDocument({ fileId: storageRes.$id, fileName: storageRes.name });
      } else {
        // 3b. Create new document if none exists
        const newDoc = await databases.createDocument(
          STAGING_DATABASE_ID,
          MISC_COLLECTION_ID,
          ID.unique(),
          {
            startupId,
            type: "GST_DOCUMENT",
            fileId: storageRes.$id,
            fileName: storageRes.name,
          }
        );
        setGstDocument({ fileId: storageRes.$id, fileName: storageRes.name });
      }
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };
  

  useEffect(() => {
    const fetchGstDocument = async () => {
      try {
        const res = await databases.listDocuments(
          STAGING_DATABASE_ID,
          MISC_COLLECTION_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("type", "GST_DOCUMENT"),
          ]
        );
        if (res.documents.length > 0) {
          const doc = res.documents[0];
          setGstDocument({
            fileId: doc.fileId,
            fileName: doc.fileName,
          });
          setGstNumber(doc.gstNumber || "");  // Assuming gstNumber field in document
          setGstDocId(doc.$id);
        } else {
          // No document found, clear state
          setGstDocument(null);
          setGstNumber("");
          setGstDocId(null);
        }
      } catch (err) {
        console.error("Error fetching GST document", err);
      }
    };
    fetchGstDocument();
  }, [startupId]);
  

  const handleDeleteGstDocument = async () => {
    if (!gstDocument) return;
    setUploading(true);
    try {
      await storage.deleteFile(FUND_DOCUMENTS_ID, gstDocument.fileId);
      const res = await databases.listDocuments(
        STAGING_DATABASE_ID,
        MISC_COLLECTION_ID,
        [
          Query.equal("startupId", startupId),
          Query.equal("type", "GST_DOCUMENT"),
          Query.equal("fileId", gstDocument.fileId),
        ]
      );
  
      if (res.documents.length > 0) {
        const docId = res.documents[0].$id;
        // Update document to remove fileId and fileName
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          MISC_COLLECTION_ID,
          docId,
          {
            fileId: null,
            fileName: null,
          }
        );
      }
      // 3. Update local state to reflect no uploaded document
      setGstDocument(null);
    } catch (error) {
      console.error("Error deleting uploaded file:", error);
    } finally {
      setUploading(false);
    }
  };
  

  const saveGstNumber = async (newGstNumber: string) => {
    if (!gstDocId) {
      // Create new document if none exists
      try {
        const newDoc = await databases.createDocument(
          STAGING_DATABASE_ID,
          MISC_COLLECTION_ID,
          ID.unique(),
          {
            startupId,
            type: "GST_DOCUMENT",
            gstNumber: newGstNumber,
            fileId: gstDocument?.fileId || null,
            fileName: gstDocument?.fileName || null,
          }
        );
        setGstDocId(newDoc.$id);
      } catch (error) {
        console.error("Error creating GST document:", error);
      }
    } else {
      // Update existing document
      try {
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          MISC_COLLECTION_ID,
          gstDocId,
          { gstNumber: newGstNumber }
        );
      } catch (error) {
        console.error("Error updating GST number:", error);
      }
    }
  };

  const handleGstNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGstNumber(value);
  
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      saveGstNumber(value);
    }, 500); // 500ms debounce
  };


  return (
    <div>
      <div className="flex items-center space-x-2 p-2">
        <h3 className="text-lg font-medium">GST Compliance</h3>
        {isGeneratingChecklist && (
            <span className="text-sm text-gray-500 border border-gray-50 p-1">
              generating queries..
            </span>
          )}
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <div className="flex gap-2">
        <div>
          <Label>GST Number</Label>
          <Input 
            type="text"
            placeholder="00-AAAAA-0000-A-0-AA"
            value={gstNumber}
            onChange={handleGstNumberChange}
          />
        </div>

        <div>
          <Label>Upload Document</Label>
          <div className="flex items-center space-x-2">
            {gstDocument && gstDocument.fileId && gstDocument.fileName ? (
              <>
                <a
                  href={`${API_ENDPOINT}/storage/buckets/${FUND_DOCUMENTS_ID}/files/${gstDocument.fileId}/view?project=${PROJECT_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline"
                >
                  <div className="relative group">
                    <FaEye size={20} className="inline" />
                    <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded-md py-1 px-2">
                      View & Download
                    </span>
                  </div>
                </a>
                <span className="text-xs text-gray-500">{gstDocument.fileName}</span>
                <Popover open={isDeletePopoverOpen} onOpenChange={setIsDeletePopoverOpen}>
                  <PopoverTrigger asChild>
                    <Trash2 size={16} className="text-gray-500 cursor-pointer hover:text-red-600" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteGstDocument}
                      className="flex items-center"
                      disabled={uploading}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete File
                    </Button>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf"
                  disabled={uploading}
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0]) {
                      await handleGstDocumentUpload(e.target.files[0]);
                    }
                  }}
                />
                <UploadCloud size={20} className="cursor-pointer" />
              </label>
            )}
          </div>
        </div>
        </div>
        <Table>
          <TableCaption>GST Compliance Information</TableCaption>
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
              <TableRow
                key={row.$id}
                onDoubleClick={() => setEditingCompliance(row)}
              >
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
        <Dialog
          open={!!editingCompliance}
          onOpenChange={closeDialog}
        >
          <DialogContent className="w-full max-w-5xl p-6">
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
                <Label htmlFor="edit-yesNo" className="text-right">
                  Yes/No
                </Label>
                <Select
                  value={editingCompliance.yesNo}
                  onValueChange={handleEditYesNoChange}
                >
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
                <Label htmlFor="edit-date" className="text-right">
                  Date
                </Label>
                <Input
                  id="edit-date"
                  type="month"
                  max={new Date().toISOString().slice(0, 7)}
                  value={editingCompliance.date}
                  onChange={(e) => {
                    setEditingCompliance({
                      ...editingCompliance,
                      date: e.target.value,
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="col-span-3"
                />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit-description"
                  value={editingCompliance.description}
                  onChange={(e) => {
                    setEditingCompliance({
                      ...editingCompliance,
                      description: e.target.value,
                    });
                    setHasUnsavedChanges(true);
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleDeleteCompliance}
                className="bg-white text-black border border-black hover:bg-neutral-200"
              >
                Delete
              </Button>
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

export default GstCompliance;

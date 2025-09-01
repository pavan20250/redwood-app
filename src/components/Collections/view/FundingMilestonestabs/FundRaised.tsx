"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { InfoIcon, PlusCircle, Trash2, UploadCloud } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Storage, ID } from "appwrite";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, PROJECT_ID, API_ENDPOINT, PROJECTS_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, client, useIsStartupRoute } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FaEye } from "react-icons/fa";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ButtonWithIcon from "@/lib/addButton";

export const FUND_RAISED_ID = "6731e2fb000d9580025f";
export const FUND_DOCUMENTS_ID = "6768e93900004c965d26";

interface FundRaisedSoFarProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

interface Investment {
  mode: string;
  date: string;
  amount: string;
  description: string;
  startupId?: string;
  $id?: string;
  $createdAt?: string;
  $updatedAt?: string;
  $permissions?: string[];
  $databaseId?: string;
  $collectionId?: string;
  fileId?: string;
  fileName?: string;
}

const FundRaisedSoFar: React.FC<FundRaisedSoFarProps> = ({ startupId, setIsDirty }) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [otherMode, setOtherMode] = useState<string>("");
  const storage = useMemo(() => new Storage(client), []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [receivedDate, setReceivedDate] = useState<string | null>(null);
  const isStartupRoute = useIsStartupRoute();


  const fetchInvestments = useCallback(async () => {
    try {
      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? FUND_RAISED_ID : FUND_RAISED_ID;
      
      const response = await databases.listDocuments(databaseId, collectionId, [
        Query.equal("startupId", startupId),
      ]);
      setInvestments(response.documents as Investment[]);
    } catch (error) {
      console.error("Error fetching investments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch investments. Please try again.",
        variant: "destructive",
      });
    }
  }, [startupId, toast, isStartupRoute]);

  const fetchReceivedDate = useCallback(async () => {
    try {
      const response = await databases.listDocuments(
        STAGING_DATABASE_ID,
        PROJECTS_ID,
        [Query.equal("startupId", startupId)]
      );
      
      if (response.documents.length > 0) {
        setReceivedDate(response.documents[0].receivedDate);
      } else {
        // Handle no project found silently
        setReceivedDate("");
        console.warn("No project found for this startup ID:", startupId);
      }
    } catch (error) {
      console.error("Error fetching project:", error);
    }
  }, [startupId]);
  

  useEffect(() => {
    const fetchData = async () => {
      await fetchReceivedDate();
      await fetchInvestments(); 
    };
    fetchData();
  }, [fetchReceivedDate, fetchInvestments]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  const handleAddOrUpdateInvestment = async () => {
    if (!selectedInvestment) return;

    const modeToSave = selectedInvestment.mode === "Other" ? otherMode : selectedInvestment.mode;

    if (!selectedInvestment.mode) {
      toast({
        title: "Error",
        description: "Mode of Investment is required.",
        variant: "destructive",
      });
      return;
    }
    if (!selectedInvestment.amount) {
      toast({
        title: "Error",
        description: "Investment Amount is required.",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting) return; // Prevent duplicate submission
    setIsSubmitting(true);

    try {
      const { $id, $createdAt, $updatedAt, $permissions, $databaseId, $collectionId, ...cleanInvestment } = selectedInvestment;
      
      if (isEditMode && $id) {
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          FUND_RAISED_ID,
          $id,
          { ...cleanInvestment, mode: modeToSave }
        );
        toast({
          title: "Investment updated",
          description: "The investment has been successfully updated.",
        });
      } else {
        await databases.createDocument(
          STAGING_DATABASE_ID,
          FUND_RAISED_ID,
          ID.unique(),
          { ...cleanInvestment, startupId, mode: modeToSave }
        );
        toast({
          title: "Investment added",
          description: "A new investment has been successfully added.",
        });
      }
      setIsDialogOpen(false);
      setHasUnsavedChanges(false);
      fetchInvestments();
    } catch (error) {
      console.error("Error adding/updating investment:", error);
      toast({
        title: "Error",
        description: "Failed to add/update the investment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false); 
    }
  };

  const handleDeleteInvestment = async () => {
    if (!selectedInvestment || !selectedInvestment.$id) return;

    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, FUND_RAISED_ID, selectedInvestment.$id);
      toast({
        title: "Investment deleted",
        description: "The investment has been successfully deleted.",
      });
      setIsDialogOpen(false);
      fetchInvestments();
    } catch (error) {
      console.error("Error deleting investment:", error);
      toast({
        title: "Error",
        description: "Failed to delete the investment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUploadFile = async (index: number, file: File) => {
    const documentId = investments[index].$id;
    if (!documentId) return;
    setIsUploading(true);

    try {
      const uploadResponse = await storage.createFile(FUND_DOCUMENTS_ID, ID.unique(), file);
      await databases.updateDocument(STAGING_DATABASE_ID, FUND_RAISED_ID, documentId, {
        fileId: uploadResponse.$id,
        fileName: file.name,
      });
      fetchInvestments();
      toast({
        title: "Document upload successful",
        description: "Your document has been uploaded successfully!",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Error",
        description: "Failed to upload the document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const openDialog = (investment: Investment | null = null, edit: boolean = false) => {
    setSelectedInvestment(investment || {
      mode: "",
      date: "",
      amount: "",
      description: "",
    });
    setIsEditMode(edit);
    setIsDialogOpen(true);
    setOtherMode(investment?.mode === 'Other' ? investment.mode : '');
    setHasUnsavedChanges(false);
  };

  const closeDialog = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsDialogOpen(false);
        setHasUnsavedChanges(false);
      }
    } else {
      setIsDialogOpen(false);
    }
  };


  const calculateTotalInvestment = (investments: Investment[]): number => {
    return investments.reduce((total, investment) => {
      const amount = parseFloat(investment.amount.replace(/[^0-9.-]+/g, ""));
      return total + (isNaN(amount) ? 0 : amount);
    }, 0);
  };
  
  const handleDeleteFile = async (documentId: string, fileId: string) => {
    try {
      await storage.deleteFile(FUND_DOCUMENTS_ID, fileId);
      await databases.updateDocument(STAGING_DATABASE_ID, FUND_RAISED_ID, documentId, {
        fileId: null,
        fileName: null,
      });
      fetchInvestments();
      toast({
        title: "File deleted",
        description: "The file has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error",
        description: "Failed to delete the file. Please try again.",
        variant: "destructive",
      });
    }
  };
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB").format(date);
  };
  const handleUploadFileForDialog = async (file: File) => {
    if (!selectedInvestment || !file) return;
  
    try {
      const uploadResponse = await storage.createFile(FUND_DOCUMENTS_ID, ID.unique(), file);
  
      setSelectedInvestment({
        ...selectedInvestment,
        fileId: uploadResponse.$id,
        fileName: file.name,
      });
  
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully!",
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "File Size should not Exceed 5Mb",
        description: "Failed to upload the document. Please try again.",
        variant: "destructive",
      });
    } 
  };

  return (
    <div>
      <div className="flex">
        <h3 className="container text-lg font-medium mb-2 -mt-4">Funds Raised So Far</h3>
        <div className="justify-end" onClick={() => openDialog()}>
          { !isStartupRoute && (
          <ButtonWithIcon label="Add" />
          )}
        </div>
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Table>
          <TableCaption>A list of recent investments</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Mode of Investment</TableHead>
              <TableHead>Investment Date</TableHead>
              <TableHead className="w-28">Investment Amount (INR)</TableHead>
              <TableHead className="w-96">Description</TableHead>
              <TableHead className="w-40">Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investments.map((investment, index) => (
              <TableRow key={investment.$id} onDoubleClick={() => openDialog(investment, true)}>
                <TableCell>{investment.mode}</TableCell>
                <TableCell>{formatDate(investment.date)}</TableCell>
                <TableCell className="text-right">{investment.amount}</TableCell>
                <TableCell>{investment.description}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {investment.fileId ? (
                      <>
                      <a
                        href={`${API_ENDPOINT}/storage/buckets/${FUND_DOCUMENTS_ID}/files/${investment.fileId}/view?project=${PROJECT_ID}`}
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
                      <span className="text-xs text-gray-500">{investment.fileName}</span>
                      <Popover>
                        <PopoverTrigger>
                          <InfoIcon size={16} className="text-gray-500 cursor-pointer" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteFile(investment.$id!, investment.fileId!)}
                          className="flex items-center"
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
                          onChange={(e) => e.target.files && handleUploadFile(index, e.target.files[0])}
                        />
                        <UploadCloud size={20} className="cursor-pointer" />
                      </label>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell colSpan={2} className="text-right">Total Investment Amount</TableCell>
              <TableCell className="text-right">
                {calculateTotalInvestment(investments).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0  })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="w-full max-w-5xl p-6">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Funds Raised So Far" : "Add New Funds Raised So Far"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Edit the details of the investment." : "Fill out the details to add New Funds Raised So Far"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
                <Label>Mode of Investment<span className="text-red-500">*</span></Label>
                <Select
                  value={selectedInvestment?.mode || ""}
                  onValueChange={(value) => {
                    setSelectedInvestment({
                      ...selectedInvestment,
                      mode: value,
                    } as Investment);
                    setHasUnsavedChanges(true);
                    if (value !== "Other") {
                      setOtherMode(""); 
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Equity">Equity</SelectItem>
                    <SelectItem value="CCPS">CCPS</SelectItem>
                    <SelectItem value="CCD">CCD</SelectItem>
                    <SelectItem value="OCD">OCD</SelectItem>
                    <SelectItem value="SAFE Notes">SAFE Notes</SelectItem>
                    <SelectItem value="Grant">Grant</SelectItem>
                    <SelectItem value="Secured Debt">Secured Debt</SelectItem>
                    <SelectItem value="Unsecured Debt">Unsecured Debt</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                {selectedInvestment?.mode === "Other" && (
                  <div>
                  <Label>Specify Other Mode<span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="Enter mode of investment"
                    value={otherMode}
                    onChange={(e) => {
                      setOtherMode(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                  />
                  </div>
                )}
              <div>
                <Label>Investment Date</Label>
                <Input
                  type="date"
                  max={receivedDate || new Date().toISOString().split('T')[0]}
                  value={selectedInvestment?.date || ""}
                  onChange={(e) => {
                    setSelectedInvestment({
                      ...selectedInvestment,
                      date: e.target.value,
                    } as Investment);
                    setHasUnsavedChanges(true);
                  }} 
                  />
              </div>
              <div>
                <Label>Investment Amount (INR)<span className="text-red-500">*</span></Label>
                <Input
                  type="text"
                  required
                  placeholder="Enter the amount"
                  value={selectedInvestment?.amount || ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/[^0-9]/g, '');
                    const formattedValue = new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  }).format(Number(rawValue) || 0);
                  setSelectedInvestment({ ...selectedInvestment, amount: formattedValue } as Investment);
                  setHasUnsavedChanges(true);
                  }}
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Enter a description for the investment"
                  value={selectedInvestment?.description || ""}
                  onChange={(e) => {
                    setSelectedInvestment({ ...selectedInvestment, description: e.target.value } as Investment);
                    setHasUnsavedChanges(true);
                  }}
                  
                />
              </div>
              {/* File Upload */}
              <div className="mt-4">
                <Label>Upload Document</Label>
                <div className="flex items-center space-x-2">
                  {selectedInvestment?.fileId ? (
                  <>
                  {/* View & Download Link */}
                  <a
                    href={`${API_ENDPOINT}/storage/buckets/${FUND_DOCUMENTS_ID}/files/${selectedInvestment.fileId}/view?project=${PROJECT_ID}`}
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
                   {/* File Name */}
                  <span className="text-xs text-gray-500">{selectedInvestment.fileName}</span>
                  </>
                  ) : (
                      // Upload New File Input
                      <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleUploadFileForDialog(e.target.files[0]);
                        }
                        }}
                      />
                      <UploadCloud size={20} className="cursor-pointer" />
                      </label>
                      )}
                    </div>
                  </div>
            </div>
          </div>
          <DialogFooter>
            {isEditMode && (
              <Button onClick={handleDeleteInvestment} className="bg-white text-black border border-black hover:bg-neutral-200">
                Delete
              </Button>
            )}
            <Button onClick={handleAddOrUpdateInvestment} disabled={isSubmitting || isUploading}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FundRaisedSoFar;

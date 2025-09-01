"use client";

import React, { useState, useEffect, useMemo, useCallback, useContext, useRef } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { PlusCircle, Trash2, UploadCloud, CheckCircle, Circle, MessageCircle, Key, Eye, EyeOff } from "lucide-react";
import { Query, ID, Storage } from "appwrite";
import appwriteService, { STAGING_DATABASE_ID, PROJECT_ID, API_ENDPOINT, STARTUP_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, client, useIsStartupRoute } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { FaEye } from 'react-icons/fa';
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import jsPDF from 'jspdf';
import ButtonWithIcon from "@/lib/addButton";

export const DOC_CHECKLIST_ID = "673c200b000a415bbbad";
const BUCKET_ID = "66eb0cfc000e821db4d9";
const DOCUMENT_OPTIONS_COLLECTION_ID = "67b4b97900371c532d9a";

interface Credentials {
  username: string;
  password: string;
}

interface DocChecklistProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

interface Document {
  [key: string]: any;
}

const DocumentChecklist: React.FC<DocChecklistProps> = ({ startupId, setIsDirty }) => {
  const [docData, setDocData] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [newDoc, setNewDoc] = useState({
    docName: "",
    docType: "",
    status: "",
    description: "",
    financialYear: "",
  });

  const [natureOfCompany, setNatureOfCompany] = useState<string>("LLP");
  const [fetchedDocumentOptions, setFetchedDocumentOptions] = useState<any[]>([]);

  const storage = useMemo(() => new Storage(client), []);
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [newComment, setNewComment] = useState("");
  const [isCommentDialogOpen, setIsCommentDialogOpen] = useState(false);
  const [newDocFile, setNewDocFile] = useState<File | null>(null); 
  const [editingDocFile, setEditingDocFile] = useState<File | null>(null);
  const [isCreatingDocuments, setIsCreatingDocuments] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name?: string; email?: string } | null>(null);
  const isStartupRoute = useIsStartupRoute();

  const [checklistGenerated, setChecklistGenerated] = useState<boolean | null>(null);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);

  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [selectedCredentialDoc, setSelectedCredentialDoc] = useState<any>(null);
  const [credentials, setCredentials] = useState<Credentials>({
    username: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);

  // required field validation function
  const isFormValid = useMemo(() => {
    return newDoc.docName.trim() !== "" && newDoc.docType.trim() !== "";
  }, [newDoc.docName, newDoc.docType]);

  useEffect(() => {
    // Fetch current user on mount
    const fetchCurrentUser = async () => {
      try {
        const user = await appwriteService.getCurrentUser();
        setCurrentUser(user);
      } catch (error) {
        setCurrentUser(null);
      }
    };
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? DOC_CHECKLIST_ID : DOC_CHECKLIST_ID;

        const response = await databases.listDocuments(databaseId, collectionId, [
          Query.equal("startupId", startupId),
        ]);
        setDocData(response.documents);

        //Fetch natureOfCompany from Startups
        const startupResponse = await databases.getDocument(
          STAGING_DATABASE_ID,
          STARTUP_ID,
          startupId
        )
        setNatureOfCompany(startupResponse.natureOfCompany);
      } catch (error) {
        console.error("Error fetching document data:", error);
      }
    };
    
    //fetch Document checklist options
    const fetchDocumentOptions = async () => {
      try {
        let allDocuments: Document[] = [];
        let hasMoreDocuments = true;
        let offset = 0;
        const limit = 100;
    
        while (hasMoreDocuments) {
          const response = await databases.listDocuments(
            STAGING_DATABASE_ID,
            DOCUMENT_OPTIONS_COLLECTION_ID,
            [
              Query.limit(limit), 
              Query.offset(offset),
            ]
          );
          // Add the fetched documents to the array
          allDocuments = [...allDocuments, ...response.documents];
    
          // Check if there are more documents to fetch
          if (response.documents.length < limit) {
            hasMoreDocuments = false; 
          } else {
            offset += limit; // Move to the next batch
          }
        }
        // Store all fetched documents in state
        setFetchedDocumentOptions(allDocuments);
      } catch (error) {
        console.error("Error fetching document options:", error);
      }
    };
    fetchDocumentOptions();
    
    fetchDocuments();
  }, [startupId, isStartupRoute]);

  // Fetch startup meta (including checklistGenerated)
  useEffect(() => {
    const fetchStartupMeta = async () => {
      try {
        const startup = await databases.getDocument(
          STAGING_DATABASE_ID,
          STARTUP_ID,
          startupId
        );
        setNatureOfCompany(startup.natureOfCompany);
        setChecklistGenerated(startup.checklistGenerated ?? false);
      } catch (error) {
        console.error("Error fetching startup meta:", error);
        setChecklistGenerated(false); // fallback
      }
    };
    fetchStartupMeta();
  }, [startupId]);
  
  // Function to handle file selection for new document
  const handleSaveDocument = async () => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    try {
      let fileId = null;
      let fileName = null;

      // Upload file
      if (newDocFile) {
        try {
          const uploadResponse = await storage.createFile(BUCKET_ID, ID.unique(), newDocFile);
          fileId = uploadResponse.$id;
          fileName = newDocFile.name;
        } catch (uploadError) {
          console.error("Error uploading document:", uploadError);
          toast({
            title: "Document Upload Error",
            description: "File Size should not Exceed 5Mb",
            variant: "destructive",
          });
          return; 
        }
      }
      const response = await databases.createDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, ID.unique(), {
        ...newDoc,
        startupId,
        fileId,
        fileName,
      });
      setDocData([...docData, response]);
      setNewDoc({ docName: "", docType: "", status: "", description: "", financialYear: "" });
      setIsAddDialogOpen(false);
      setNewDocFile(null);
      toast({
        title: "Document added",
        description: "A new document has been added to the checklist.",
      });
    } catch (error) {
      console.error("Error adding document data:", error);
      toast({
        title: "Error",
        description: "Failed to add the new document.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleEditDocument = async () => {
    setIsSavingEdit(true);
    try {
      let updatedFields = { ...editingDoc };

      if (editingDocFile) {
        const uploadResponse = await storage.createFile(BUCKET_ID, ID.unique(), editingDocFile);
        updatedFields.fileId = uploadResponse.$id;
        updatedFields.fileName = editingDocFile.name;
      }
      const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...validFields } = editingDoc;
      await databases.updateDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, $id, validFields);
      const updatedData = docData.map(doc => doc.$id === editingDoc.$id ? { ...doc, ...validFields } : doc);
      setDocData(updatedData);
      setEditingDoc(null);
      setEditingDocFile(null);
      setIsEditDialogOpen(false);
      toast({
        title: "Document updated",
        description: "The document has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating document data:", error);
      toast({
        title: "Error",
        description: "Failed to update the document.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
      setHasUnsavedChanges(false);
    }
  };

  const handleDeleteDocument = async () => {
    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, editingDoc.$id);
      const updatedData = docData.filter(doc => doc.$id !== editingDoc.$id);
      setDocData(updatedData);
      setIsEditDialogOpen(false);
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({
        title: "Error",
        description: "Failed to delete the document.",
        variant: "destructive",
      });
    }
  };

  const handleUploadFile = async (index: number, file: File) => {
    const documentId = docData[index].$id;
    if (!documentId) return;

    try {
        const uploadResponse = await storage.createFile(BUCKET_ID, ID.unique(), file);
        if (uploadResponse && uploadResponse.$id) {
            const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...validFields } = docData[index];
            const updatedDoc = {
                ...validFields,
                fileId: uploadResponse.$id,
                fileName: file.name,
            };
            await databases.updateDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, documentId, updatedDoc);

            // Update the local state
            const updatedDocData = [...docData];
            updatedDocData[index] = { ...updatedDocData[index], ...updatedDoc };
            setDocData(updatedDocData);

            toast({
                title: "Document upload successful",
                description: "Your document has been uploaded successfully!",
            });
        } else {
            throw new Error("Invalid upload response");
        }
    } catch (error) {
        console.error("Error uploading file:", error);
        toast({
            title: "File Size should not Exceed 5Mb",
            description: "Failed to upload the document. Please try again.",
            variant: "destructive",
        });
    }
  };


  const handleDeleteFile = async (documentId: string, fileId: string) => {
    try {
      await storage.deleteFile(BUCKET_ID, fileId);
      await databases.updateDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, documentId, {
        fileId: null,
        fileName: null
      });
      const updatedDocData = docData.map(doc => 
        doc.$id === documentId ? { ...doc, fileId: null, fileName: null } : doc
      );
      setDocData(updatedDocData);
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

  // Function to toggle verification status
  const handleToggleVerify = async (documentId: string, isVerified: boolean) => {
    try {
      const updatedFields: any = {
        verified: !isVerified,
      };
  
      // If verifying, set verifiedBy to current user's name, else clear it
      if (!isVerified && currentUser?.name) {
        updatedFields.verifiedBy = currentUser.name;
      } else if (isVerified) {
        updatedFields.verifiedBy = null;
      }
  
      // Update the document in the database
      await databases.updateDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, documentId, updatedFields);
  
      // Update local state
      const updatedDocData = docData.map((doc) =>
        doc.$id === documentId ? { ...doc, ...updatedFields } : doc
      );
      setDocData(updatedDocData);
  
      toast({
        title: "Verification Updated",
        description: `Document has been ${!isVerified ? "verified" : "unverified"}.`,
      });
    } catch (error) {
      console.error("Error updating verification status:", error);
      toast({
        title: "Error",
        description: "Failed to update verification status.",
        variant: "destructive",
      });
    }
  };
  

  // Function to handle adding a comment
  const handleAddComment = async () => {
    if (!selectedDoc || !newComment.trim()) return;

    try {
      // Update comments in the database
      const updatedComments = [...(selectedDoc.comments || []), newComment];
      await databases.updateDocument(STAGING_DATABASE_ID, DOC_CHECKLIST_ID, selectedDoc.$id, {
        comments: updatedComments,
      });

      // Update local state
      const updatedDocData = docData.map((doc) =>
        doc.$id === selectedDoc.$id ? { ...doc, comments: updatedComments } : doc
      );
      setDocData(updatedDocData);

      // Reset state
      setNewComment("");
      setIsCommentDialogOpen(false);
      toast({
        title: "Comment Added",
        description: "Your comment has been added successfully.",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Helper: get required doc names
  const requiredDocNames = useMemo(
    () =>
      fetchedDocumentOptions
        .filter((doc: any) => doc.natureOfCompany?.includes(natureOfCompany))
        .map((doc: any) => doc.docName),
    [fetchedDocumentOptions, natureOfCompany]
  );
  const createdDocNames = useMemo(
    () => docData.map((doc: any) => doc.docName),
    [docData]
  );
  const allDocsCreated = useMemo(
    () => requiredDocNames.every((docName) => createdDocNames.includes(docName)),
    [requiredDocNames, createdDocNames]
  );

  // --- MAIN LOGIC: Auto-generate checklist ---
  const hasRunChecklist = useRef(false);
  useEffect(() => {
    const generateChecklistIfNeeded = async () => {
      // Only run if not already generated and not running
      if (
        checklistGenerated === false &&
        !hasRunChecklist.current &&
        natureOfCompany &&
        fetchedDocumentOptions.length > 0
      ) {
        hasRunChecklist.current = true;
        setIsGeneratingChecklist(true);
        // 1. Generate missing docs
        const applicableDocs = fetchedDocumentOptions.filter((doc) =>
          doc.natureOfCompany?.includes(natureOfCompany)
        );
        for (const docOption of applicableDocs) {
          const exists = docData.some((doc) => doc.docName === docOption.docName);
          if (!exists) {
            try {
              await databases.createDocument(
                STAGING_DATABASE_ID,
                DOC_CHECKLIST_ID,
                ID.unique(),
                {
                  docName: docOption.docName,
                  docType: docOption.docType,
                  status: "Pending",
                  description: docOption.description || "",
                  financialYear: "",
                  startupId,
                }
              );
            } catch (error) {
              console.error("Error creating document:", error);
            }
          }
        }
        // 2. Mark checklist as generated in Startups collection
        try {
          await databases.updateDocument(
            STAGING_DATABASE_ID,
            STARTUP_ID,
            startupId,
            { checklistGenerated: true }
          );
          setChecklistGenerated(true);
        } catch (error) {
          console.error("Error updating checklistGenerated:", error);
        }
        // 3. Refresh document checklist
        try {
          const updatedDocs = await databases.listDocuments(
            STAGING_DATABASE_ID,
            DOC_CHECKLIST_ID,
            [Query.equal("startupId", startupId)]
          );
          setDocData(updatedDocs.documents);
        } catch (error) {
          console.error("Error refreshing checklist:", error);
        }
        setIsGeneratingChecklist(false);
      }
    };
    generateChecklistIfNeeded();
  }, [
    checklistGenerated,
    natureOfCompany,
    fetchedDocumentOptions,
    docData,
    startupId,
  ]);
  // --- END MAIN LOGIC ---


  const closeDialog = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsEditDialogOpen(false);
        setHasUnsavedChanges(false);
      }
    } else {
      setIsEditDialogOpen(false);
    }
  }, [hasUnsavedChanges, setIsEditDialogOpen]);
  

  // Function to generate PDF from credentials
  const generateCredentialsPDF = async (docName: string, credentials: Credentials) => {
    const doc = new jsPDF({
      encryption: {
        userPassword: "!@#$%^&*()",
        ownerPassword: "!@#$%^&*()",
        userPermissions: ["print", "modify", "copy", "annot-forms"]
      }
    });
    
    // title
    doc.setFontSize(16);
    doc.text(docName, 20, 20);
    
    // credentials
    doc.setFontSize(12);
    doc.text(`Username: ${credentials.username}`, 20, 40);
    doc.text(`Password: ${credentials.password}`, 20, 50);
    
    // timestamp
    const timestamp = new Date().toLocaleString();
    doc.setFontSize(10);
    doc.text(`Generated on: ${timestamp}`, 20, 70);
    
    // Convert to blob
    const pdfBlob = doc.output('blob');
    return new File([pdfBlob], `${docName.replace(/\s+/g, '_')}_credentials.pdf`, { type: 'application/pdf' });
  };

  // Function to handle credentials submission
  const handleCredentialsSubmit = async () => {
    if (!selectedCredentialDoc || !credentials.username || !credentials.password) return;
    
    setIsSavingCredentials(true);
    try {
      // Generate PDF
      const pdfFile = await generateCredentialsPDF(selectedCredentialDoc.docName, credentials);
      
      // Upload PDF to storage
      const uploadResponse = await storage.createFile(BUCKET_ID, ID.unique(), pdfFile);
      
      // Update document with file information
      await databases.updateDocument(
        STAGING_DATABASE_ID,
        DOC_CHECKLIST_ID,
        selectedCredentialDoc.$id,
        {
          fileId: uploadResponse.$id,
          fileName: pdfFile.name,
          status: "Received"
        }
      );

      // Update local state
      const updatedDocData = docData.map(doc =>
        doc.$id === selectedCredentialDoc.$id
          ? {
              ...doc,
              fileId: uploadResponse.$id,
              fileName: pdfFile.name,
              status: "Received"
            }
          : doc
      );
      setDocData(updatedDocData);

      // Reset state and close dialog
      setCredentials({ username: "", password: "" });
      setSelectedCredentialDoc(null);
      setIsCredentialsDialogOpen(false);

      toast({
        title: "Credentials saved",
        description: "Your credentials have been securely saved as a PDF.",
      });
    } catch (error) {
      console.error("Error saving credentials:", error);
      toast({
        title: "Error",
        description: "Failed to save credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Function to check if document requires credentials
  const requiresCredentials = (docName: string) => {
    return docName === "GST Portal Login and Password" || 
           docName === "Income Tax Login and Password";
  };

  const closeAddDialog = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsAddDialogOpen(false);
        setHasUnsavedChanges(false);
        setNewDoc({
          docName: "",
          docType: "",
          status: "",
          description: "",
          financialYear: "",
        });
        setNewDocFile(null);
      }
    } else {
      setIsAddDialogOpen(false);
      setNewDoc({
        docName: "",
        docType: "",
        status: "",
        description: "",
        financialYear: "",
      });
      setNewDocFile(null);
    }
  }, [hasUnsavedChanges]);

  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 mb-2">
          <h3 className="text-lg font-medium">Document Checklist</h3>
          {isGeneratingChecklist && (
            <span className="text-sm text-gray-500 border border-gray-50 p-1">generating checklist..</span>
          )}
        </div>
        <ButtonWithIcon label="Add Custom Document" onClick={() => setIsAddDialogOpen(true)} />
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Table>
          <TableCaption>A list of documents for the startup.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Financial Year</TableHead>
              <TableHead className="w-auto">Description</TableHead>
              <TableHead className="w-44">Documents</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {docData.map((row, index) => (
              <TableRow
                key={row.$id}
                onDoubleClick={() => {
                  setEditingDoc(row);
                  setIsEditDialogOpen(true);
                }}
              >
                <TableCell>{row.docName}</TableCell>
                <TableCell>{row.docType}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.financialYear}</TableCell>
                <TableCell>{row.description}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-start space-x-4">
                    {requiresCredentials(row.docName) ? (
                      <>
                        {row.fileId ? (
                          <>
                            <a
                              href={`${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${row.fileId}/view?project=${PROJECT_ID}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              <div className="relative group">
                                <FaEye size={20} className="inline" />
                                <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded-md py-1 px-2">
                                  View Credentials
                                </span>
                              </div>
                            </a>
                            <span className="text-xs text-gray-500">{row.fileName}</span>
                            <Popover>
                              <PopoverTrigger>
                                <Trash2 size={16} className="text-gray-500 cursor-pointer" />
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleDeleteFile(row.$id, row.fileId)}
                                  className="flex items-center"
                                >
                                  <Trash2 size={16} className="mr-2" />
                                  Delete File
                                </Button>
                              </PopoverContent>
                            </Popover>
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCredentialDoc(row);
                                  setIsCredentialsDialogOpen(true);
                                }}
                                className="flex items-center space-x-2"
                              >
                                <Key size={16} />
                                <span>Add Credentials</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Add login credentials</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </>
                    ) : (
                      row.fileId ? (
                        <>
                          <a
                            href={`${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${row.fileId}/view?project=${PROJECT_ID}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              if (row.fileName.endsWith('.zip')) {
                                e.preventDefault();
                                window.location.href = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${row.fileId}/download?project=${PROJECT_ID}`;
                              }
                            }}
                            className="text-blue-600 underline"
                          >
                            <div className="relative group">
                              <FaEye size={20} className="inline" />
                              <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded-md py-1 px-2">
                                View & Download
                              </span>
                            </div>
                          </a>
                          <span className="text-xs text-gray-500">{row.fileName}</span>
                          <Popover>
                            <PopoverTrigger>
                              <Trash2 size={16} className="text-gray-500 cursor-pointer" />
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteFile(row.$id, row.fileId)}
                                className="flex items-center"
                              >
                                <Trash2 size={16} className="mr-2" />
                                Delete File
                              </Button>
                            </PopoverContent>
                          </Popover>
                        </>
                      ) : (
                        <label className="ml-2">
                          <div className="relative group">
                            <UploadCloud size={20} className="cursor-pointer" />
                            <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded-md py-1 px-2">
                              Upload
                            </span>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleUploadFile(index, e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                      )
                    )}
                    {/* Comment Icon */}
                    <div className="flex items-center space-x-2">
                      <Dialog open={isCommentDialogOpen} onOpenChange={setIsCommentDialogOpen}>
                        <DialogTrigger asChild>
                          <Tooltip>
                            <TooltipTrigger>
                              <div className="relative">
                                <MessageCircle
                                size={20}
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedDoc(row);
                                  setIsCommentDialogOpen(true);
                                }} />
                                {row.comments && row.comments.length > 0 && !row.verified && (
                                  <span
                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full w-3 h-3 border-2 border-white"
                                    title="Has comments"
                                  />
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Comments</p>
                            </TooltipContent> 
                          </Tooltip>
                        </DialogTrigger>
                        <DialogContent className="w-full max-w-lg p-6">
                          <DialogHeader>
                            <DialogTitle>Comments for {selectedDoc?.docName}</DialogTitle>
                            <DialogDescription aria-describedby={undefined}>
                            </DialogDescription>
                          </DialogHeader>

                          {/* Display Existing Comments */}
                          <div className="space-y-4 mb-4">
                            {selectedDoc?.comments?.length ? (
                              selectedDoc.comments.map((comment: string, index: number) => (
                                <div
                                  key={index}
                                  className="bg-gray-100 p-2 rounded-md text-sm text-black"
                                >
                                  {comment}
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500">No comments yet.</p>
                            )}
                          </div>

                          {/* Add New Comment */}
                          <Textarea
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="mb-4"
                          />
                          <Button onClick={handleAddComment}>Add Comment</Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    {/* Verify Icon */}
                    <div
                      className="cursor-pointer flex items-center space-x-2 w-28"
                      onClick={() => handleToggleVerify(row.$id, row.verified)}
                    >
                      <div className="mt-1">
                        {row.verified ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle size={20} className="text-green-500 cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Verified</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger>
                              <Circle size={20} className="text-gray-500 cursor-pointer" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Unverified</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      {/* Show verifier name if verified */}
                      {row.verified && row.verifiedBy && (
                        <div className="text-xs text-gray-600">
                          Verified by {row.verifiedBy}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Login Credentials</DialogTitle>
            <DialogDescription>
              Enter the login credentials for {selectedCredentialDoc?.docName}. These will be saved as a secure PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Username
              </Label>
              <Input
                id="username"
                className="col-span-3"
                value={credentials.username}
                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Password
              </Label>
              <div className="col-span-3 relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleCredentialsSubmit} 
              disabled={isSavingCredentials || !credentials.username || !credentials.password}
            >
              {isSavingCredentials ? "Saving..." : "Save Credentials"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="w-full max-w-5xl p-6">
          <DialogHeader>
            {editingDoc?.docName && (
             <DialogTitle>{editingDoc.docName}</DialogTitle>
             )}
             <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <Label>Status</Label>
              <Select
                value={editingDoc?.status || ""}
                onValueChange={(value) => {
                  setEditingDoc({ ...editingDoc, status: value });
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger className="w-full p-2 text-sm border rounded">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Financial Year</Label>
              <Select
                value={editingDoc?.financialYear}
                onValueChange={(value) => {
                  setEditingDoc({ ...editingDoc, financialYear: value });
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger className="w-full p-2 text-sm border rounded">
                  <SelectValue placeholder="Select Financial Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2020-21">2020-21</SelectItem>
                  <SelectItem value="2021-22">2021-22</SelectItem>
                  <SelectItem value="2022-23">2022-23</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Description"
                value={editingDoc?.description}
                onChange={(e) => {
                  setEditingDoc({ ...editingDoc, description: e.target.value });
                  setHasUnsavedChanges(true);
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleDeleteDocument} className="bg-white text-black border border-black hover:bg-neutral-200">Delete</Button>
            <Button onClick={handleEditDocument} disabled={isSavingEdit}>
              {isSavingEdit ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Document Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={closeAddDialog}>
        <DialogContent className="w-full max-w-5xl p-6">
          <DialogHeader>
            <DialogTitle>Add Custom Document</DialogTitle>
            <DialogDescription>
              Add a new custom document to the checklist.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 mt-4">
            <div>
              <Label>
                Document Name
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                value={newDoc.docName}
                onChange={(e) => {
                  setNewDoc({ ...newDoc, docName: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter document name"
              />
            </div>
            <div>
              <Label>
                Document Type
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                value={newDoc.docType}
                onChange={(e) => {
                  setNewDoc({ ...newDoc, docType: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter document type"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={newDoc.status}
                onValueChange={(value) => {
                  setNewDoc({ ...newDoc, status: value });
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger className="w-full p-2 text-sm border rounded">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Financial Year</Label>
              <Select
                value={newDoc.financialYear}
                onValueChange={(value) => {
                  setNewDoc({ ...newDoc, financialYear: value });
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger className="w-full p-2 text-sm border rounded">
                  <SelectValue placeholder="Select Financial Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2020-21">2020-21</SelectItem>
                  <SelectItem value="2021-22">2021-22</SelectItem>
                  <SelectItem value="2022-23">2022-23</SelectItem>
                  <SelectItem value="2023-24">2023-24</SelectItem>
                  <SelectItem value="2024-25">2024-25</SelectItem>
                  <SelectItem value="2025-26">2025-26</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Textarea
                value={newDoc.description}
                onChange={(e) => {
                  setNewDoc({ ...newDoc, description: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                placeholder="Enter document description"
              />
            </div>
            <div className="col-span-2">
              <Label>Document File</Label>
              <Input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setNewDocFile(e.target.files[0]);
                    setHasUnsavedChanges(true);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleSaveDocument} 
              disabled={isSubmitting || !isFormValid}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentChecklist;

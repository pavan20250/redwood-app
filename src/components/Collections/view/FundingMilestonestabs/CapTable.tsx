"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Query } from "appwrite";
import { API_ENDPOINT, PROJECT_ID, STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { client, databases, useIsStartupRoute } from "@/lib/utils";
import { Storage, ID } from "appwrite";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ButtonWithIcon from "@/lib/addButton";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Download, InfoIcon, Trash2, UploadCloud } from "lucide-react";
import { FaEye } from "react-icons/fa";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const CAP_TABLE_ID = "67339ad7000ee8d123a9";
export const CAP_TABLE_COUNT_ID = "67fb95da0005c69e7fdf";
export const CAP_TABLE_DOCUMENTS = "67fc9fb1002803d6b91c";

interface CapTableProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}
interface TableData {
  tableId: string;
  formData: {
    tableDated: string;
    round: string;
    totalShares: string;
    upload: string;
    note: string;
  };
  capTableData: any[];
  fileId?: string | null;
  fileName?: string | null;
  $id?: string;
}

const CapTable: React.FC<CapTableProps> = ({ startupId, setIsDirty }) => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [capTableData, setCapTableData] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const[isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tableDated: "",
    round: "",
    totalShares: "",
    upload: "",
    note: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [existingDocId, setExistingDocId] = useState<string | null>(null);
  const { toast } = useToast();
  const storage = useMemo(() => new Storage(client), []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const isStartupRoute = useIsStartupRoute();


  const fetchAllTables = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsInitialLoading(true);
      }
      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? CAP_TABLE_COUNT_ID : CAP_TABLE_COUNT_ID;
      const tablesResponse = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("startupId", startupId)]
      );

      const tablesData = await Promise.all(
        tablesResponse.documents.map(async (tableDoc) => {
          const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
          const collectionId = isStartupRoute ? CAP_TABLE_ID : CAP_TABLE_ID;
          const rowsResponse = await databases.listDocuments(
            databaseId,
            collectionId,
            [
              Query.equal("startupId", startupId),
              Query.equal("tableId", tableDoc.tableId)
            ]
          );
          return {
            tableId: tableDoc.tableId,
            formData: {
              tableDated: tableDoc.tableDated,
              round: tableDoc.round,
              totalShares: tableDoc.totalShares,
              upload: tableDoc.upload,
              note: tableDoc.note,
            },
            capTableData: rowsResponse.documents,
            fileId: tableDoc.fileId,
            fileName: tableDoc.fileName,
            $id: tableDoc.$id,
          };
        })
      );

      setTables(tablesData);
      if (tablesData.length > 0 && !activeTableId) {
        setActiveTableId(tablesData[0].tableId);
      }
    } catch (error) {
      console.error("Error fetching tables:", error);
    } finally {
      if (isInitialLoad) {
        setIsInitialLoading(false);
      }
    }
  }, [startupId, activeTableId, isStartupRoute]);

  useEffect(() => {
    fetchAllTables(true);
  }, [fetchAllTables]);

  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  const handleAddNewTable = async () => {
    try {
      const newTableId = `table_${Date.now()}`;
      await databases.createDocument(
        STAGING_DATABASE_ID,
        CAP_TABLE_COUNT_ID,
        "unique()",
        {
          startupId,
          tableId: newTableId,
          tableDated: "",
          round: "",
          totalShares: "",
          upload: "",
          note: "",
        }
      );

      setTables(prev => [
        ...prev,
        {
          tableId: newTableId,
          formData: { tableDated: "", round: "", totalShares: "", upload: "", note: "" },
          capTableData: []
        }
      ]);
      setActiveTableId(newTableId);
    } catch (error) {
      console.error("Error creating new table:", error);
    }
  };
  

  const calculateTotalCapital = (tableId: string): number => {
    const table = tables.find(t => t.tableId === tableId);
    if (!table) return 0;
    
    return table.capTableData.reduce((total, row) => {
      if (row.capitalStructure && typeof row.capitalStructure === 'string') {
        const value = parseFloat(row.capitalStructure.replace("%", "")) || 0;
        return total + value;
      }
      return total;
    }, 0);
  };
  useEffect(() => {
    // Check if required fields are filled
    if (editingRow) {
      const { shareholderName, type, role, capitalStructure } =
        editingRow;
      const requiredFieldsFilled =
        !!shareholderName && !!type && !!role && !!capitalStructure;
      setIsSaveButtonDisabled(!requiredFieldsFilled);
    } else {
      setIsSaveButtonDisabled(true);
    }
  }, [editingRow]);

  const handleSaveInvestment = async (row: any) => {
    if (isSubmitting || !activeTableId) return;
    setIsSubmitting(true);
    
    try {
      const table = tables.find(t => t.tableId === activeTableId);
      if (!table) return;

      const { 
        $id, 
        $databaseId, 
        $collectionId, 
        $createdAt, 
        $updatedAt, 
        $permissions, 
        ...fieldsToUpdate 
      } = row;
      const newCapitalStructure = fieldsToUpdate.capitalStructure ? 
        parseFloat(fieldsToUpdate.capitalStructure.replace("%", "")) || 0 : 0;

      let totalCapital = calculateTotalCapital(activeTableId);
      if ($id) {
        const existingRow = table.capTableData.find(r => r.$id === $id);
        const existingCapital = existingRow?.capitalStructure ? 
          parseFloat(existingRow.capitalStructure.replace("%", "")) || 0 : 0;
        totalCapital = totalCapital - existingCapital + newCapitalStructure;
      } else {
        totalCapital += newCapitalStructure;
      }

      if (totalCapital > 100) {
        setError("Total Capital Structure cannot exceed 100%");
        return;
      }

      if ($id) {
        await databases.updateDocument(STAGING_DATABASE_ID, CAP_TABLE_ID, $id, {
          ...fieldsToUpdate,
          tableId: activeTableId
        });
      } else {
        await databases.createDocument(STAGING_DATABASE_ID, CAP_TABLE_ID, "unique()", {
          ...fieldsToUpdate,
          startupId,
          tableId: activeTableId
        });
      }

      fetchAllTables(false);
      setIsDialogOpen(false);
      setEditingRow(null);
      setError(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving data:", error);
      setError("An error occurred while saving");
    } finally {
      setIsSubmitting(false);
    }
  };
  

  const handleDeleteRow = async (id: string) => {
    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, CAP_TABLE_ID, id);
      fetchAllTables(false);
      setIsDialogOpen(false);
      setEditingRow(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting cap table data:", error);
    }
  };

  const roleOptions = [
    "Select", "Founder", "Co-Founder", "Employee", "Angel Investor",
    "Board Member", "Institutional Investor", "Seed Investor", "Series A Investor",
    "Series B Investor", "Series C and Beyond Investors", "Convertible Note Holder",
    "Preferred Stock Holder", "Common Stock Holder", "Employee Stock Option Plan (ESOP) Holder",
    "Strategic Investor", "Lead Investor", "Syndicate Member", "Secondary Market Investor",
  ];
  const residentialStatusOptions = ["Resident", "Non Resident"];
  const boardMemberOptions = ["Yes", "No"];
  const leadInvestorOptions = ["Yes", "No"];
  const typeOptions = ["Individual", "Institutional Investor", "Fund"];
  

  const debounce = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  const handleInputChange = (field: string, value: string) => {
  if (!activeTableId) return;

  // Update local state immediately for responsive UI
  setTables(prev => prev.map(t => 
    t.tableId === activeTableId ? { 
      ...t, 
      formData: { ...t.formData, [field]: value } 
    } : t
  ));

  // Create debounced save function
  const debouncedSave = debounce(async (currentValue: string) => {
    try {
      setIsSaving(true);
      const table = tables.find(t => t.tableId === activeTableId);
      if (!table) return;

      const tableDoc = await databases.listDocuments(
        STAGING_DATABASE_ID,
        CAP_TABLE_COUNT_ID,
        [Query.equal("tableId", activeTableId)]
      );

      if (tableDoc.documents[0]) {
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          CAP_TABLE_COUNT_ID,
          tableDoc.documents[0].$id,
          { ...table.formData, [field]: currentValue }
        );
         toast({
          title: "Saved",
          description: "Your changes have been saved.",
          duration: 2000,
        });
      }
    } catch (error) {
      console.error("Error saving form:", error);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, 500); // 500ms delay

  debouncedSave(value);
  };
  const activeTable = tables.find(t => t.tableId === activeTableId);


  const handleUploadFileForCapTable = async (tableId: string, rowId: string, file: File) => {
    if (!tableId || !rowId) return;

    try {
      const uploadResponse = await storage.createFile(CAP_TABLE_DOCUMENTS, ID.unique(), file);
      await databases.updateDocument(STAGING_DATABASE_ID, CAP_TABLE_ID, rowId, {
        fileId: uploadResponse.$id,
        fileName: file.name,
      });
      fetchAllTables(false);
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
    }
  };

  const handleDeleteFileForCapTable = async (rowId: string, fileId: string) => {
    try {
      await storage.deleteFile(CAP_TABLE_DOCUMENTS, fileId);
      await databases.updateDocument(STAGING_DATABASE_ID, CAP_TABLE_ID, rowId, {
        fileId: null,
        fileName: null,
      });
      fetchAllTables(false);
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

  const handleUpload = async (tableId: string, rowId: string, file: File) => {
    if (!tableId) return;

    try {
      const uploadResponse = await storage.createFile(CAP_TABLE_DOCUMENTS, ID.unique(), file);
      await databases.updateDocument(STAGING_DATABASE_ID, CAP_TABLE_COUNT_ID, rowId, {
        fileId: uploadResponse.$id,
        fileName: file.name,
      });
      fetchAllTables(false);
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
    }
  };

  const handleDeleteFile = async (rowId: string, fileId: string) => {
    try {
      await storage.deleteFile(CAP_TABLE_DOCUMENTS, fileId);
      await databases.updateDocument(STAGING_DATABASE_ID, CAP_TABLE_COUNT_ID, rowId, {
        fileId: null,
        fileName: null,
      });
      fetchAllTables(false);
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
  
  const closeDialog = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsDialogOpen(false);
        setHasUnsavedChanges(false);
        setError(null);
        setEditingRow(null);
      }
    } else {
      setIsDialogOpen(false);
      setError(null);
      setEditingRow(null);
    }
  };
  
  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Capital Table</h3>
            { !isStartupRoute && (
            <ButtonWithIcon label="Add Round" onClick={handleAddNewTable} />
            )}
        </div>
          <div className="flex gap-2 p-2">
            {tables.map(table => (
              <Button
                key={table.tableId}
                variant={activeTableId === table.tableId ? "default" : "outline"}
                onClick={() => setActiveTableId(table.tableId)}
              >
                Round {tables.indexOf(table) + 1}
              </Button>
            ))}
          </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingRow?.$id ? "Edit" : "Add"} Investment</DialogTitle>
            <DialogDescription aria-describedby={undefined}>
            </DialogDescription>
          </DialogHeader>
          {error && (
            <div className="text-red-500" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          <form onSubmit={(e) => {
            e.preventDefault();
            handleSaveInvestment(editingRow);
          }}>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label htmlFor="shareholderName">Shareholder Name<span className="text-red-500">*</span></Label>
                <Input id="shareholderName" placeholder="Shareholder Name" value={editingRow?.shareholderName || ""} 
                onChange={(e) => {
                  setEditingRow({
                    ...editingRow,
                    shareholderName: e.target.value,
                  });
                  setHasUnsavedChanges(true);
                }} 
                />
                
              </div>
              <div>
                <Label htmlFor="type">Type<span className="text-red-500">*</span></Label>
                <Select value={editingRow?.type || ""} 
                  onValueChange={(value) => {
                    setEditingRow({ ...editingRow, type: value });
                    setHasUnsavedChanges(true);
                  }}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>  
              <div>
                <Label htmlFor="role">Role<span className="text-red-500">*</span></Label>
                <Select value={editingRow?.role || ""} 
                onValueChange={(value) => {
                  setEditingRow({ ...editingRow, role: value });
                  setHasUnsavedChanges(true);
                }}>
                  <SelectTrigger id="role" className="w-full p-2 text-sm border border-gray-300 rounded">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="-mb-10">
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="residentialStatus">Residential Status</Label>
                <Select value={editingRow?.residentialStatus || ""} onValueChange={(value) => {
                    setEditingRow({ ...editingRow, residentialStatus: value });
                    setHasUnsavedChanges(true);
                  }}>
                  <SelectTrigger id="residentialStatus">
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {residentialStatusOptions.map((residentialStatus) => (
                      <SelectItem key={residentialStatus} value={residentialStatus}>{residentialStatus}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="instrument">Instrument</Label>
                <Input id="Instrument" placeholder="Instrument" value={editingRow?.instrument || ""} onChange={(e) => {
                  setEditingRow({ ...editingRow, instrument: e.target.value });
                  setHasUnsavedChanges(true);
                }}
                />  
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Input id="class" placeholder="Class" value={editingRow?.class || ""} 
                onChange={(e) => {
                  setEditingRow({ ...editingRow, class: e.target.value });
                  setHasUnsavedChanges(true);
                }} />  
              </div>
              <div>
                <Label htmlFor="shares">No of Shares</Label>
                <Input id="shares" type="number" placeholder="No of Shares" value={editingRow?.shares || ""} 
                onChange={(e) => {
                  setEditingRow({ ...editingRow, shares: e.target.value });
                  setHasUnsavedChanges(true);
                }} />  
              </div>
              <div>
                <Label htmlFor="capitalStructure">Shareholding (%)<span className="text-red-500">*</span></Label>
                <Input
                  id="capitalStructure"
                  placeholder="Capital Structure (%)"
                  value={editingRow?.capitalStructure || ""}
                  onChange={(e) => {
                  let value = e.target.value.replace(/[^0-9.]/g, ""); 
                  value = value ? `${value}` : ""; 
                  setEditingRow({ ...editingRow, capitalStructure: value });
                  setHasUnsavedChanges(true);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="boardMember">Board Member</Label>
                <Select value={editingRow?.boardMember || ""} onValueChange={(value) => {
                  setEditingRow({ ...editingRow, boardMember: value });
                  setHasUnsavedChanges(true);
                  }}>
                  <SelectTrigger id="boardMember">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {boardMemberOptions.map((boardMember) => (
                      <SelectItem key={boardMember} value={boardMember}>{boardMember}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="leadInvestor">Lead Investor</Label>
                <Select value={editingRow?.leadInvestor || ""} onValueChange={(value) => {
                  setEditingRow({ ...editingRow, leadInvestor: value });
                  setHasUnsavedChanges(true);
                  }}>
                  <SelectTrigger id="leadInvestor">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {leadInvestorOptions.map((leadInvestor) => (
                      <SelectItem key={leadInvestor} value={leadInvestor}>{leadInvestor}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="clauses">Important Clauses</Label>
                <Textarea id="clauses" value={editingRow?.clauses || ""} 
                onChange={(e) => {
                  setEditingRow({ ...editingRow, clauses: e.target.value });
                  setHasUnsavedChanges(true);
                  }} />  
              </div>  
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              {editingRow?.$id && (
                <Button type="button" onClick={() => handleDeleteRow(editingRow.$id)} className="bg-white text-black border border-black hover:bg-neutral-200">
                  Delete
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting || isSaveButtonDisabled}>
                {isSubmitting ? "Saving..." : "Save"}
                </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {isInitialLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : !activeTable ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg border border-gray-300">
          <p className="text-lg text-gray-600 mb-4">No Capital Tables found</p>
          {!isStartupRoute && (
            <ButtonWithIcon label="Add New Table" onClick={handleAddNewTable} />
          )}
        </div>
      ) : (
      <div className="bg-white p-1 shadow-md rounded-lg border border-gray-300">
      <div onClick={() => {
          setEditingRow({});
          setIsDialogOpen(true);
          setError(null);
        }} className="float-right text-blue-500">
          <ButtonWithIcon label="Add Shareholder" />
        </div>
        <div className="grid grid-cols-5 gap-4 p-2 mb-4">
          <div>
          <Label htmlFor="tableDated">Cap Table Dated</Label>
          <Input
            id="tableDated"
            type="month"
            value={activeTable.formData.tableDated}
            onChange={(e) => handleInputChange("tableDated", e.target.value)}
          />
          </div>
          <div>
          <Label htmlFor="round">Round</Label>
          <Input
            id="round"
            type="number"
            placeholder="Round"
            value={activeTable.formData.round}
            onChange={(e) => handleInputChange("round", e.target.value)}
          />
          </div>
          <div>
            <Label htmlFor="totalShares">Total No of Shares</Label>
            <Input
              id="totalShares"
              type="number"
              placeholder="Total No of Shares"
              value={activeTable.formData.totalShares}
              onChange={(e) => handleInputChange("totalShares", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="upload">Upload Excel</Label>
            <div className="flex items-center space-x-2">
              {activeTable && activeTable.$id && activeTable.fileId ? (
                <>
                  <a
                    href={`${API_ENDPOINT}/storage/buckets/${CAP_TABLE_DOCUMENTS}/files/${activeTable.fileId}/view?project=${PROJECT_ID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    <div className="relative group">
                      <Download size={20} className="inline" />
                      <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-1 hidden group-hover:block bg-gray-700 text-white text-xs rounded-md py-1 px-2">
                        Download
                      </span>
                    </div>
                  </a>
                  <span className="w-16 h-2 text-xs text-gray-500">{activeTable.fileName}</span>
                  <Popover>
                        <PopoverTrigger>
                          <InfoIcon size={16} className="text-gray-500 cursor-pointer" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFile(activeTable.$id!, activeTable.fileId!)}
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
                    onChange={(e) =>
                      e.target.files && handleUpload(activeTableId!, activeTable.$id!, e.target.files[0])
                    }
                  />
                  <UploadCloud size={20} className="cursor-pointer mt-2" />
                </label>
              )}
            </div>
          </div>
          <div className="-ml-16">
            <Label htmlFor="note">Note about Round</Label>
            <Textarea
              id="note"
              placeholder="Enter.."
              className="resize-none w-60"
              value={activeTable.formData.note}
              onChange={(e) => handleInputChange("note", e.target.value)}
            />
          </div>
        </div>
        <Table>
          <TableCaption>A list of capital contributions</TableCaption>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>S.No</TableHead>
              <TableHead>Shareholder Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-28">Role</TableHead>
              <TableHead >Residential Status</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead className="w-28">Class</TableHead>
              <TableHead>No of Shares</TableHead>
              <TableHead>Shareholding (%)</TableHead>
              <TableHead>Board Member</TableHead>
              <TableHead>Lead Investor</TableHead>
              <TableHead>Important Clauses</TableHead>
              <TableHead>Upload SSHA</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {activeTable.capTableData.map((row, index) => (
                <TableRow key={row.$id} onDoubleClick={() => {
                  setEditingRow(row);
                  setIsDialogOpen(true);
                }}className="cursor-pointer hover:bg-gray-100">
                <TableCell>{index + 1}</TableCell>
                <TableCell>{row.shareholderName}</TableCell>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.role}</TableCell>
                <TableCell>{row.residentialStatus}</TableCell>
                <TableCell>{row.instrument}</TableCell>
                <TableCell>{row.class}</TableCell>
                <TableCell className="text-right">{row.shares}</TableCell>
                <TableCell className="text-right">{row.capitalStructure}%</TableCell>
                <TableCell>{row.boardMember}</TableCell>
                <TableCell>{row.leadInvestor}</TableCell>
                <TableCell>{row.clauses}</TableCell>
                <TableCell>
                <div className="flex items-center space-x-2">
                  {row.fileId ? (
                    <>
                      <a
                        href={`${API_ENDPOINT}/storage/buckets/${CAP_TABLE_DOCUMENTS}/files/${row.fileId}/view?project=${PROJECT_ID}`}
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
                      <span className="w-10 h-10 text-xs text-gray-500">{row.fileName}</span>
                      <Popover>
                        <PopoverTrigger>
                          <InfoIcon size={16} className="text-gray-500 cursor-pointer" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteFileForCapTable(row.$id!, row.fileId!)}
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
                        onChange={(e) => 
                          e.target.files && 
                          handleUploadFileForCapTable(activeTableId!, row.$id!, e.target.files[0])
                        }
                      />
                      <UploadCloud size={20} className="cursor-pointer" />
                    </label>
                  )}
                </div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className={`font-semibold ${calculateTotalCapital(activeTableId!) > 100 ? 'bg-red-100 text-red-700' : ''}`}>
                <TableCell colSpan={8} className="text-right">Total Capital Structure:</TableCell>
                <TableCell className="text-right">{calculateTotalCapital(activeTableId!).toFixed(2)}%</TableCell>
              </TableRow>
          </TableBody>
        </Table>
      </div>
      )}
      <Label className="p-2 text-gray-800 text-sm">Note About Cap Table</Label>
      <ol className="list-decimal list-inside space-y-3 bg-white p-6 rounded-xl shadow-sm text-gray-800 text-base">	
          <li className="text-green-500">Add Table by clicking Add Round - Same For Next Rounds</li>								
					<li>You can include round details as a text note</li>					
          <li>Ensure the cap table reflects the right number of shares as reflected in the latest SHA of a particular round</li>       										
          <li>All these details will be contained in the Shareholders Agreement</li>								
          <li>It will be helpful to you if you can upload the relevant documents in the placeholders for each round</li>    										
          <li>You can also mention any specific clauses that you would like to keep tabs on - for example if there are revenue or fund raise conditions, floor and cap for conversion of instruments, etc</li>    
          <li>Keeping as many details as possible handy will give all users the much needed clarity</li>     										
          <li>Esop plan can be mentioned as a line item indicating the shares allocated to the ESOP pool</li>      										
          <li>Keep a tab on what is vested and what is exercised or lapsed and make changes accordingly in a new cap table to reflect the updated shareholding</li>       										     										
      </ol>
    </div>
  );
};

export default CapTable;

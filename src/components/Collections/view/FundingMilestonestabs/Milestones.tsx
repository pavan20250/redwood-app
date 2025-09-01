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
import { FUNDING_ID } from "./FundAsk";

export const TRANCHES_MILESTONES_ID = "6734996a00203a2aefbb";
export const TRANCHES_TABLE_COLLECTION_ID = "67fe8a1f003e0a9eacb3";
export const TRANCHES_DOCUMENTS = "67fea484003599336a83";

interface TranchesMilestones {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}
interface TableData {
  tableId: string;
  formData: {
    tableDated: string;
    fundRaised: string;
    investorName: string;
  };
  capTableData: any[];
  fileId?: string | null;
  fileName?: string | null;
  $id?: string;
}

const TranchesMilestones: React.FC<TranchesMilestones> = ({ startupId, setIsDirty }) => {
  const [tables, setTables] = useState<TableData[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [capTableData, setCapTableData] = useState<any[]>([]);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const[isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    tableDated: "",
    fundRaised: "",
    investorName: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [existingDocId, setExistingDocId] = useState<string | null>(null);
  const { toast } = useToast();
  const storage = useMemo(() => new Storage(client), []);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);

  const [fundRaisedUnit, setFundRaisedUnit] = useState("Lakh");
  const [fundRaised, setFundRaised] = useState("");
  const [fundRaisedInput, setFundRaisedInput] = useState("");
  const [isEditingFundRaised, setIsEditingFundRaised] = useState(false);
  const [tempFundRaisedInput, setTempFundRaisedInput] = useState(fundRaisedInput);
  const [tempFundRaisedUnit, setTempFundRaisedUnit] = useState(fundRaisedUnit);
  const [validatedFund, setValidatedFund] = useState("");
  const [amountMatchError, setAmountMatchError] = useState(false);

  const isStartupRoute = useIsStartupRoute();

  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  const fetchAllTables = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsInitialLoading(true);
      }
      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? TRANCHES_TABLE_COLLECTION_ID : TRANCHES_TABLE_COLLECTION_ID;
      const tablesResponse = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("startupId", startupId)]
      );

      const tablesData = await Promise.all(
        tablesResponse.documents.map(async (tableDoc) => {
          const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
          const collectionId = isStartupRoute ? TRANCHES_MILESTONES_ID : TRANCHES_MILESTONES_ID;

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
              fundRaised: tableDoc.fundRaised,
              investorName: tableDoc.investorName,
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

  const handleAddNewTable = async () => {
    try {
      const newTableId = `table_${Date.now()}`;
      await databases.createDocument(
        STAGING_DATABASE_ID,
        TRANCHES_TABLE_COLLECTION_ID,
        "unique()",
        {
          startupId,
          tableId: newTableId,
          tableDated: "",
          fundRaised: "",
          investorName: "",
        }
      );

      setTables(prev => [
        ...prev,
        {
          tableId: newTableId,
          formData: { tableDated: "", fundRaised: "", investorName: "" },
          capTableData: []
        }
      ]);
      setActiveTableId(newTableId);
    } catch (error) {
      console.error("Error creating new table:", error);
    }
  };

  useEffect(() => {
    if (editingRow) {
      const { trancheType, amount } = editingRow;
      const requiredFieldsFilled = !!trancheType && !!amount;
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

      if ($id) {
        await databases.updateDocument(STAGING_DATABASE_ID, TRANCHES_MILESTONES_ID, $id, {
          ...fieldsToUpdate,
          tableId: activeTableId
        });
      } else {
        await databases.createDocument(STAGING_DATABASE_ID, TRANCHES_MILESTONES_ID, "unique()", {
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
      await databases.deleteDocument(STAGING_DATABASE_ID, TRANCHES_MILESTONES_ID, id);
      fetchAllTables(false);
      setIsDialogOpen(false);
      setEditingRow(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting cap table data:", error);
    }
  };

  const debounce = (fn: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };
  
  // --- FUND RAISED CONVERSION ---
  const convertToBaseUnit = (amount: string, unit: string) => {
    const num = parseFloat(amount);
    if (isNaN(num)) return 0;
    return unit === "Lakh" ? num * 100000 : num * 10000000;
  };

  const handleInputChange = (field: string, value: string) => {
  if (!activeTableId) return;
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
        TRANCHES_TABLE_COLLECTION_ID,
        [Query.equal("tableId", activeTableId)]
      );

      if (tableDoc.documents[0]) {
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          TRANCHES_TABLE_COLLECTION_ID,
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
  const calculateTotalAmount = (data: any[]) => {
    if (!data || data.length === 0) return 0;
    return data.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  };

  const handleUploadFileForCapTable = async (tableId: string, rowId: string, file: File) => {
    if (!tableId || !rowId) return;

    try {
      const uploadResponse = await storage.createFile(TRANCHES_DOCUMENTS, ID.unique(), file);
      await databases.updateDocument(STAGING_DATABASE_ID, TRANCHES_MILESTONES_ID, rowId, {
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
      await storage.deleteFile(TRANCHES_DOCUMENTS, fileId);
      await databases.updateDocument(STAGING_DATABASE_ID, TRANCHES_MILESTONES_ID, rowId, {
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

  const formatCurrencyInput = (value: string | number | null | undefined) => {
    const stringValue = String(value ?? "");
    const rawValue = stringValue.replace(/[^0-9]/g, "");
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(rawValue) || 0);
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

  function formatToLakh(amount: number | string | null | undefined) {
    const num = Number(amount);
    if (isNaN(num) || num === 0) return "0";
    if (num < 100000) return num.toLocaleString("en-IN");
    return `${(num / 100000).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  useEffect(() => {
    const fetchValidatedFund = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          FUNDING_ID,
          [Query.equal("startupId", startupId)]
        );
        if (response.documents.length > 0) {
          setValidatedFund(response.documents[0].validatedFund || "");
        }
      } catch (error) {
        console.error("Error fetching validatedFund:", error);
      }
    };

    fetchValidatedFund();
  }, [startupId]);
  
  useEffect(() => {
    // Convert both to numbers for comparison
    const validated = Number(validatedFund);
    const raised = Number(activeTable?.formData?.fundRaised || fundRaised);

    if (validated && raised && validated !== raised) {
      setAmountMatchError(true);
    } else {
      setAmountMatchError(false);
    }
  }, [validatedFund, activeTable?.formData?.fundRaised, fundRaised]);


  
  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Tranches & Milestones</h3>
            { !isStartupRoute && (
            <ButtonWithIcon label="Add Table" onClick={handleAddNewTable} />
            )}
        </div>
          <div className="flex gap-2 p-2">
            {tables.map(table => (
              <Button
                key={table.tableId}
                variant={activeTableId === table.tableId ? "default" : "outline"}
                onClick={() => setActiveTableId(table.tableId)}
              >
                Table {tables.indexOf(table) + 1}
              </Button>
            ))}
          </div>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingRow?.$id ? "Edit" : "Add"} Tranche & Milestone</DialogTitle>
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
              <Label htmlFor="trancheType">Tranche Type<span className="text-red-500">*</span></Label>
              <Select
                value={editingRow?.trancheType || ""}
                onValueChange={(value) => {
                  setEditingRow({ ...editingRow, trancheType: value });
                  setHasUnsavedChanges(true);
                }}
              >
                <SelectTrigger id="trancheType">
                  <SelectValue placeholder="Select tranche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tranche 1">Tranche 1</SelectItem>
                  <SelectItem value="Tranche 2">Tranche 2</SelectItem>
                  <SelectItem value="Tranche 3">Tranche 3</SelectItem>
                  <SelectItem value="Tranche 4">Tranche 4</SelectItem>
                  <SelectItem value="Tranche 5">Tranche 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
              <div>
                <Label htmlFor="amount">Amount<span className="text-red-500">*</span></Label>
                <Input id="amount" type="number" placeholder="Enter Anount" value={editingRow?.amount || ""} 
                onChange={(e) => {
                  setEditingRow({ ...editingRow, amount: e.target.value });
                  setHasUnsavedChanges(true);
                }} />  
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingRow?.status || ""}
                  onValueChange={(value) => {
                    setEditingRow({ ...editingRow, status: value });
                    setHasUnsavedChanges(true);
                  }}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Released">Released</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingRow?.status === "Released" && (
                <div>
                  <Label htmlFor="date">Date<span className="text-red-500">*</span></Label>
                  <Input
                    id="date"
                    type="month"
                    value={editingRow?.date || ""}
                    max={new Date().toISOString().slice(0, 7)}
                    onChange={(e) => {
                      setEditingRow({ ...editingRow, date: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="milestones">Milestones</Label>
                <Textarea id="milestones" value={editingRow?.milestones || ""} 
                onChange={(e) => {
                  setEditingRow({ ...editingRow, milestones: e.target.value });
                  setHasUnsavedChanges(true);
                  }} />  
              </div>  
              <div>
                <Label htmlFor="noteMilestones">Note on Milestones</Label>
                <Textarea id="noteMilestones" value={editingRow?.noteMilestones || ""} 
                onChange={(e) => {
                  setEditingRow({ ...editingRow, noteMilestones: e.target.value });
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
          <p className="text-lg text-gray-600 mb-4">No Tranches & Milestones found</p>
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
          <ButtonWithIcon label="Add Tranches" />
        </div>
        <div className="grid grid-cols-4 gap-4 p-2 mb-4">
        <div>
          <Label htmlFor="fundRaised" className="text-sm font-medium mb-2 block">Fund Raised Amount</Label>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
            {!isEditingFundRaised ? (
              <div className="flex items-center gap-3">
                <div className="min-w-[120px] px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                  {activeTable?.formData.fundRaised
                    ? `${formatToLakh(activeTable.formData.fundRaised)} Lakh`
                    : <span className="text-gray-400">No amount</span>
                  }
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3"
                  onClick={() => {
                    setIsEditingFundRaised(true);
                    // Convert the stored value back to the display format
                    const storedValue = activeTable?.formData.fundRaised;
                    if (storedValue) {
                      const valueInLakhs = Number(storedValue) / 100000;
                      setTempFundRaisedInput(valueInLakhs.toString());
                      setTempFundRaisedUnit("Lakh");
                    } else {
                      setTempFundRaisedInput("");
                      setTempFundRaisedUnit("Lakh");
                    }
                  }}
                >
                  Edit
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md overflow-hidden">
                    <Input
                      id="fundRaised"
                      type="number"
                      placeholder="Enter Amount"
                      value={tempFundRaisedInput}
                      onChange={e => setTempFundRaisedInput(e.target.value)}
                      min="0"
                      className="w-24 h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Select
                      value={tempFundRaisedUnit}
                      onValueChange={value => setTempFundRaisedUnit(value)}
                    >
                      <SelectTrigger id="fundRaisedUnit" className="w-20 h-8 border-0 border-l rounded-none focus:ring-0">
                        <SelectValue placeholder="Unit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lakh">Lakhs</SelectItem>
                        <SelectItem value="Crore">Crores</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    onClick={async () => {
                      setFundRaisedInput(tempFundRaisedInput);
                      setFundRaisedUnit(tempFundRaisedUnit);
                      setIsEditingFundRaised(false);
                      const baseValue = convertToBaseUnit(tempFundRaisedInput, tempFundRaisedUnit);
                      await handleInputChange("fundRaised", String(baseValue));
                    }}
                    disabled={!tempFundRaisedInput}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}
            </div>
            {amountMatchError && (
              <p className="text-red-500 text-sm mt-1">
                Fund Raised amount does not match the validated amount.
              </p>
            )}
          </div>
        </div>

          <div>
          <Label htmlFor="tableDated">Table Dated</Label>
          <Input
            id="tableDated"
            type="month"
            max={new Date().toISOString().slice(0, 7)} 
            value={activeTable.formData.tableDated}
            onChange={(e) => handleInputChange("tableDated", e.target.value)}
          />
          </div>
          <div>
            <Label htmlFor="investorName">Investor Name</Label>
            <Input
              id="investorName"
              type="text"
              placeholder="Enter Name"
              value={activeTable.formData.investorName}
              onChange={(e) => handleInputChange("investorName", e.target.value)}
            />
          </div>
          
        </div>
        <Table>
          <TableCaption>A list of capital contributions</TableCaption>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Tranche Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Milestones</TableHead>
              <TableHead>Note on Milestones</TableHead>
              <TableHead>Upload docs</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
          {activeTable.capTableData.map((row, index) => (
                <TableRow key={row.$id} onDoubleClick={() => {
                  setEditingRow(row);
                  setIsDialogOpen(true);
                }}className="cursor-pointer hover:bg-gray-100">
                <TableCell>{row.trancheType}</TableCell>
                <TableCell>{formatCurrencyInput(row.amount)}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>{row.milestones}</TableCell>
                <TableCell>{row.noteMilestones}</TableCell>
                <TableCell>
                <div className="flex items-center space-x-2">
                  {row.fileId ? (
                    <>
                      <a
                        href={`${API_ENDPOINT}/storage/buckets/${TRANCHES_DOCUMENTS}/files/${row.fileId}/view?project=${PROJECT_ID}`}
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
            <TableRow className="bg-gray-50 font-semibold">
            <TableCell colSpan={1}>Total Amount</TableCell>
            <TableCell colSpan={5}>{formatCurrencyInput(calculateTotalAmount(activeTable.capTableData))}</TableCell>
          </TableRow>
          </TableBody>
        </Table>
      </div>
      )}
    </div>
  );
};

export default TranchesMilestones;
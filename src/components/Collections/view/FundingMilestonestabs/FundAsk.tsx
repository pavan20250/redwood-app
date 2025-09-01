"use client";

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { PlusCircle, Save, Edit } from "lucide-react";
import { Models } from "appwrite";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ButtonWithIcon from "@/lib/addButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const PROPOSED_FUND_ASK_ID = "67358bc4000af32965f2";
export const VALIDATED_FUND_ASK_ID = "67694e77002cc9cd69c4";
export const FUNDING_ID = "67ab9fd800164cfd7b09";

interface FundAskProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

interface FundItem {
  $id?: string;
  description: string;
  amount: string;
  startupId: string;
}

const mapDocumentToFundItem = (doc: Models.Document): FundItem => ({
  $id: doc.$id,
  description: doc.description,
  amount: doc.amount,
  startupId: doc.startupId,
});

const calculateTotal = (funds: FundItem[]): number => {
  return funds.reduce((total, fund) => {
    const cleanAmount = (fund.amount || '').replace(/[^0-9.]/g, '');
    return total + (parseFloat(cleanAmount) || 0);
  }, 0);
};

const formatINR = (value: string | number): string => {
  const number = typeof value === "string" ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  if (isNaN(number)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(number);
};

// Helper to convert user input to INR
const getAmountInINR = (amount: string, unit: string) => {
  const num = parseFloat(amount) || 0;
  if (unit === "Lakh") return Math.round(num * 1e5);
  if (unit === "Crore") return Math.round(num * 1e7);
  return Math.round(num);
};

const FundAsk: React.FC<FundAskProps> = ({ startupId, setIsDirty }) => {
  const [proposedFunds, setProposedFunds] = useState<FundItem[]>([]);
  const [validatedFunds, setValidatedFunds] = useState<FundItem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTable, setActiveTable] = useState<"proposed" | "validated">("proposed");
  const [editingFund, setEditingFund] = useState<FundItem | null>(null);
  const [proposedFundAsk, setProposedFundAsk] = useState("");
  const [validatedFundAsk, setValidatedFundAsk] = useState("");
  const [proposedFundAskUnit, setProposedFundAskUnit] = useState("");
  const [validatedFundAskUnit, setValidatedFundAskUnit] = useState("");
  const [isEditingProposed, setIsEditingProposed] = useState(false);
  const [isEditingValidated, setIsEditingValidated] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);
  const isStartupRoute = useIsStartupRoute();

  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  useEffect(() => {
    const { description, amount } = editingFund || { description: '', amount: '' };
    setIsSaveButtonDisabled(!description || !amount);
  }, [editingFund]);

  useEffect(() => {
    const fetchFunds = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const proposedCollectionId = isStartupRoute ? PROPOSED_FUND_ASK_ID : PROPOSED_FUND_ASK_ID;
        const validatedCollectionId = isStartupRoute ? VALIDATED_FUND_ASK_ID : VALIDATED_FUND_ASK_ID;

        const [proposedResponse, validatedResponse] = await Promise.all([
          databases.listDocuments(databaseId, proposedCollectionId, [Query.equal("startupId", startupId)]),
          databases.listDocuments(databaseId, validatedCollectionId, [Query.equal("startupId", startupId)]),
        ]);

        setProposedFunds(proposedResponse.documents.map(mapDocumentToFundItem));
        setValidatedFunds(validatedResponse.documents.map(mapDocumentToFundItem));

        const fundingResponse = await databases.listDocuments(STAGING_DATABASE_ID, FUNDING_ID, [Query.equal("startupId", startupId)]);
        if (fundingResponse.documents.length > 0) {
          const fundingDoc = fundingResponse.documents[0];
          // Try to guess the unit from the value (if you want to persist the unit, store it in DB)
          if (fundingDoc.proposedFund) {
            const val = parseInt(fundingDoc.proposedFund, 10);
            if (val % 1e7 === 0) {
              setProposedFundAskUnit("Crore");
              setProposedFundAsk((val / 1e7).toString());
            } else {
              setProposedFundAskUnit("Lakh");
              setProposedFundAsk((val / 1e5).toString());
            }
          } else {
            setProposedFundAskUnit("Lakh");
            setProposedFundAsk("");
          }
          if (fundingDoc.validatedFund) {
            const val = parseInt(fundingDoc.validatedFund, 10);
            if (val % 1e7 === 0) {
              setValidatedFundAskUnit("Crore");
              setValidatedFundAsk((val / 1e7).toString());
            } else {
              setValidatedFundAskUnit("Lakh");
              setValidatedFundAsk((val / 1e5).toString());
            }
          } else {
            setValidatedFundAskUnit("Lakh");
            setValidatedFundAsk("");
          }
        } else {
          setProposedFundAskUnit("Lakh");
          setProposedFundAsk("");
          setValidatedFundAskUnit("Lakh");
          setValidatedFundAsk("");
        }
      } catch (error) {
        setProposedFunds([]);
        setValidatedFunds([]);
        setProposedFundAsk("");
        setValidatedFundAsk("");
      }
    };

    fetchFunds();
  }, [startupId, isStartupRoute]);

  const handleAddItem = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const collectionId = activeTable === "proposed" ? PROPOSED_FUND_ASK_ID : VALIDATED_FUND_ASK_ID;
      const response = await databases.createDocument(STAGING_DATABASE_ID, collectionId, "unique()", { ...editingFund, startupId });
      const newFundItem = mapDocumentToFundItem(response);
      if (activeTable === "proposed") {
        setProposedFunds([...proposedFunds, newFundItem]);
      } else {
        setValidatedFunds([...validatedFunds, newFundItem]);
      }
      setEditingFund(null);
      setIsDialogOpen(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      // handle error
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingFund || !editingFund.$id) return;
    try {
      const collectionId = activeTable === "proposed" ? PROPOSED_FUND_ASK_ID : VALIDATED_FUND_ASK_ID;
      const { $id, ...updateData } = editingFund;
      await databases.updateDocument(STAGING_DATABASE_ID, collectionId, $id, updateData);
      const updatedFunds = activeTable === "proposed" ? proposedFunds : validatedFunds;
      const updatedFundsList = updatedFunds.map(fund => fund.$id === $id ? editingFund : fund);
      if (activeTable === "proposed") {
        setProposedFunds(updatedFundsList);
      } else {
        setValidatedFunds(updatedFundsList);
      }
      setEditingFund(null);
      setIsDialogOpen(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      // handle error
    }
  };

  const handleDeleteItem = async () => {
    if (!editingFund || !editingFund.$id) return;
    try {
      const collectionId = activeTable === "proposed" ? PROPOSED_FUND_ASK_ID : VALIDATED_FUND_ASK_ID;
      await databases.deleteDocument(STAGING_DATABASE_ID, collectionId, editingFund.$id);
      const updatedFunds = activeTable === "proposed" ? proposedFunds : validatedFunds;
      const updatedFundsList = updatedFunds.filter(fund => fund.$id !== editingFund.$id);
      if (activeTable === "proposed") {
        setProposedFunds(updatedFundsList);
      } else {
        setValidatedFunds(updatedFundsList);
      }
      setEditingFund(null);
      setIsDialogOpen(false);
      setHasUnsavedChanges(false);
    } catch (error) {
      // handle error
    }
  };

  const handleRowDoubleTap = (fund: FundItem, type: "proposed" | "validated") => {
    setActiveTable(type);
    setEditingFund(fund);
    setIsDialogOpen(true);
  };

  // Save the INR value to DB
  const handleSave = async (type: "proposed" | "validated") => {
    try {
      const data = {
        proposedFund: getAmountInINR(proposedFundAsk, proposedFundAskUnit).toString(),
        validatedFund: getAmountInINR(validatedFundAsk, validatedFundAskUnit).toString(),
        startupId: startupId,
      };

      try {
        await databases.updateDocument(STAGING_DATABASE_ID, FUNDING_ID, startupId, data);
      } catch (error) {
        await databases.createDocument(STAGING_DATABASE_ID, FUNDING_ID, startupId, data);
      }

      if (type === "proposed") {
        setIsEditingProposed(false);
      } else {
        setIsEditingValidated(false);
      }
      setIsDirty(false);
    } catch (error) {
      // handle error
    }
  };

  const closeDialog = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsDialogOpen(false);
        setEditingFund(null);
        setHasUnsavedChanges(false);
      }
    } else {
      setIsDialogOpen(false);
      setEditingFund(null);
    }
  };

  return (
    <>
      <h3 className="container text-lg font-medium mb-2 -mt-4">Fund Ask</h3>
      <div className="container mx-auto space-y-4">
        <FundTable
          title="Proposed Fund Ask"
          funds={proposedFunds}
          onRowDoubleTap={(fund) => handleRowDoubleTap(fund, "proposed")}
          onOpenDialog={() => {
            setActiveTable("proposed");
            setEditingFund({ description: "", amount: "", startupId });
            setIsDialogOpen(true);
          }}
          fundAsk={proposedFundAsk}
          setFundAsk={setProposedFundAsk}
          fundAskUnit={proposedFundAskUnit}
          setFundAskUnit={setProposedFundAskUnit}
          isEditing={isEditingProposed}
          setIsEditing={setIsEditingProposed}
          onSave={() => handleSave("proposed")}
          setIsDirty={setIsDirty}
        />
        <FundTable
          title="Validated Fund Ask"
          funds={validatedFunds}
          onRowDoubleTap={(fund) => handleRowDoubleTap(fund, "validated")}
          onOpenDialog={() => {
            setActiveTable("validated");
            setEditingFund({ description: "", amount: "", startupId });
            setIsDialogOpen(true);
          }}
          fundAsk={validatedFundAsk}
          setFundAsk={setValidatedFundAsk}
          fundAskUnit={validatedFundAskUnit}
          setFundAskUnit={setValidatedFundAskUnit}
          isEditing={isEditingValidated}
          setIsEditing={setIsEditingValidated}
          onSave={() => handleSave("validated")}
          setIsDirty={setIsDirty}
        />
      </div>
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingFund?.$id ? "Edit Fund Item" : "Add New Fund Item"}</DialogTitle>
            <DialogDescription aria-describedby={undefined}>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="description">Utilization Description<span className="text-red-500">*</span></Label>
              <Textarea
                id="description"
                value={editingFund?.description || ""}
                onChange={(e) => {
                  setEditingFund({
                    ...editingFund!,
                    description: e.target.value,
                  });
                  setHasUnsavedChanges(true);
                }}
                className="col-span-3"
              />
            </div>
            <div>
              <Label htmlFor="amount">Amount<span className="text-red-500">*</span></Label>
              <Input
                type="text"
                id="amount"
                placeholder="Enter amount in INR"
                value={formatINR(editingFund?.amount || "")}
                onChange={(e) => {
                  setEditingFund({ ...editingFund!, amount: e.target.value.replace(/[^0-9.]/g, '') });
                  setHasUnsavedChanges(true);
                }}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            {editingFund?.$id && (
              <Button onClick={handleDeleteItem} className="bg-white text-black border border-black hover:bg-neutral-200">Delete</Button>
            )}
            <Button type="submit" onClick={editingFund?.$id ? handleUpdateItem : handleAddItem} disabled={isSubmitting || isSaveButtonDisabled}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface FundTableProps {
  title: string;
  funds: FundItem[];
  onRowDoubleTap: (fund: FundItem) => void;
  onOpenDialog: () => void;
  fundAsk: string;
  setFundAsk: (value: string) => void;
  fundAskUnit: string;
  setFundAskUnit: (value: string) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  setIsDirty: (isDirty: boolean) => void;
  onSave: () => void;
}

const FundTable: React.FC<FundTableProps> = ({
  title,
  funds,
  onRowDoubleTap,
  onOpenDialog,
  fundAsk,
  setFundAsk,
  fundAskUnit,
  setFundAskUnit,
  isEditing,
  setIsEditing,
  setIsDirty,
  onSave,
}) => {
  const total = calculateTotal(funds);

  // Validate total amount
  const validateTotal = (total: number, fundAsk: string, fundAskUnit: string): boolean => {
    const cleanFundAsk = getAmountInINR(fundAsk, fundAskUnit);
    return total === cleanFundAsk;
  };
  const isValid = validateTotal(total, fundAsk, fundAskUnit);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  const isStartupRoute = useIsStartupRoute();

  return (
    <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-semibold">{title}</h4>
        <div>
          {!isValid && <p className="text-red-500">Total Amount does not match the Fund Ask amount!</p>}
        </div>
        <div onClick={onOpenDialog}>
          { !isStartupRoute && (
          <ButtonWithIcon label="Add" />
          )}
        </div>
      </div>
      <div className="flex items-center mb-4">
        <span className="mr-2 text-sm font-semibold">{title}:</span>
        <div className="flex items-center">
          <div className="flex items-center border rounded-md overflow-hidden w-[180px]">
            <Input
              type="number"
              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
              value={fundAsk}
              onChange={(e) => {
                setFundAsk(e.target.value);
                setIsDirty(true);
              }}
              disabled={!isEditing}
              placeholder="Enter amount"
            />
            <Select
              value={fundAskUnit}
              onValueChange={(value) => {
                setFundAskUnit(value);
                setIsDirty(true);
              }}
              disabled={!isEditing}
            >
              <SelectTrigger className="w-[100px] rounded-none border-l">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lakh">Lakhs</SelectItem>
                <SelectItem value="Crore">Crores</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isEditing ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Save
                    size={20}
                    className="ml-2 cursor-pointer text-green-500"
                    onClick={onSave}
                  />
                </TooltipTrigger>
                <TooltipContent>Save</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  { !isStartupRoute && (
                  <Edit
                    size={20}
                    className="ml-2 cursor-pointer"
                    onClick={() => setIsEditing(true)}
                  />
                  )}
                </TooltipTrigger>
                <TooltipContent>Add Amount</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>
      <Table>
        <TableCaption>{`A list of ${title.toLowerCase()}.`}</TableCaption>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="w-1/2">Utilization Description</TableHead>
            <TableHead>Budgeted Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {funds.map((item) => (
            <TableRow key={item.$id} onDoubleClick={() => onRowDoubleTap(item)}>
              <TableCell>{item.description}</TableCell>
              <TableCell>{formatINR(item.amount)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold">
            <TableCell>Total</TableCell>
            <TableCell>{formatCurrency(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default FundAsk;

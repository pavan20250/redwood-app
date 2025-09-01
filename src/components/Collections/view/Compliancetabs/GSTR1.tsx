"use client";

import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ButtonWithIcon from "@/lib/addButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const GSTR_ID = "673b1988001c3d93380e";

interface GstrComplianceProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

const GstrCompliance: React.FC<GstrComplianceProps> = ({ startupId, setIsDirty }) => {
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [editingCompliance, setEditingCompliance] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filingType, setFilingType] = useState("Monthly"); // Default to monthly
  const [quarter, setQuarter] = useState("");
  const [newCompliance, setNewCompliance] = useState({
    date: "",
    gstr1: "",
    gst3b: "",
  });
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
    const fetchComplianceData = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? GSTR_ID : GSTR_ID

        const response = await databases.listDocuments(databaseId, collectionId, [
          Query.equal("startupId", startupId),
        ]);
        const filteredDocuments = response.documents.map(doc => {
          const { $id, date, gstr1, gst3b, filingType, quarter } = doc;
          const gstr1Value = parseFloat(gstr1.replace(/,/g, ''));
          const gst3bValue = parseFloat(gst3b.replace(/,/g, ''));
          const difference = (gstr1Value - gst3bValue).toFixed(2);
          return { $id, date, gstr1, gst3b, difference, filingType, quarter };
        });
        setComplianceData(filteredDocuments);
      } catch (error) {
        console.error("Error fetching compliance data:", error);
      }
    };
    fetchComplianceData();
  }, [startupId, isStartupRoute]);
  useEffect(() => {
    // Check if all required fields are filled
    const requiredFieldsFilled =
      filingType &&
      (filingType === "Monthly" ? newCompliance.date : quarter);
    setIsSaveButtonDisabled(!requiredFieldsFilled);
  }, [filingType, quarter, newCompliance]);

  const formatNumber = (value: string) => {
    return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleSaveCompliance = async () => {
    if (!editingCompliance) return;
    try {
      const { date, gstr1, gst3b, filingType, quarter } = editingCompliance;
      const gstr1Value = parseFloat(gstr1.replace(/,/g, ''));
      const gst3bValue = parseFloat(gst3b.replace(/,/g, ''));
      const difference = (gstr1Value - gst3bValue).toFixed(2);

      const updateData = {
        date,
        gstr1: formatNumber(gstr1),
        gst3b: formatNumber(gst3b),
        difference: formatNumber(difference),
        filingType,
        quarter: filingType === "Quarterly" ? quarter : ""
      };
      await databases.updateDocument(STAGING_DATABASE_ID, GSTR_ID, editingCompliance.$id, updateData);
      const updatedCompliances = complianceData.map(c =>
        c.$id === editingCompliance.$id ? { ...c, ...updateData } : c
      );
      setComplianceData(updatedCompliances);
      setEditingCompliance(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving compliance data:", error);
    }
  };

  const handleDeleteCompliance = async () => {
    if (!editingCompliance) return;
    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, GSTR_ID, editingCompliance.$id);
      const updatedCompliances = complianceData.filter(c => c.$id !== editingCompliance.$id);
      setComplianceData(updatedCompliances);
      setEditingCompliance(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting compliance:", error);
    }
  };

  const handleAddComplianceData = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { date, gstr1, gst3b } = newCompliance;
      const gstr1Value = parseFloat(gstr1.replace(/,/g, ''));
      const gst3bValue = parseFloat(gst3b.replace(/,/g, ''));
      const difference = (gstr1Value - gst3bValue).toFixed(2);

      const response = await databases.createDocument(
        STAGING_DATABASE_ID,
        GSTR_ID,
        "unique()",
        {
          date,
          gstr1: formatNumber(gstr1),
          gst3b: formatNumber(gst3b),
          difference: formatNumber(difference),
          startupId,
          filingType,
          quarter: filingType === "Quarterly" ? quarter : ""
        }
      );
      setComplianceData([...complianceData, response]);
      setIsDialogOpen(false);
      setNewCompliance({
        date: "",
        gstr1: "",
        gst3b: "",
      });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error adding compliance data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    let value = e.target.value.replace(/[^\d,]/g, '');
    value = formatNumber(value.replace(/,/g, ''));
    setNewCompliance({ ...newCompliance, [field]: value });
    setHasUnsavedChanges(true);
  };

  const closeDialog = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsDialogOpen(false);
        setHasUnsavedChanges(false);
        setNewCompliance({
          date: "",
          gstr1: "",
          gst3b: "",
        });
        setFilingType("Monthly");
        setQuarter("");
      }
    } else {
      setIsDialogOpen(false);
      setNewCompliance({
        date: "",
        gstr1: "",
        gst3b: "",
      });
      setFilingType("Monthly");
      setQuarter("");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h3 className="container text-lg font-medium mb-2 -mt-4">GSTR-1 & GSTR-3B</h3>
        <ButtonWithIcon onClick={() => setIsDialogOpen(true)} label="Add" />
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Table>
          <TableCaption>GSTR Compliance Information</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Filing Type</TableHead>
              <TableHead>Quarter/Month</TableHead>
              <TableHead>GST R1</TableHead>
              <TableHead>GST 3B</TableHead>
              <TableHead>Difference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complianceData.map((row) => (
              <TableRow key={row.$id} onDoubleClick={() => setEditingCompliance(row)}>
                <TableCell>{row.filingType}</TableCell>
                <TableCell>{row.quarter ? row.quarter : row.date}</TableCell> {/* Show quarter if present, else date */}
                <TableCell>{row.gstr1}</TableCell>
                <TableCell>{row.gst3b}</TableCell>
                <TableCell>{row.difference}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="w-full max-w-5xl p-6">
          <DialogHeader>
            <DialogTitle>Add New Compliance</DialogTitle>
            <DialogDescription aria-describedby={undefined}>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            <div>
              <Label htmlFor="filingType">Filing Type<span className="text-red-500">*</span></Label>
              <Select value={filingType} onValueChange={(value) => {
                setFilingType(value);
                setQuarter("");
                setHasUnsavedChanges(true);
              }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select Filing Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filingType === "Quarterly" && (
              <div>
                <Label htmlFor="quarter">Quarter<span className="text-red-500">*</span></Label>
                <Select value={quarter} onValueChange={(value) => {
                  setQuarter(value);
                  setHasUnsavedChanges(true);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="April - June">April - June</SelectItem>
                    <SelectItem value="July - September">July - September</SelectItem>
                    <SelectItem value="October - December">October - December</SelectItem>
                    <SelectItem value="January - March">January - March</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {filingType === "Monthly" && (
              <div>
                <Label htmlFor="date" className="text-right">Month<span className="text-red-500">*</span></Label>
                <Input
                  id="date"
                  type="month"
                  max={new Date().toISOString().slice(0, 7)} 
                  value={newCompliance.date}
                  onChange={(e) => {
                    setNewCompliance({ ...newCompliance, date: e.target.value });
                    setHasUnsavedChanges(true);
                  }}
                  className="col-span-3"
                />
              </div>
            )}
            <div>
              <Label htmlFor="gstr1" className="text-right">GST R1</Label>
              <Input
                id="gstr1"
                value={newCompliance.gstr1} 
                onChange={(e) => handleInputChange(e, 'gstr1')}
                className="col-span-3"
              />
            </div>
            <div>
              <Label htmlFor="gst3b" className="text-right">GST 3B</Label>
              <Input
                id="gst3b"
                value={newCompliance.gst3b}
                onChange={(e) => handleInputChange(e, 'gst3b')}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddComplianceData} disabled={isSubmitting || isSaveButtonDisabled}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingCompliance && (
        <Dialog open={!!editingCompliance} onOpenChange={() => setEditingCompliance(null)}>
          <DialogContent className="w-full max-w-5xl p-6">
            <DialogHeader>
              <DialogTitle>Edit Compliance</DialogTitle>
              <DialogDescription aria-describedby={undefined}>
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              <div>
                <Label htmlFor="filingType">Filing Type</Label>
                <Select value={editingCompliance.filingType} onValueChange={(value) => {
                  setEditingCompliance({ ...editingCompliance, filingType: value, quarter: "" });
                  setHasUnsavedChanges(true);
                }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select Filing Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="Quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editingCompliance.filingType === "Quarterly" && (
                <div>
                  <Label htmlFor="quarter">Quarter</Label>
                  <Select value={editingCompliance.quarter} onValueChange={(value) => {
                    setEditingCompliance({ ...editingCompliance, quarter: value });
                    setHasUnsavedChanges(true);
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select Quarter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="April - June">April - June</SelectItem>
                      <SelectItem value="July - September">July - September</SelectItem>
                      <SelectItem value="October - December">October - December</SelectItem>
                      <SelectItem value="January - March">January - March</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {editingCompliance.filingType === "Monthly" && (
                <div>
                  <Label htmlFor="edit-date" className="text-right">Month</Label>
                  <Input
                    id="edit-date"
                    type="month"
                    max={new Date().toISOString().slice(0, 7)} 
                    value={editingCompliance.date}
                    onChange={(e) => {
                      setEditingCompliance({ ...editingCompliance, date: e.target.value });
                      setHasUnsavedChanges(true);
                    }}
                    className="col-span-3"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="edit-gstr1" className="text-right">GST R1</Label>
                <Input
                  id="edit-gstr1"
                  value={editingCompliance.gstr1}
                  onChange={(e) => {
                    setEditingCompliance({ ...editingCompliance, gstr1: formatNumber(e.target.value.replace(/[^\d,]/g, '').replace(/,/g, '')) });
                    setHasUnsavedChanges(true);
                  }}
                  className="col-span-3"
                />
              </div>
              <div>
                <Label htmlFor="edit-gst3b" className="text-right">GST 3B</Label>
                <Input
                  id="edit-gst3b"
                  value={editingCompliance.gst3b}
                  onChange={(e) => {
                    setEditingCompliance({ ...editingCompliance, gst3b: formatNumber(e.target.value.replace(/[^\d,]/g, '').replace(/,/g, '')) });
                    setHasUnsavedChanges(true);
                  }}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleDeleteCompliance} className="bg-white text-black border border-black hover:bg-neutral-200">Delete</Button>
              <Button onClick={handleSaveCompliance} className="mr-2">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default GstrCompliance;

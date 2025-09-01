"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from "lucide-react";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ButtonWithIcon from "@/lib/addButton";

export const INCUBATION_ID = "673c2945001eddd9aea3";

interface IncubationProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

const Incubation: React.FC<IncubationProps> = ({ startupId }) => {
  const [incubationData, setIncubationData] = useState<any[]>([]);
  const [editingIncubation, setEditingIncubation] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newIncubation, setNewIncubation] = useState({
    program: "",
    date: "",
    exitDate: "",
    status: "",
    spocName: "",
    spocNumber: "",
    spocEmail: "",
    description: "",
  });
  const isStartupRoute = useIsStartupRoute();

  useEffect(() => {
    const fetchIncubationData = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? INCUBATION_ID : INCUBATION_ID;

        const response = await databases.listDocuments(databaseId, collectionId, [
          Query.equal("startupId", startupId),
        ]);
        const filteredDocuments = response.documents.map(doc => {
          const { $id, program, date, exitDate, status, spocName, spocNumber, spocEmail, description } = doc;
          return { $id, program, date, exitDate, status, spocName, spocNumber, spocEmail, description };
        });
        setIncubationData(filteredDocuments);
      } catch (error) {
        console.error("Error fetching incubation data:", error);
      }
    };
    fetchIncubationData();
  }, [startupId, isStartupRoute]);

  const handleSaveIncubation = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    if (!editingIncubation) return;
    try {
      const allowedFields = ['program', 'date', 'exitDate', 'status', 'spocName', 'spocNumber', 'spocEmail', 'description'];
      const updateData = Object.fromEntries(
        Object.entries(editingIncubation).filter(([key]) => allowedFields.includes(key))
      );
      await databases.updateDocument(STAGING_DATABASE_ID, INCUBATION_ID, editingIncubation.$id, updateData);
      const updatedIncubations = incubationData.map(i => i.$id === editingIncubation.$id ? {...i, ...updateData} : i);
      setIncubationData(updatedIncubations);
      setEditingIncubation(null);
    } catch (error) {
      console.error("Error saving incubation data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIncubation = async () => {
    if (!editingIncubation) return;
    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, INCUBATION_ID, editingIncubation.$id);
      const updatedIncubations = incubationData.filter(i => i.$id !== editingIncubation.$id);
      setIncubationData(updatedIncubations);
      setEditingIncubation(null);
    } catch (error) {
      console.error("Error deleting incubation:", error);
    }
  };

  const handleAddIncubationData = async () => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    try {
      const { program, date, exitDate, status, spocName, spocNumber, spocEmail, description } = newIncubation;
      const response = await databases.createDocument(
        STAGING_DATABASE_ID,
        INCUBATION_ID,
        "unique()",
        { program, date, exitDate, status, spocName, spocNumber, spocEmail, description, startupId }
      );
      setIncubationData([...incubationData, response]);
      setIsDialogOpen(false);
      setNewIncubation({
        program: "",
        date: "",
        exitDate: "",
        status: "",
        spocName: "",
        spocNumber: "",
        spocEmail: "",
        description: "",
      });
    } catch (error) {
      console.error("Error adding incubation data:", error);
    } finally {
      setIsSubmitting(false);   
    }
  };
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB").format(date);
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h3 className="container text-lg font-medium mb-2 -mt-4">Incubation</h3>
        { !isStartupRoute && (
        <ButtonWithIcon label="Add" onClick={() => setIsDialogOpen(true)} />
        )}
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Table>
          <TableCaption>Incubation Program Information</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Incubator Name</TableHead>
              <TableHead>Incubated Date</TableHead>
              <TableHead>Exit Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SPOC Name</TableHead>
              <TableHead>SPOC Phone Number</TableHead>
              <TableHead>SPOC Email</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incubationData.map((row) => (
              <TableRow key={row.$id} onDoubleClick={() => setEditingIncubation(row)}>
                <TableCell>{row.program}</TableCell>
                <TableCell>{formatDate(row.date)}</TableCell>
                <TableCell>{formatDate(row.exitDate)}</TableCell>
                <TableCell>{row.status}</TableCell>
                <TableCell>{row.spocName}</TableCell>
                <TableCell>{row.spocNumber}</TableCell>
                <TableCell>{row.spocEmail}</TableCell>
                <TableCell>{row.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-full max-w-5xl p-6">
          <DialogHeader>
            <DialogTitle>Add New Incubation</DialogTitle>
            <DialogDescription aria-describedby={undefined}>
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-4 py-4">
            <div>
              <Label htmlFor="program" className="text-right">Incubator Name</Label>
              <Input id="program" value={newIncubation.program} onChange={(e) => setNewIncubation({ ...newIncubation, program: e.target.value })} className="col-span-3" />
            </div>
            <div>
              <Label htmlFor="date" className="text-right">Incubated Date</Label>
              <Input id="date" type="date" value={newIncubation.date} onChange={(e) => setNewIncubation({ ...newIncubation, date: e.target.value })} className="col-span-3" />
            </div>
            <div>
              <Label htmlFor="exitDate" className="text-right">Exit Date</Label>
              <Input id="exitDate" type="date" value={newIncubation.exitDate} onChange={(e) => setNewIncubation({ ...newIncubation, exitDate: e.target.value })} className="col-span-3" />
            </div>
            <div>
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={newIncubation.status} onValueChange={(value) => setNewIncubation({ ...newIncubation, status: value })}>
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Select">Select</SelectItem>
                  <SelectItem value="Applied">Applied</SelectItem>
                  <SelectItem value="Incubated">Incubated</SelectItem>
                  <SelectItem value="Exited">Exited</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="spocName" className="text-right">SPOC Name</Label>
              <Input id="spocName" value={newIncubation.spocName} onChange={(e) => setNewIncubation({ ...newIncubation, spocName: e.target.value })} className="col-span-3" />
            </div>
            <div>
              <Label htmlFor="spocNumber" className="text-right">SPOC Phone Number</Label>
              <Input id="spocNumber" value={newIncubation.spocNumber} onChange={(e) => setNewIncubation({ ...newIncubation, spocNumber: e.target.value })} className="col-span-3" />
            </div>
            <div>
              <Label htmlFor="spocEmail" className="text-right">SPOC Email</Label>
              <Input id="spocEmail" value={newIncubation.spocEmail} onChange={(e) => setNewIncubation({ ...newIncubation, spocEmail: e.target.value })} className="col-span-3" />
            </div>
            <div>
              <Label htmlFor="description" className="text-right">Description</Label>
              <Textarea id="description" value={newIncubation.description} onChange={(e) => setNewIncubation({ ...newIncubation, description: e.target.value })} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAddIncubationData} disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {editingIncubation && (
        <Dialog open={!!editingIncubation} onOpenChange={() => setEditingIncubation(null)}>
          <DialogContent className="w-full max-w-5xl p-6">
            <DialogHeader>
              <DialogTitle>Edit Incubation</DialogTitle>
              <DialogDescription aria-describedby={undefined}>
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4 py-4">
              <div>
                <Label htmlFor="edit-program" className="text-right">Incubator Name</Label>
                <Input id="edit-program" value={editingIncubation.program} onChange={(e) => setEditingIncubation({ ...editingIncubation, program: e.target.value })} className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-date" className="text-right">Incubated Date</Label>
                <Input id="edit-date" type="date" value={editingIncubation.date} onChange={(e) => setEditingIncubation({ ...editingIncubation, date: e.target.value })} className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-exitDate" className="text-right">Exit Date</Label>
                <Input id="edit-exitDate" type="date" value={editingIncubation.exitDate} onChange={(e) => setEditingIncubation({ ...editingIncubation, exitDate: e.target.value })} className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-status" className="text-right">Status</Label>
                <Select value={editingIncubation.status} onValueChange={(value) => setEditingIncubation({ ...editingIncubation, status: value })}>
                  <SelectTrigger id="edit-status" className="col-span-3">
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Select">Select</SelectItem>
                    <SelectItem value="Applied">Applied</SelectItem>
                    <SelectItem value="Incubated">Incubated</SelectItem>
                    <SelectItem value="Exited">Exited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-spocName" className="text-right">SPOC Name</Label>
                <Input id="edit-spocName" value={editingIncubation.spocName} onChange={(e) => setEditingIncubation({ ...editingIncubation, spocName: e.target.value })} className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-spocNumber" className="text-right">SPOC Phone Number</Label>
                <Input id="edit-spocNumber" value={editingIncubation.spocNumber} onChange={(e) => setEditingIncubation({ ...editingIncubation, spocNumber: e.target.value })} className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-spocEmail" className="text-right">SPOC Email</Label>
                <Input id="edit-spocEmail" value={editingIncubation.spocEmail} onChange={(e) => setEditingIncubation({ ...editingIncubation, spocEmail: e.target.value })} className="col-span-3" />
              </div>
              <div>
                <Label htmlFor="edit-description" className="text-right">Description</Label>
                <Textarea id="edit-description" value={editingIncubation.description} onChange={(e) => setEditingIncubation({ ...editingIncubation, description: e.target.value })} className="col-span-3" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleDeleteIncubation} className="bg-white text-black border border-black hover:bg-neutral-200">Delete</Button>
              <Button onClick={handleSaveIncubation} className="mr-2" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default Incubation;

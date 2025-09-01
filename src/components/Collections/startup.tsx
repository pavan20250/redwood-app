"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FaEye, FaSearch } from 'react-icons/fa';
import { PlusCircle, Trash } from "lucide-react";
import { STAGING_DATABASE_ID, STARTUP_ID } from "@/appwrite/config";
import { databases } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {nanoid} from "nanoid";
import { Query } from "appwrite";
import LoadingSpinner from "../ui/loading";

type Startup = {
  id: string;
  name: string;
  brandName: string;
  revenue: string;
  year: string;
};

type Document = {
  $id: string;
  [key: string]: any;
};

const StartupsPage: React.FC = () => {
  const [startups, setStartups] = useState<Startup[]>([]);
  const [filteredStartups, setFilteredStartups] = useState<Startup[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStartups, setSelectedStartups] = useState<string[]>([]);
  const [editingStartup, setEditingStartup] = useState<Startup | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [year, setYear] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [brandNameError, setBrandNameError] = useState<string | null>(null);

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();

  // On mount and when path changes, handle page param only on /startup
  useEffect(() => {
    if (!searchParams || !pathname) return;
    if (pathname === "/startup") {
      const pageParam = searchParams.get("page");
      if (pageParam && !isNaN(Number(pageParam))) {
        setCurrentPage(Number(pageParam));
      }
    } else {
      setCurrentPage(1);
      // Remove ?page param from URL if present
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (params.has("page")) {
        params.delete("page");
        router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ""}`, { scroll: false });
      }
    }
  }, [searchParams, pathname, router]);

  // When currentPage changes, update the URL query param (shallow routing) only on /startup
  useEffect(() => {
    if (!searchParams || !pathname) return;
    if (pathname === "/startup") {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", currentPage.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  }, [currentPage, searchParams, pathname, router]);

  useEffect(() => {
    const fetchStartups = async () => {
      setLoading(true);
      try {
        const response = await databases.listDocuments(STAGING_DATABASE_ID, STARTUP_ID, [Query.limit(300)]);
        const startupData = response.documents.map((doc: Document) => ({
          id: doc.$id,
          name: doc.name || "",
          brandName: doc.brandName || "",
          revenue: doc.revenue || "0",
          year: doc.year || "",
        }));
        setStartups(startupData);
        setFilteredStartups(startupData);
      } catch (error) {
        console.error("Error fetching startups:", error);
      }finally {
        setLoading(false);
      }
    };
    fetchStartups();
  }, []);

  useEffect(() => {
    const filtered = startups.filter((startup) =>
      startup.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      startup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      startup.year.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStartups(filtered);
  }, [searchTerm, startups]);

  const createAndRedirect = async (newStartupData: Partial<Startup>) => {
    if (nameError || brandNameError) {
      toast({
        variant: "destructive",
        title: "Please resolve duplication errors before submitting.",
      });
      return;
    }
    const shortUUID = nanoid(6);
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const createdStartup = await databases.createDocument(STAGING_DATABASE_ID, STARTUP_ID, shortUUID, { ...newStartupData, year: formattedDate });
      setShowAddDialog(false);
      router.push(`/startup/${createdStartup.$id}`);
    } catch (error) {
      console.error("Error adding startup:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create startup. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveSelected = async () => {
    try {
      await Promise.all(
        selectedStartups.map((id) => databases.deleteDocument(STAGING_DATABASE_ID, STARTUP_ID, id))
      );
      setStartups((prev) => prev.filter((startup) => !selectedStartups.includes(startup.id)));
      setFilteredStartups((prev) => prev.filter((startup) => !selectedStartups.includes(startup.id)));
      setSelectedStartups([]);
    } catch (error) {
      console.error("Error deleting startups:", error);
    }
    toast({
      variant: "destructive",
      title: "Startup Record Deleted",
    });
  };

  const handleViewStartup = (id: string) => {
    router.push(`/startup/${id}`);
  };

  const toggleStartupSelection = (id: string) => {
    setSelectedStartups((prev) =>
      prev.includes(id) ? prev.filter((startupId) => startupId !== id) : [...prev, id]
    );
  };

  const handleEditStartup = (startup: Startup) => {
    setEditingStartup(startup);
    setYear(startup.year);
    setShowEditDialog(true);
  };

  const handleSaveChanges = async (updatedStartupData: Startup) => {
    try {
      await databases.updateDocument(STAGING_DATABASE_ID, STARTUP_ID, updatedStartupData.id, {
        name: updatedStartupData.name,
        brandName: updatedStartupData.brandName,
        year: formattedDate,
      });
      setStartups((prev) =>
        prev.map((startup) =>
          startup.id === updatedStartupData.id ? { ...updatedStartupData, year: formattedDate } : startup
        )
      );
      setFilteredStartups((prev) =>
        prev.map((startup) =>
          startup.id === updatedStartupData.id ? { ...updatedStartupData, year: formattedDate } : startup
        )
      );
      setShowEditDialog(false);
      setEditingStartup(null);
      toast({
        title: "Success",
        description: "Startup details updated successfully.",
      });
    } catch (error) {
      console.error("Error updating startup:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update startup. Please try again.",
      });
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enteredName = e.target.value.trim();
    const isDuplicate = startups.some(
      (startup) => startup.name.toLowerCase() === enteredName.toLowerCase()
    );

    if (isDuplicate) {
      setNameError("A startup with this name already exists.");
    } else {
      setNameError(null);
    }
  };

  const handleBrandNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enteredBrandName = e.target.value.trim();
    const isDuplicate = startups.some(
      (startup) =>
        startup.brandName.toLowerCase() === enteredBrandName.toLowerCase()
    );

    if (isDuplicate) {
      setBrandNameError("A startup with this brand name already exists.");
    } else {
      setBrandNameError(null);
    }
  };
  
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });

  // pagination calculation
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentStartups = filteredStartups.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredStartups.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="p-2 mx-auto">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
        <h1 className="text-2xl font-semibold">Startups</h1>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            {/*<div className="flex items-center border border-gray-200 rounded-full cursor-pointer p-1 hover:border-green-500 space-x-1">
                <PlusCircle size={15} className="cursor-pointer"/>
                <span className="text-xs">Add</span>
            </div>*/}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Startup</DialogTitle>
              <DialogDescription>
                Fill in the details to add a new startup.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const newStartupData = Object.fromEntries(formData.entries());
                createAndRedirect(newStartupData as Partial<Startup>);
              }}
            >
              <div className="grid grid-rows-1 gap-1">
              <div>
              <Label>Startup Name</Label>
              <Input
                type="text"
                name="name"
                placeholder="Startup Name"
                className={`w-full p-2 mb-2 border rounded ${
                  nameError ? "border-red-500" : ""
                }`}
                required
                autoComplete="off"
                onChange={handleNameChange}
              />
              {nameError && (
                <p className="text-red-500 text-sm">{nameError}</p>
              )}
            </div>
              <div>
              <Label>Brand Name</Label>
              <Input
                type="text"
                name="brandName"
                placeholder="Brand Name"
                className={`w-full p-2 mb-2 border rounded ${
                  brandNameError ? "border-red-500" : ""
                }`}
                required
                autoComplete="off"
                onChange={handleBrandNameChange}
              />
              {brandNameError && (
                <p className="text-red-500 text-sm">{brandNameError}</p>
              )}
            </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  name="year"
                  value={formattedDate}
                  readOnly
                  className="w-full p-2 mb-2 border rounded"
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Startup"}
                </Button>
              </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <>
          <span onClick={handleRemoveSelected} className="flex items-center border border-gray-200 rounded-full cursor-pointer p-1 hover:border-red-500 space-x-1">
            <Trash size={15}/>
            <span className="text-xs">Remove</span>
          </span>
        </>
        </div>
        <div className="relative">
        <Input
          type="text"
          placeholder="Search by Startup Name, or Year"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-72 text-xs pl-10 pr-4 py-2 border rounded-lg"
        />
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      </div>
       {/* Loading Indicator */}
      {loading ? (
        <div>
          <LoadingSpinner />
        </div>
      ) : (
      <div className="bg-white shadow-md rounded-lg border border-gray-300">
        <div className="flex items-center justify-end p-2 space-x-2">
          <Label>Items per page:</Label>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              setItemsPerPage(Number(value));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[70px]">
              <SelectValue placeholder="10" />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50].map((number) => (
                <SelectItem key={number} value={number.toString()}>
                  {number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-6">Select</TableHead>
              <TableHead className="w-10">View</TableHead>
              <TableHead className="w-auto">Startup Name</TableHead>
              <TableHead className="w-auto">Brand Name</TableHead>
              <TableHead>Year</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentStartups.map((startup) => (
              <TableRow key={startup.id} onDoubleClick={() => handleEditStartup(startup)}>
                <TableCell>
                  <Checkbox
                    checked={selectedStartups.includes(startup.id)}
                    onCheckedChange={() => toggleStartupSelection(startup.id)}
                  />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleViewStartup(startup.id)}
                    className="bg-transparent text-gray-600 hover:text-blue-700 px-2 py-1 border border-transparent transition-colors duration-200 ease-in-out disabled:opacity-50"
                    title="View Startup"
                  >
                    <FaEye size={18} />
                  </button>
                </TableCell>
                
                <TableCell
                  onClick={() => handleViewStartup(startup.id)}
                  className="cursor-pointer hover:text-blue-700"
                >{startup.name}</TableCell>
                <TableCell>{startup.brandName}</TableCell>
                <TableCell>{startup.year}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination Controls */}
        <div className="flex items-center justify-between p-4 border-t">
          <div className="text-sm text-gray-500">
            Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredStartups.length)} of {filteredStartups.length} entries
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {/* Condensed Pagination Logic */}
            {(() => {
              const pageButtons = [];
              const pageNeighbors = 2; // how many neighbors to show on each side
              let startPage = Math.max(2, currentPage - pageNeighbors);
              let endPage = Math.min(totalPages - 1, currentPage + pageNeighbors);

              // Always show first page
              pageButtons.push(
                <Button
                  key={1}
                  variant={currentPage === 1 ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(1)}
                >
                  1
                </Button>
              );

              // Show left ellipsis if needed
              if (startPage > 2) {
                pageButtons.push(
                  <span key="start-ellipsis" className="px-1">...</span>
                );
              }

              // Show middle page numbers
              for (let i = startPage; i <= endPage; i++) {
                pageButtons.push(
                  <Button
                    key={i}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(i)}
                  >
                    {i}
                  </Button>
                );
              }

              // Show right ellipsis if needed
              if (endPage < totalPages - 1) {
                pageButtons.push(
                  <span key="end-ellipsis" className="px-1">...</span>
                );
              }

              // Always show last page if more than one
              if (totalPages > 1) {
                pageButtons.push(
                  <Button
                    key={totalPages}
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </Button>
                );
              }

              return pageButtons;
            })()}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>)}

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Startup</DialogTitle>
            <DialogDescription>
              Edit the details of the startup.
            </DialogDescription>
          </DialogHeader>
          {editingStartup && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const updatedStartupData = {
                  ...editingStartup,
                  ...Object.fromEntries(formData.entries()),
                } as Startup;
                handleSaveChanges(updatedStartupData);
              }}
            >
              <Label>Startup Name</Label>
              <Input type="text" name="name" placeholder="Startup Name" className="w-full p-2 mb-2 border rounded" defaultValue={editingStartup.name} required />
              <Label>Brand Name</Label>
              <Input type="text" name="brandName" placeholder="Brand Name" className="w-full p-2 mb-2 border rounded" defaultValue={editingStartup.brandName} required />
              
              <div className="flex justify-end">
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StartupsPage;

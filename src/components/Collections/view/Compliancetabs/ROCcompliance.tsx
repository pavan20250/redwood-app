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
import { SHAREHOLDERS_ID } from "../FundingMilestonestabs/Shareholders";
import { ChevronRightIcon } from "lucide-react";

export const ROC_ID = "6739c2c40032254ca4b6";
export const FORMS_ID = "67b45189001e40764c83";

interface RocComplianceProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

interface AssociatedCompany {
  regnameofcomapany: string;
  cin: string;
  natureofcomapny: string;
  role: string;
}

const RocCompliance: React.FC<RocComplianceProps> = ({ startupId, setIsDirty }) => {
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [editingCompliance, setEditingCompliance] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCompliance, setNewCompliance] = useState({
    query: "",
    yesNo: "",
    date: "",
    description: "",
  });
  const [queryOptions, setQueryOptions] = useState<string[]>([]);
  const [natureOfCompany, setNatureOfCompany] = useState<string>("");
  const [formsData, setFormsData] = useState<any[]>([]);
  const [missingDocuments, setMissingDocuments] = useState<string[]>([]);
  const [shareholders, setShareholders] = useState<any[]>([]);
  const [editingShareholder, setEditingShareholder] = useState<any>(null);
  const [isShareholderDialogOpen, setIsShareholderDialogOpen] = useState(false);
  const [associatedCompanies, setAssociatedCompanies] = useState<
    AssociatedCompany[]
  >([]);
  const [newAssociatedCompany, setNewAssociatedCompany] = useState<
    AssociatedCompany
  >({
    regnameofcomapany: "",
    cin: "",
    natureofcomapny: "",
    role: "",
  });
  const [isAddingNewCompany, setIsAddingNewCompany] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [selectedAssociatedCompany, setSelectedAssociatedCompany] = useState<string>("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAssociatedCompaniesTable, setShowAssociatedCompaniesTable] = useState(false);
  const isStartupRoute = useIsStartupRoute();

  const [rocChecklistGenerated, setRocChecklistGenerated] = useState<boolean | null>(null);
  const hasRunChecklist = useRef(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState(false);

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
        const collectionId = isStartupRoute ? ROC_ID : ROC_ID;

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
        //Fetch natureOfCompany from Startups
        const startupResponse = await databases.getDocument(
          STAGING_DATABASE_ID,
          STARTUP_ID,
          startupId
        );
        setNatureOfCompany(startupResponse.natureOfCompany);
        setRocChecklistGenerated(startupResponse.rocChecklistGenerated ?? false);
      } catch (error) {
        console.error("Error fetching compliance data:", error);
      }
    };

    const fetchShareholders = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          SHAREHOLDERS_ID,
          [Query.equal("startupId", startupId)]
        );
        const filtered = response.documents.map((doc) => ({
          $id: doc.$id,
          shareholderName: doc.shareholderName,
          directorId: doc.directorId,
          associatedCompany: doc.associatedCompany,
          companyDetails: doc.companyDetails || [], 
        }));
        setShareholders(filtered);
      } catch (error) {
        console.error("Error fetching shareholders:", error);
      }
    };
    fetchShareholders();
    fetchComplianceData();
  }, [startupId, isStartupRoute]);

  // Fetch dynamic query options based on natureOfCompany
  useEffect(() => {
    const fetchQueryOptions = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          FORMS_ID,
          [
            Query.equal("natureOfCompany", natureOfCompany), // Filter by natureOfCompany
            Query.equal("types", "roc"),
          ]
        );
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

  // --- MAIN LOGIC: Auto-generate ROC checklist ---
  useEffect(() => {
    const generateRocChecklistIfNeeded = async () => {
      if (
        rocChecklistGenerated === false &&
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
            ROC_ID,
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
          { rocChecklistGenerated: true }
        );
        setRocChecklistGenerated(true);

        // Refresh compliance data
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          ROC_ID,
          [Query.equal("startupId", startupId)]
        );
        setComplianceData(response.documents);
        setIsGeneratingChecklist(false);
      }
      
    };
    generateRocChecklistIfNeeded();
  }, [
    rocChecklistGenerated,
    natureOfCompany,
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
      return formData.yesNo[index] || "";
    }
    return "";
  };

  //when editing
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
        ROC_ID,
        editingCompliance.$id,
        updateData
      );
      // Update local state with saved data
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
        ROC_ID,
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
      const description = getDescriptionForYesNo(value, editingCompliance.query);
      setEditingCompliance({
        ...editingCompliance,
        yesNo: value,
        description: description,
      });
    }
  };

  // Determine if all documents are created
  const allDocumentsCreated =
    queryOptions.length > 0 &&
    queryOptions.every((query) =>
      complianceData.some((doc) => doc.query === query)
    );

  // Shareholder functions
  const handleShareholderDoubleClick = (shareholder: any) => {
    setEditingShareholder(shareholder);
    setIsShareholderDialogOpen(true);
    setHasUnsavedChanges(true);
    // Initialize associated companies when dialog opens
    if (shareholder.companyDetails && Array.isArray(shareholder.companyDetails)) {
      setAssociatedCompanies(
        shareholder.companyDetails.map((detail: string) => {
          const [regnameofcomapany, cin, natureofcomapny, role] =
            detail.split("-");
          return { regnameofcomapany, cin, natureofcomapny, role };
        })
      );
      setSelectedAssociatedCompany(
        shareholder.associatedCompany !== undefined && shareholder.associatedCompany !== null
          ? shareholder.associatedCompany
          : ""
      );
    } else {
      setAssociatedCompanies([]);
    }
  };

  const handleSaveShareholder = async () => {
    if (!editingShareholder) return;
    setHasUnsavedChanges(false);
    try {
      // Convert associatedCompanies to the string array format
      const companyDetails = associatedCompanies.map(
        (company) =>
          `${company.regnameofcomapany}-${company.cin}-${company.natureofcomapny}-${company.role}`
      );

      await databases.updateDocument(
        STAGING_DATABASE_ID,
        SHAREHOLDERS_ID,
        editingShareholder.$id,
        {
          companyDetails: companyDetails,
          associatedCompany: selectedAssociatedCompany,
        }
      );

      // Update local state with saved data
      const updatedShareholders = shareholders.map((shareholder) =>
        shareholder.$id === editingShareholder.$id
          ? { ...shareholder, 
            companyDetails: companyDetails,
            associatedCompany: selectedAssociatedCompany,
           }
          : shareholder
      );
      setShareholders(updatedShareholders);
      setIsShareholderDialogOpen(false);
      setEditingShareholder(null);
    } catch (error) {
      console.error("Error saving shareholder data:", error);
    }
  };


  const handleCancelNewAssociatedCompany = () => {
    setIsAddingNewCompany(false);
    setNewAssociatedCompany({
      regnameofcomapany: "",
      cin: "",
      natureofcomapny: "",
      role: "",
    });
  };

  const handleRemoveAssociatedCompany = (index: number) => {
    const newCompanies = [...associatedCompanies];
    newCompanies.splice(index, 1);
    setAssociatedCompanies(newCompanies);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
    field: string
  ) => {
    const { value } = e.target;
    const updatedCompanies = [...associatedCompanies];
    updatedCompanies[index] = {
      ...updatedCompanies[index],
      [field]: value,
    };
    setAssociatedCompanies(updatedCompanies);
    setHasUnsavedChanges(true);
  };

  const handleNewInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    field: string
  ) => {
    setHasUnsavedChanges(true);
    const { value } = e.target;
    setNewAssociatedCompany({
      ...newAssociatedCompany,
      [field]: value,
    });
  };
  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };
  const handleAssociatedCompanyChange = (value: string) => {
    setSelectedAssociatedCompany(value);
  };
  const closeDialog = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsShareholderDialogOpen(false);
        setHasUnsavedChanges(false);
      }
    } else {
      setIsShareholderDialogOpen(false);
    }
  }, [hasUnsavedChanges, setIsShareholderDialogOpen]);

  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2 p-2">
          <h3 className="text-lg font-medium">ROC Compliance</h3>
          {isGeneratingChecklist && (
            <span className="text-sm text-gray-500 border border-gray-50 p-1">
              generating queries..
            </span>
          )}
        </div>
      </div>
      <div className="p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Table>
          <TableCaption>ROC Compliance Information</TableCaption>
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
      <div className="mt-4 p-2 bg-white shadow-md rounded-lg border border-gray-300">
        <Label>Associated Companies</Label>
        <Table>
          <TableCaption></TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Shareholder Name</TableHead>
              <TableHead>DIN (Director Identification Number).</TableHead>
              <TableHead>Any Associated Company</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shareholders.map((shareholder, idx) => (
              <React.Fragment key={idx}>
                <TableRow
                  onDoubleClick={() => handleShareholderDoubleClick(shareholder)}
                >
                  <TableCell>{shareholder.shareholderName}</TableCell>
                  <TableCell>{shareholder.directorId}</TableCell>
                  <TableCell>{shareholder.associatedCompany}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRow(shareholder.$id)}
                    >
                      <ChevronRightIcon
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedRow === shareholder.$id ? "rotate-90" : ""
                        }`}
                      />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedRow === shareholder.$id && (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <div className="border border-gray-300 rounded-xl p-2">
                    <Table>
                        <TableHeader className="bg-gray-100">
                          <TableRow>
                            <TableHead>Company Name</TableHead>
                            <TableHead>CIN/LLPIN</TableHead>
                            <TableHead>Nature of Company</TableHead>
                            <TableHead>Role of Individual</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shareholder.companyDetails &&
                            shareholder.companyDetails.length > 0 ? (
                            shareholder.companyDetails.map(
                              (detail: string, index: number) => {
                                const [
                                  regnameofcomapany,
                                  cin,
                                  natureofcomapny,
                                  role,
                                ] = detail.split("-");
                                return (
                                  <TableRow key={index}>
                                    <TableCell>{regnameofcomapany}</TableCell>
                                    <TableCell>{cin}</TableCell>
                                    <TableCell>{natureofcomapny}</TableCell>
                                    <TableCell>{role}</TableCell>
                                  </TableRow>
                                );
                              }
                            )
                          ) : (
                            <TableRow>
                              <TableCell colSpan={4}>
                                The director is not associated with any other company/LLP
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
      </Table>
      </div>
      {editingCompliance && (
        <Dialog
          open={!!editingCompliance}
          onOpenChange={() => setEditingCompliance(null)}
        >
          <DialogContent className="w-full max-w-4xl">
            <DialogHeader>
              {editingCompliance.query && (
                <DialogTitle>{editingCompliance.query}</DialogTitle>
              )}
              <DialogDescription></DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-4 gap-4">
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
                  value={editingCompliance.date}
                  max={new Date().toISOString().slice(0, 7)}
                  onChange={(e) =>
                    setEditingCompliance({
                      ...editingCompliance,
                      date: e.target.value,
                    })
                  }
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
                  onChange={(e) =>
                    setEditingCompliance({
                      ...editingCompliance,
                      description: e.target.value,
                    })
                  }
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
      {/* Shareholder Edit Dialog */}
      <Dialog
        open={isShareholderDialogOpen}
        onOpenChange={closeDialog}
      >
        <DialogContent className="w-full max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Shareholder</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="w-1/4">
          <Label>Any Associated Companies</Label>
          <Select
            value={selectedAssociatedCompany || ""}
            onValueChange={(value) => {
              setSelectedAssociatedCompany(value);
              setShowAssociatedCompaniesTable(value === "Yes");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" defaultValue={"No"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Yes">Yes</SelectItem>
              <SelectItem value="No">No</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showAssociatedCompaniesTable && (
          <div className="border border-gray-300 rounded-xl p-2"
          style={{display: selectedAssociatedCompany === "No" ? "none" : "block"}}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>CIN/LLPIN</TableHead>
                  <TableHead>Nature of Company</TableHead>
                  <TableHead>Role of Individual</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {associatedCompanies.map((company, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Company Name"
                        value={company.regnameofcomapany}
                        onChange={(e) =>
                          handleInputChange(e, index, "regnameofcomapany")
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="CIN"
                        value={company.cin}
                        onChange={(e) => handleInputChange(e, index, "cin")}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Nature of Company"
                        value={company.natureofcomapny}
                        onChange={(e) =>
                          handleInputChange(e, index, "natureofcomapny")
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Role"
                        value={company.role}
                        onChange={(e) => handleInputChange(e, index, "role")}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRemoveAssociatedCompany(index)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {isAddingNewCompany && (
                  <TableRow>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Company Name"
                        value={newAssociatedCompany.regnameofcomapany}
                        onChange={(e) =>
                          handleNewInputChange(e, "regnameofcomapany")
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="CIN"
                        value={newAssociatedCompany.cin}
                        onChange={(e) => handleNewInputChange(e, "cin")}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Nature of Company"
                        value={newAssociatedCompany.natureofcomapny}
                        onChange={(e) =>
                          handleNewInputChange(e, "natureofcomapny")
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        placeholder="Role"
                        value={newAssociatedCompany.role}
                        onChange={(e) => handleNewInputChange(e, "role")}
                      />
                    </TableCell>
                    <TableCell>
        
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleCancelNewAssociatedCompany}
                      >
                        Cancel
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <Button
              type="button"
              variant={"outline"}
              onClick={() => {
                setAssociatedCompanies([...associatedCompanies, newAssociatedCompany]);
                setNewAssociatedCompany({
                  regnameofcomapany: "",
                  cin: "",
                  natureofcomapny: "",
                  role: "",
                });
                setIsAddingNewCompany(false);
              }}
            >
              Add
            </Button>
          </div>
        )}
          <DialogFooter>
            <Button type="button" onClick={handleSaveShareholder}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default RocCompliance;

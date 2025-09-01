"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Query } from "appwrite";
import { API_ENDPOINT, PROJECT_ID, STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { client, databases, useIsStartupRoute } from "@/lib/utils";
import { Storage } from "appwrite";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import ButtonWithIcon from "@/lib/addButton";
import { ChevronRightIcon, Trash2, UploadCloud } from "lucide-react";
import { FUND_DOCUMENTS_ID } from "./FundRaised";
import { FaEye } from "react-icons/fa";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const SHAREHOLDERS_ID = "6735cb6f001a18acd88f";

interface ShareholdersProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}
interface EducationRow {
  qualification: string;
  institution: string;
  fromDate: string;
  toDate: string;
}
interface WorkExperienceRow {
  organisation: string;
  positionDescription: string;
  fromDate: string;
  toDate: string;
}



const ShareholderPage: React.FC<ShareholdersProps> = ({ startupId, setIsDirty }) => {
  const [data, setData] = useState<{ [key: string]: string | null }>({});
  const [allShareholders, setAllShareholders] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShareholder, setEditingShareholder] = useState<any>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const storage = useMemo(() => new Storage(client), []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [educationRows, setEducationRows] = useState<EducationRow[]>([]);
  const [workExperienceRows, setWorkExperienceRows] = useState<WorkExperienceRow[]>([]);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isStartupRoute = useIsStartupRoute();


  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  const fetchData = useCallback(async () => {
    try {
      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? SHAREHOLDERS_ID : SHAREHOLDERS_ID;

      const response = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("startupId", startupId)]
      );
      const shareholders = response.documents.map((doc) => ({
        ...doc,
        educationalQualifications: doc.educationalQualifications || [],
      }));
      setAllShareholders(response.documents);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [startupId, isStartupRoute]);

  useEffect(() => {
    if (startupId) fetchData();
  }, [startupId, fetchData]);

  useEffect(() => {
    if (editingShareholder) {
      setData(editingShareholder);
      setHasUnsavedChanges(true);
    } else {
      setData({});
      setHasUnsavedChanges(false);
    }
    setErrors({});
  }, [editingShareholder]);

  const handleSave = async () => {
    if (isSubmitting) return; 
    setIsSubmitting(true);
    
    let validationErrors: { [key: string]: string } = {};

    if (!data["shareholderName"]) {
      validationErrors["shareholderName"] = "Shareholder Name is required";
    }
    if (!data["email"]) {
      validationErrors["email"] = "Email is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data["email"])) {
        validationErrors["email"] = "Invalid email format";
      }
    }
    if (!data["phone"]) {
      validationErrors["phone"] = "Phone number is required";
    } else {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(data["phone"])) {
        validationErrors["phone"] = "Phone number must be 10 digits";
      }
    }

    if (data["isPartner"] === "Yes" && !data["directorId"]) {
      validationErrors["directorId"] = "Director ID is required";
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setIsSubmitting(false);
      return;
    }

    try {
      const educationalQualifications = educationRows.map(
        (row) => `${row.qualification} at ${row.institution} (${row.fromDate} - ${row.toDate})`
      );

      const formattedWorkExperience = workExperienceRows.map(
        (row) => `${row.organisation} as ${row.positionDescription} (${row.fromDate} - ${row.toDate})`
    );
    

      const { $id, $databaseId, $collectionId, $createdAt, $updatedAt, ...dataToUpdate } = data;
      const updatedData = { ...dataToUpdate, educationalQualifications, workExperience: formattedWorkExperience };

      if (editingShareholder) {
        await databases.updateDocument(STAGING_DATABASE_ID, SHAREHOLDERS_ID, editingShareholder.$id, updatedData);
      } else {
        await databases.createDocument(STAGING_DATABASE_ID, SHAREHOLDERS_ID, "unique()", { startupId, ...updatedData });
      }
      setData({});
      setEditingShareholder(null);
      setIsDialogOpen(false);
      setErrors({});
      setHasUnsavedChanges(false);
      fetchData();
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setData((prevData) => ({ ...prevData, [field]: value }));
    setErrors((prevErrors) => ({ ...prevErrors, [field]: "" }));
    setHasUnsavedChanges(true);

    if (field === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        setErrors((prevErrors) => ({ ...prevErrors, email: "Invalid email format" }));
      }
    }
    if (field === "phone") {
      const phoneRegex = /^\d{10}$/;
      if (!phoneRegex.test(value)) {
        setErrors((prevErrors) => ({ ...prevErrors, phone: "Phone number must be 10 digits" }));
      }
    }
  };

  const handleDelete = async () => {
    if (editingShareholder) {
      try {
        await databases.deleteDocument(
          STAGING_DATABASE_ID,
          SHAREHOLDERS_ID,
          editingShareholder.$id
        );
        setIsDialogOpen(false);
        setEditingShareholder(null);
        setHasUnsavedChanges(false);
        fetchData();
      } catch (error) {
        console.error("Error deleting shareholder:", error);
      }
    }
  };

  const handleDoubleTap = (shareholder: any) => {
    setEditingShareholder(shareholder);
    setIsDialogOpen(true);
  
    // Parse educational qualifications into rows
    const parsedEducationRows = shareholder.educationalQualifications?.map((qualification: string) => {
      const [qual, rest] = qualification.split(" at ");
      const [institution, dateRange] = rest?.split(" (") || [];
      const [fromDate, toDate] = dateRange?.replace(")", "").split(" - ") || [];
      return { qualification: qual || "", institution: institution || "", fromDate: fromDate || "", toDate: toDate || "" };
    }) || [];
    const parsedWorkExperienceRows = shareholder.workExperience?.map((experience: string) => {
      const [org, rest] = experience.split(" as ");
      const [positionDescription, dateRange] = rest?.split(" (") || [];
      const [fromDate, toDate] = dateRange?.replace(")", "").split(" - ") || [];
      return { organisation: org || "", positionDescription: positionDescription || "", fromDate: fromDate || "", toDate: toDate || "" };
  }) || [];
  
    setWorkExperienceRows(parsedWorkExperienceRows);
    setEducationRows(parsedEducationRows);
    setHasUnsavedChanges(false);
  };
  
  const handleEducationChange = (index: number, field: keyof EducationRow, value: string) => {
    const updatedRows = [...educationRows];
    updatedRows[index][field] = value;
    setEducationRows(updatedRows);
    setHasUnsavedChanges(true);
  };
  

  const addEducationRow = () => {
    setEducationRows([
      ...educationRows,
      { qualification: "", institution: "", fromDate: "", toDate: "" },
    ]);
    setHasUnsavedChanges(true);
  };
  
  const educationalQualifications = educationRows.map(
    (row) => `${row.qualification} at ${row.institution} (${row.fromDate} - ${row.toDate})`
  );
  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };
  const handleWorkExperienceChange = (index: number, field: keyof WorkExperienceRow, value: string) => {
    const updatedRows = [...workExperienceRows];
    updatedRows[index][field] = value;
    setWorkExperienceRows(updatedRows);
    setHasUnsavedChanges(true);
  };
  const addWorkExperienceRow = () => {
    setWorkExperienceRows([
        ...workExperienceRows,
        { organisation: "", positionDescription: "", fromDate: "", toDate: "" },
    ]);
    setHasUnsavedChanges(true);
  };
  const formattedWorkExperience = workExperienceRows.map(
    (row) => `${row.organisation} as ${row.positionDescription} (${row.fromDate} - ${row.toDate})`
  );
  const removeEducationRow = (index: number) => {
    const updatedRows = educationRows.filter((_, i) => i !== index);
    setEducationRows(updatedRows);
    setHasUnsavedChanges(true);
  };
  
  const removeWorkExperienceRow = (index: number) => {
    const updatedRows = workExperienceRows.filter((_, i) => i !== index);
    setWorkExperienceRows(updatedRows);
    setHasUnsavedChanges(true);
  };

  const handleDialogClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsDialogOpen(false);
        setEditingShareholder(null);
        setErrors({});
        setData({});
        setEducationRows([]);
        setWorkExperienceRows([]);
        setHasUnsavedChanges(false);
      }
    } else {
      setIsDialogOpen(false);
      setEditingShareholder(null);
      setErrors({});
      setData({});
      setEducationRows([]);
      setWorkExperienceRows([]);
    }
  }, [hasUnsavedChanges, setIsDialogOpen, setEditingShareholder, setErrors, setData, setEducationRows, setWorkExperienceRows, setHasUnsavedChanges]);
  
  const handleCommunityCertificateUpload = async (file: File, shareholderId: string) => {
    if (!file || !shareholderId) {
      console.warn("No file or no shareholder ID provided for upload");
      return;
    }
    setUploading(true);
    try {
      // 1. Upload file to storage
      const uploaded = await storage.createFile(
        FUND_DOCUMENTS_ID,
        "unique()",
        file
      );
      // 2. Update shareholder document with fileId and fileName
      await databases.updateDocument(
        STAGING_DATABASE_ID,
        SHAREHOLDERS_ID,
        shareholderId,
        {
          communityCertificateFileId: uploaded.$id,
          communityCertificateFileName: file.name,
        }
      );
      // 3. Refresh data
      fetchData();
    } catch (error) {
      console.error("File upload failed:", error);
      alert("File upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async (shareholderId: string, fileId: string) => {
    if (!shareholderId || !fileId) return;
    setUploading(true);
    try {
      // 1. Delete file from storage
      await storage.deleteFile(FUND_DOCUMENTS_ID, fileId);
  
      // 2. Remove file reference from shareholder document
      await databases.updateDocument(
        STAGING_DATABASE_ID,
        SHAREHOLDERS_ID,
        shareholderId,
        {
          communityCertificateFileId: null,
          communityCertificateFileName: null,
        }
      );
  
      fetchData();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      setUploading(false);
    }
  };  
  

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="container text-lg font-medium mb-2 -mt-4">Shareholders</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (!open) {
            handleDialogClose();
          } else {
            setIsDialogOpen(open);
            if (!editingShareholder) {
              setData({});
              setEducationRows([]);
              setWorkExperienceRows([]);
              setHasUnsavedChanges(false);
            }
          }
        }}>
          <DialogTrigger asChild>
            <button>
              <div className="relative group">
                { !isStartupRoute && (
                <ButtonWithIcon label="Add" />
                )}
              </div>
            </button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingShareholder ? 'Edit Shareholder' : 'Add Shareholder'}</DialogTitle>
              <DialogDescription aria-describedby={undefined}>
              </DialogDescription>
            </DialogHeader>
            <form>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Shareholder Name<span className="text-red-500">*</span></Label>
                  <Input
                    id="shareholderName"
                    type="text"
                    placeholder="Shareholder Name"
                    value={data["shareholderName"] || ""}
                    onChange={(e) => handleChange("shareholderName", e.target.value)}
                  />
                  {errors.shareholderName && (
                    <p className="text-red-500 text-sm mt-1">{errors.shareholderName}</p>
                  )}
                </div>
                
                <div>
                  <Label>Gender</Label>
                  <Select
                    value={data["gender"] || ""}
                    onValueChange={(value) => handleChange("gender", value)}
                  >
                    <SelectTrigger className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>LinkedIn Profile</Label>
                  <Input
                    id="linkedinProfile"
                    type="url"
                    placeholder="url:"
                    value={data["linkedinProfile"] || ""}
                    onChange={(e) => handleChange("linkedinProfile", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Is Partner/Director?</Label>
                  <Select
                    value={data["isPartner"] || ""}
                    onValueChange={(value) => handleChange("isPartner", value)}
                  >
                    <SelectTrigger className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full">
                      <SelectValue placeholder="Partner/Director" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Yes">Yes</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Director Identification Number{data["isPartner"] === "Yes" && (<span className="text-red-500">*</span>)}</Label>
                  <Input
                    id="directorId"
                    type="text"
                    placeholder="Identification Number"
                    value={data["directorId"] || ""}
                    onChange={(e) => handleChange("directorId", e.target.value)}
                  />
                  {errors.directorId && (
                    <p className="text-red-500 text-sm mt-1">{errors.directorId}</p>
                  )}
                </div>
                <div>
                  <Label>Phone<span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Phone"
                    value={data["phone"] || ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, '');
                      const limitedValue = rawValue.slice(0, 10);
                      handleChange("phone", limitedValue);
                    }}
                  />
                  {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                </div>
                <div>
                  <Label>Email<span className="text-red-500">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Email"
                    value={data["email"] || ""}
                    onChange={(e) => handleChange("email", e.target.value)}
                  />
                  {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="border border-gray-300 rounded-xl p-4">
                  <Label>Educational Qualifications</Label>
                  <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Qualification</TableHead>
                      <TableHead>Institution</TableHead>
                      <TableHead>From Date</TableHead>
                      <TableHead>To Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {educationRows.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            placeholder="Qualification"
                            value={row.qualification}
                            onChange={(e) =>
                              handleEducationChange(index, "qualification", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            placeholder="Institution"
                            value={row.institution}
                            onChange={(e) =>
                              handleEducationChange(index, "institution", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.fromDate}
                            onChange={(e) =>
                              handleEducationChange(index, "fromDate", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.toDate}
                            onChange={(e) =>
                              handleEducationChange(index, "toDate", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            type="button"
                            onClick={() => removeEducationRow(index)}
                          >
                            -
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Button variant={"outline"} type="button" onClick={addEducationRow} className="mt-2">
                  Add Row
                </Button>
                </div>
                <div>
                <div className="border border-gray-300 rounded-xl p-4">
                  <Label>Work Experience</Label>
                  <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organisation</TableHead>
                            <TableHead>Position Description</TableHead>
                            <TableHead>From Date</TableHead>
                            <TableHead>To Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {workExperienceRows.map((row, index) => (
                            <TableRow key={index}>
                                <TableCell>
                                    <Input
                                        placeholder="Organisation"
                                        value={row.organisation}
                                        onChange={(e) =>
                                            handleWorkExperienceChange(index, "organisation", e.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        placeholder="Position Description"
                                        value={row.positionDescription}
                                        onChange={(e) =>
                                            handleWorkExperienceChange(index, "positionDescription", e.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        placeholder="From Date"
                                        value={row.fromDate}
                                        onChange={(e) =>
                                            handleWorkExperienceChange(index, "fromDate", e.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                    <Input
                                        placeholder="To Date"
                                        value={row.toDate}
                                        onChange={(e) =>
                                            handleWorkExperienceChange(index, "toDate", e.target.value)
                                        }
                                    />
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    type="button"
                                    onClick={() => removeWorkExperienceRow(index)}
                                  >
                                    -
                                  </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                    <Button variant={"outline"} type="button" onClick={addWorkExperienceRow} className="mt-2">
                        Add Row
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4 space-x-2">
                {editingShareholder && (
                  <Button type="button" onClick={handleDelete} className="bg-white text-black border border-black hover:bg-neutral-200">
                    Delete
                  </Button>
                )}
                <Button type="button" onClick={handleSave} disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="mb-6 p-3 bg-white rounded-lg border border-gray-300">
        <Table>
          <TableCaption>A list of all shareholders for this startup</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              <TableHead>LinkedIn Profile</TableHead>
              <TableHead>Is Partner/Director</TableHead>
              <TableHead>Director ID</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allShareholders.map((shareholder) => (
              <React.Fragment key={shareholder.$id}>
              <TableRow
                key={shareholder.$id}
                onDoubleClick={() => handleDoubleTap(shareholder)}
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => toggleRow(shareholder.$id)}
              >
                <TableCell>{shareholder.shareholderName || "N/A"}</TableCell>
                <TableCell>{shareholder.gender || "N/A"}</TableCell>
                <TableCell>
                  {shareholder.linkedinProfile ? (
                    <a
                    href={
                      shareholder.linkedinProfile.startsWith("http")
                        ? shareholder.linkedinProfile
                        : `https://${shareholder.linkedinProfile}`
                    }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline"
                    >
                      LinkedIn
                    </a>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell>{shareholder.isPartner || "N/A"}</TableCell>
                <TableCell>{shareholder.directorId || "N/A"}</TableCell>
                <TableCell>{shareholder.email || "N/A"}</TableCell>
                <TableCell>{shareholder.phone || "N/A"}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(shareholder.$id);
                    }}
                  >
                    <ChevronRightIcon
                      className={`transition-transform ${
                        expandedRow === shareholder.$id ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </TableCell>
                  </TableRow>
                  {expandedRow === shareholder.$id && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <div>
                        {shareholder.educationalQualifications?.length > 0 ? (
                          <div className="border border-gray-300 rounded-xl p-4">
                          <Label>Educational Qualification</Label>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Qualification</TableHead>
                                <TableHead>Institution</TableHead>
                                <TableHead>From Date</TableHead>
                                <TableHead>To Date</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {shareholder.educationalQualifications.map((qualification: string, index: number) => {
                                // string formatted as "Qualification at Institution (FromDate - ToDate)"
                                const [qual, rest] = qualification.split(" at ");
                                const [institution, dateRange] = rest?.split(" (") || [];
                                const [fromDate, toDate] = dateRange?.replace(")", "").split(" - ") || [];

                                return (
                                  <TableRow key={index}>
                                    <TableCell>{qual || "N/A"}</TableCell>
                                    <TableCell>{institution || "N/A"}</TableCell>
                                    <TableCell>{fromDate || "N/A"}</TableCell>
                                    <TableCell>{toDate || "N/A"}</TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          </div>
                        ) : (
                          <p>No educational qualifications available.</p>
                        )}
                    {/* Work Experience */}
                    {shareholder.workExperience?.length > 0 && (
                      <div className="mt-4 border border-gray-300 rounded-xl p-4">
                          <Label>Work Experience</Label>
                          <Table>
                              <TableHeader>
                                  <TableRow>
                                      <TableHead>Organisation</TableHead>
                                      <TableHead>Position Description</TableHead>
                                      <TableHead>From Date</TableHead>
                                      <TableHead>To Date</TableHead>
                                  </TableRow>
                              </TableHeader>
                              <TableBody>
                                  {shareholder.workExperience.map((experience: string, index: number) => {
                                      const [org, rest] = experience.split(" as ");
                                      const [positionDescription, dateRange] = rest?.split(" (") || [];
                                      const [fromDate, toDate] = dateRange?.replace(")", "").split(" - ") || [];
                                      return (
                                          <TableRow key={index}>
                                              <TableCell>{org || "N/A"}</TableCell>
                                              <TableCell>{positionDescription || "N/A"}</TableCell>
                                              <TableCell>{fromDate || "N/A"}</TableCell>
                                              <TableCell>{toDate || "N/A"}</TableCell>
                                          </TableRow>
                                      );
                                  })}
                              </TableBody>
                          </Table>
                      </div>
                  )}
                  </div>
                </TableCell>
              </TableRow>
            )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <Label>Community Certificate</Label>
      <div className="border border-gray-300 rounded-xl bg-white p-4 w-1/2"> 
      <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shareholder Name</TableHead>
              <TableHead>Upload Document(Pdf only)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allShareholders.map((row, idx) => (
              <TableRow key={row.$id || idx}>
                <TableCell>{row.shareholderName || "N/A"}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {row.communityCertificateFileId ? (
                      <>
                        <a
                          href={`${API_ENDPOINT}/storage/buckets/${FUND_DOCUMENTS_ID}/files/${row.communityCertificateFileId}/view?project=${PROJECT_ID}`}
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
                        <span className="text-xs text-gray-500">{row.communityCertificateFileName}</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Trash2 size={16} className="text-gray-500 cursor-pointer hover:text-red-600" />
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteFile(row.$id, row.communityCertificateFileId)}
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
                              await handleCommunityCertificateUpload(e.target.files[0], row.$id);
                            }
                          }}
                        />
                        <UploadCloud size={20} className="cursor-pointer" />
                      </label>
                    )}
                  </div>
                  {errors.communityCertificate && (
                    <p className="text-red-500 text-sm mt-1">{errors.communityCertificate}</p>
                  )}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};

export default ShareholderPage;

"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EditIcon, SaveIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { databases, useIsStartupRoute } from "@/lib/utils";
import { API_ENDPOINT, BUCKET_ID, PROJECT_ID, PROJECTS_ID, STAGING_DATABASE_ID, STARTUP_DATABASE, STARTUP_ID } from "@/appwrite/config";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReactSelect from "react-select";
import Link from "next/link";
import { Query } from "appwrite";
import CreatableSelect from "react-select/creatable";
import { FaEye } from "react-icons/fa";
import { DOC_CHECKLIST_ID } from "../Documentstabs/DocumentsChecklist";



interface StartupData {
  [key: string]: string | string[];
  brandName: string;
  dateOfIncorporation: string;
  companyStage: string;
  businessType: string;
  businessModel: string[];
  patentsCertifications: string;
  registeredState: string;
  registeredCompanyName: string;
  domain: string;
  incubated: string;
  revenue: string;
  natureOfCompany: string;
  registeredCountry: string;
  subDomain: string;
  employees: string;
}

interface CompanyDetailsProps {
  startupId: string | undefined;
  setIsDirty: (isDirty: boolean) => void;
}
type DomainOption = {
  label: string;
  value: string;
  __isNew__?: boolean;
};

export const HISTORY_COLLECTON_ID = "67c82d7b000b564ff2e4";
const DOMAIN_COLLECTION_ID = "681e348e0037680abed9";

// Add validation function
const validateCompanyName = (name: string, natureOfCompany: string): boolean => {
  if (natureOfCompany === "PvtLtd") {
    return name.toLowerCase().includes("pvt ltd") || name.toLowerCase().includes("private limited");
  } else if (natureOfCompany === "LLP") {
    return name.toLowerCase().includes("llp") || name.toLowerCase().includes("limited liability partnership");
  }
  return true;
};

// Add interface for field errors
interface FieldErrors {
  registeredCompanyName?: string;
}

const CompanyDetails: React.FC<CompanyDetailsProps> = ({ startupId, setIsDirty }) => {
  const [startupData, setStartupData] = useState<StartupData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedData, setUpdatedData] = useState<StartupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState(""); 
  const { toast } = useToast();
  const isStartupRoute = useIsStartupRoute();

  const [receivedDate, setReceivedDate] = useState<string | null>(null);
  const [domainOptions, setDomainOptions] = useState<{ label: string; value: string }[]>([]);
  const [isDomainLoading, setIsDomainLoading] = useState(false);
  const [coiFileId, setCoiFileId] = useState<string | null>(null);
  const [runLlpFileId, setRunLlpFileId] = useState<string | null>(null);
  const [llpIncorpCertFileId, setLlpIncorpCertFileId] = useState<string | null>(null);
  const [partnershipDeedFileId, setPartnershipDeedFileId] = useState<string | null>(null);
  const [udayamFileId, setUdyamFileId] = useState<string | null>(null);
  const [auditedFinancialsFileId, setAuditedFinancialsFileId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStartupDetails = async () => {
      if (!startupId) return;
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? STARTUP_ID : STARTUP_ID;

        const data = await databases.getDocument(databaseId, collectionId, startupId);
        const parsedData = {
          brandName: data.brandName ?? "",
          businessType: data.businessType ?? "",
          companyStage: data.companyStage ?? "",
          registeredCountry: data.registeredCountry ?? "",
          registeredCompanyName: data.registeredCompanyName ?? "",
          dateOfIncorporation: data.dateOfIncorporation ?? "",
          patentsCertifications: data.patentsCertifications ?? "",
          registeredState: data.registeredState ?? "",
          natureOfCompany: data.natureOfCompany ?? "",
          domain: data.domain ?? "",
          incubated: data.incubated ?? "",
          revenue: data.revenue ?? "",
          businessModel: data.businessModel ?? [],
          subDomain: data.subDomain ?? "",
          employees: data.employees ?? "",
        };
        setStartupData(parsedData);
        setUpdatedData(parsedData);

        // fetch receivedDate to restrict dateOfIncorporation input date
        const projectResponse = await databases.listDocuments(
          STAGING_DATABASE_ID,
          PROJECTS_ID,
          [Query.equal("startupId", startupId)]
        );

        if (projectResponse.documents.length > 0) {
          const projectData = projectResponse.documents[0];
          setReceivedDate(projectData.receivedDate ?? null);
        } else {
          setReceivedDate(null);
        }
      } catch (error: any) {
        if (error && error.code === 404) {
          // No data found, set all fields to empty
          const emptyData = {
            brandName: "",
            businessType: "",
            companyStage: "",
            registeredCountry: "",
            registeredCompanyName: "",
            dateOfIncorporation: "",
            patentsCertifications: "",
            registeredState: "",
            natureOfCompany: "",
            domain: "",
            incubated: "",
            revenue: "",
            businessModel: [],
            subDomain: "",
            employees: "",
          };
          setStartupData(emptyData);
          setUpdatedData(emptyData);
        } else {
          setError("Failed to fetch startup details. Please try again later.");
        }
      }
    };

    fetchStartupDetails();
  }, [startupId, isStartupRoute]);


  useEffect(() => {
    if (!startupId) return;

    // Fetch Filed copy of RUN LLP
    const fetchRunLlpFile = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          DOC_CHECKLIST_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("docName", "Filed copy of RUN LLP (Form for Reserving a name for LLP)"),
          ]
        );
        if (response.documents.length > 0) {
          setRunLlpFileId(response.documents[0].fileId || null);
        } else {
          setRunLlpFileId(null);
        }
      } catch {
        setRunLlpFileId(null);
      }
    };

    // Fetch LLP Incorporation Certificate
    const fetchLlpIncorpCertFile = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          DOC_CHECKLIST_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("docName", "LLP Incorporation Certificate"),
          ]
        );
        if (response.documents.length > 0) {
          setLlpIncorpCertFileId(response.documents[0].fileId || null);
        } else {
          setLlpIncorpCertFileId(null);
        }
      } catch {
        setLlpIncorpCertFileId(null);
      }
    };

    fetchRunLlpFile();
    fetchLlpIncorpCertFile();
  }, [startupId]);

  useEffect(() => {
    if (!startupId) return;
    const fetchAuditedFinancialsFile = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          DOC_CHECKLIST_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("docName", "Audited Financials for last 3 completed financial years."),
          ]
        );
        if (response.documents.length > 0) {
          setAuditedFinancialsFileId(response.documents[0].fileId || null);
        } else {
          setAuditedFinancialsFileId(null);
        }
      } catch {
        setAuditedFinancialsFileId(null);
      }
    };

    fetchAuditedFinancialsFile();
  }, [startupId]);



  useEffect(() => {
    const fetchDomains = async () => {
      setIsDomainLoading(true);
      try {
        const res = await databases.listDocuments(STAGING_DATABASE_ID, DOMAIN_COLLECTION_ID);
        setDomainOptions(
          res.documents.map((doc: any) => ({
            label: doc.name,
            value: doc.name,
          }))
        );
      } catch (err) {
        setDomainOptions([]);
      } finally {
        setIsDomainLoading(false);
      }
    };
    fetchDomains();
  }, []);

  useEffect(() => {
    const fetchCOI = async () => {
      if (!startupId) return;
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          DOC_CHECKLIST_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("docName", "Certificate of Incorporation"),
          ]
        );
        if (response.documents.length > 0) {
          const doc = response.documents[0];
          setCoiFileId(doc.fileId || null);
        } else {
          setCoiFileId(null);
        }
      } catch (error) {
        setCoiFileId(null);
      }
    };
    if (startupId) fetchCOI();
  }, [startupId]);

  useEffect(() => {
    if (!startupId) return;

    const fetchPartnershipDeedFile = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          DOC_CHECKLIST_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("docName", "Copy of the Partnership Deed"),
          ]
        );
        if (response.documents.length > 0) {
          // If using one state:
          setPartnershipDeedFileId(response.documents[0].fileId || null)
        } else {
          setPartnershipDeedFileId(null);
        }
      } catch {
        setPartnershipDeedFileId(null);
      }
    };

    fetchPartnershipDeedFile();
  }, [startupId]);

  useEffect(() => {
    if (!startupId) return;

    const fetchUdyamFile = async () => {
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          DOC_CHECKLIST_ID,
          [
            Query.equal("startupId", startupId),
            Query.equal("docName", "UDYAM Registration Certificate"),
          ]
        );
        if (response.documents.length > 0) {
          setUdyamFileId(response.documents[0].fileId || null)
        } else {
          setUdyamFileId(null);
        }
      } catch {
        setUdyamFileId(null);
      }
    };

    fetchUdyamFile();
  }, [startupId]);


  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleSaveClick = async () => {
    if (!updatedData || !startupId) return;
    if (isSubmitting) return;

    // Validate company name before saving
    const isCompanyNameValid = validateCompanyName(updatedData.registeredCompanyName, updatedData.natureOfCompany);
    if (!isCompanyNameValid && (updatedData.natureOfCompany === "PvtLtd" || updatedData.natureOfCompany === "LLP")) {
      setFieldErrors({
        ...fieldErrors,
        registeredCompanyName: "Company name not matching with nature of company selected"
      });
      return;
    }

    setIsSubmitting(true);
    setIsDirty(false);
    try {
      const changes = [];
      for (const key in updatedData) {
        if (updatedData[key] !== startupData?.[key]) {
          let oldValue = startupData?.[key] || "N/A";
          let newValue = updatedData[key];
  
          // Convert arrays to comma-separated strings for Appwrite compatibility
          if (Array.isArray(oldValue)) {
            oldValue = oldValue.join(", ");
          }
          if (Array.isArray(newValue)) {
            newValue = newValue.join(", ");
          }
  
          // Ensure values are strings and truncate to 100 characters if necessary
          oldValue = String(oldValue).slice(0, 100);
          newValue = String(newValue).slice(0, 100);
  
          changes.push({
            startupId,
            fieldChanged: key,
            oldValue,
            newValue,
            changedAt: new Date().toISOString(),
          });
        }
      }
  
      // Save changes to the StartupHistory collection
      await Promise.all(
        changes.map((change) =>
          databases.createDocument(STAGING_DATABASE_ID, HISTORY_COLLECTON_ID, "unique()", change)
        )
      );
  
      // Update the startup details
      await databases.updateDocument(STAGING_DATABASE_ID, STARTUP_ID, startupId, updatedData);
      setStartupData(updatedData);
      setIsEditing(false);
      toast({ title: "Company Details saved!" });
    } catch (error) {
      console.error("Error saving updated data:", error);
      setError("Failed to save changes. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  

  const handleChange = (key: keyof StartupData, value: any) => {
    setIsDirty(true); 
    if (updatedData) {
      let newValue = value;
      if (key === "subDomain" || key === "registeredState" || key === "registeredCountry") {
        newValue = validateCharacterInput(value);
      }
      
      const newData = { ...updatedData, [key]: newValue };
      
      // Clear field errors when either registeredCompanyName or natureOfCompany changes
      if (key === "registeredCompanyName" || key === "natureOfCompany") {
        const isValid = validateCompanyName(
          key === "registeredCompanyName" ? newValue : newData.registeredCompanyName,
          key === "natureOfCompany" ? newValue : newData.natureOfCompany
        );
        
        if (!isValid && (newData.natureOfCompany === "PvtLtd" || newData.natureOfCompany === "LLP")) {
          setFieldErrors({
            ...fieldErrors,
            registeredCompanyName: "Company name not matching with nature of company selected"
          });
        } else {
          setFieldErrors({
            ...fieldErrors,
            registeredCompanyName: undefined
          });
        }
      }
      
      setUpdatedData(newData);
    }
  };
  
  const dropdownOptions: { [key: string]: string[] } = {
    companyStage: [
      "Select",
      "Ideation",
      "POC",
      "MVP",
      "Early Traction",
      "Growth",
    ],
    businessType: [
      "Select",
      "Product",
      "Services",
      "Product+Services",
      "Trading",
      "Product Manufactureing"
    ],
    natureOfCompany: [
      "Select",
      "PvtLtd",
      "LLP",
      "Partnership",
      "Proprietorship",
      "One Person Company",
      "Entity Not Incorporated",
    ],
    incubated: [
      "Yes",
      "No",
    ],
    patentsCertifications: [
      "Yes",
      "No",
    ],
  };
  
  const BusinessModelSelect = ({
    value,
    disabled,
    onChange,
  }: {
    value: string[];
    disabled: boolean;
    onChange: (value: string[]) => void;
  }) => {
    const options = [
      { value: "B2B", label: "B2B" },
      { value: "B2B2C", label: "B2B2C" },
      { value: "B2G", label: "B2G" },
      { value: "B2C", label: "B2C" },
      { value: "D2C", label: "D2C" },
    ];
  
    return (
      <ReactSelect
        isMulti
        isDisabled={disabled}
        options={options}
        value={options.filter((option) => value.includes(option.value))} // Map selected values to options
        onChange={(selectedOptions) =>
          onChange(selectedOptions.map((option) => option.value))
        }
        className="basic-multi-select"
        classNamePrefix="select"
        styles={{
          control: (provided, state) => ({
            ...provided,
            backgroundColor: state.isDisabled ? "white" : provided.backgroundColor,
            cursor: state.isDisabled ? "not-allowed" : "default",
            opacity: state.isDisabled ? 1 : 1,
          }),
        }}
      />
    );
  };
  

  const renderDropdown = (key: keyof StartupData) =>
    key === "domain" ? (
      renderDomainDropdown()
    ) : (
      <Select
        disabled={!isEditing}
        onValueChange={(value) => handleChange(key, value)}
        value={typeof updatedData?.[key] === "string" ? updatedData[key] : ""}
      >
        <SelectTrigger className="py-2 border rounded-md text-sm">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          {dropdownOptions[key]?.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
  );

  const handleDomainChange = (selected: any) => {
    handleChange("domain", selected?.value || "");
  };

  const handleCreateDomain = async (inputValue: string) => {
    setIsDomainLoading(true);
    try {
      await databases.createDocument(
        STAGING_DATABASE_ID,
        DOMAIN_COLLECTION_ID,
        "unique()",
        { name: inputValue }
      );
      setDomainOptions(prev => [...prev, { label: inputValue, value: inputValue }]);
      handleChange("domain", inputValue);
    } catch (err) {
    } finally {
      setIsDomainLoading(false);
    }
  };


  const renderDomainDropdown = () => (
    <CreatableSelect
      isDisabled={!isEditing || isDomainLoading}
      isClearable
      isLoading={isDomainLoading}
      options={domainOptions}
      value={domainOptions.find(opt => opt.value === updatedData?.domain) || null}
      onChange={handleDomainChange}
      onCreateOption={handleCreateDomain}
      placeholder="Select or enter domain"
      formatCreateLabel={inputValue => `Add "${inputValue}"`}
      styles={{
        control: (provided, state) => ({
          ...provided,
          backgroundColor: state.isDisabled ? "white" : provided.backgroundColor,
          cursor: state.isDisabled ? "not-allowed" : "default",
          fontFamily: 'inherit',
          fontSize: '0.875rem', 
          color: '#000',
        }),
        input: (provided) => ({
          ...provided,
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          color: '#000',
          opacity: 1,
        }),
        placeholder: (provided) => ({
          ...provided,
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          color: '#000',
          opacity: 1,
        }),
        singleValue: (provided) => ({
          ...provided,
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          color: '#000',
          opacity: 1,
        }),
        menu: (provided) => ({
          ...provided,
          fontFamily: 'inherit',
          fontSize: '0.875rem',
        }),
        option: (provided, state) => ({
          ...provided,
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          cursor: (state.data as DomainOption).__isNew__ ? 'pointer' : 'default',
          color: '#000',
          opacity: 1,
        }),
      }}
    />
  );



  const validateCharacterInput = (value: string) => {
    return value.replace(/[^a-zA-Z\s]/g, '');
  };
  
  const fieldLabels: { [key in keyof StartupData]: string } = {
    brandName: "Brand Name",
    dateOfIncorporation: "Date of Incorporation",
    companyStage: "Company Stage",
    businessType: "Business Type",
    businessModel: "Business Model",
    patentsCertifications: "Patents & Certifications",
    registeredCompanyName: "Registered Company Name",
    registeredState: "Registered State",
    domain: "Domain",
    incubated: "Incubated",
    revenue: "Revenue (last FY)",
    natureOfCompany: "Nature of Company",
    registeredCountry: "Registered Country",
    subDomain: "Sub-Domain",
    employees: "Employees (last FY)",
  };

  if (!startupData) {
    return (
      <div>
        {error || (
          <div className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex space-x-4 items-center">
        <h2 className="text-lg font-medium">Company Details</h2>
        {isStartupRoute && (
            <Link href={`/startup/${startupId}/StartupHistory`}>
              <span className="text-blue-500 hover:text-blue-700 text-sm">
                Audit Trails
              </span>
            </Link>
          )}
        </div>
        {isEditing ? (
          <div onClick={handleSaveClick} className="cursor-pointer border border-gray-300 rounded-full p-1 flex items-center space-x-1 mb-1">
            <SaveIcon
              size={15}
              className="text-green-500"
              aria-disabled={isSubmitting}
            />
            <span className="text-xs">
              {isSubmitting ? "Saving..." : "Save"}
            </span>
          </div>
        ) : (
          !isStartupRoute && (
            <div
              className="cursor-pointer border border-gray-300 rounded-full p-1 flex items-center space-x-1 mb-1"
              onClick={handleEditClick}
            >
              <EditIcon size={15} />
              <span className="text-xs">Edit</span>
            </div>
          )
        )}
      </div>
      <div className="grid gap-4 bg-white mx-auto p-3 rounded-lg border border-gray-300">
        {[
          ["brandName", "natureOfCompany","registeredCompanyName", "businessModel"],
          ["businessType", "dateOfIncorporation", "domain", "subDomain"],
          ["companyStage", "patentsCertifications", "incubated", "revenue"],
          ["employees", "registeredCountry", "registeredState"],
        ].map((row, rowIndex) => (
          <div key={rowIndex} className="grid grid-cols-4 gap-4">
            {row.map((key) => (
              <div key={key} className="space-y-4">
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center">
                  <Label className="font-semibold text-gray-700">
                    {fieldLabels[key] || key}
                  </Label>
                  {["registeredCompanyName", "dateOfIncorporation", "revenue"].includes(key) && (() => {
                    let fileUrl = null;
                    let title = "";

                    if (key === "registeredCompanyName") {
                      if (runLlpFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${runLlpFileId}/view?project=${PROJECT_ID}`;
                        title = "View Filed copy of RUN LLP";
                      } else if (coiFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${coiFileId}/view?project=${PROJECT_ID}`;
                        title = "View Certificate of Incorporation";
                      } else if (partnershipDeedFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${partnershipDeedFileId}/view?project=${PROJECT_ID}`;
                        title = "View Copy of the Partnership Deed";
                      } else if (udayamFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${udayamFileId}/view?project=${PROJECT_ID}`;
                        title = "View UDYAM Registration Certificate";
                      } else {
                        title = "Certificate of Incorporation or RUN LLP not uploaded";
                      }
                    }

                    if (key === "dateOfIncorporation") {
                      if (llpIncorpCertFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${llpIncorpCertFileId}/view?project=${PROJECT_ID}`;
                        title = "View LLP Incorporation Certificate";
                      } else if (coiFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${coiFileId}/view?project=${PROJECT_ID}`;
                        title = "View Certificate of Incorporation";
                      } else if (partnershipDeedFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${partnershipDeedFileId}/view?project=${PROJECT_ID}`; 
                        title = "View Copy of the Partnership Deed";
                      } else if (udayamFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${udayamFileId}/view?project=${PROJECT_ID}`;
                        title = "View UDYAM Registration Certificate";
                      } else {
                        title = "LLP Incorporation Certificate or COI not uploaded";
                      }
                    }

                    if (key === "revenue") {
                      if (auditedFinancialsFileId) {
                        fileUrl = `${API_ENDPOINT}/storage/buckets/${BUCKET_ID}/files/${auditedFinancialsFileId}/view?project=${PROJECT_ID}`;
                        title = "View Audited Financials";
                      } else {
                        title = "Audited Financials not uploaded";
                      }
                    }

                    return fileUrl ? (
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1"
                        title={title}
                      >
                        <FaEye className="ml-2 text-blue-500 hover:text-blue-700" size={20} />
                      </a>
                    ) : (
                      <FaEye className="ml-2 text-gray-400" size={20} title={title} />
                    );
                  })()}

                  </div>
                  {key === "businessModel" ? (
                    <BusinessModelSelect
                      value={updatedData?.businessModel || []}
                      disabled={!isEditing}
                      onChange={(value) => handleChange("businessModel", value)}
                    />
                  ) : key === "dateOfIncorporation" ? (
                    <Input
                      type="date"
                      disabled={!isEditing}
                      value={updatedData?.[key] || ""}
                      max={receivedDate ? new Date(receivedDate).toISOString().split("T")[0] : ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                    />
                  ) : key === "revenue" ? (
                    <Input
                      type="text"
                      placeholder="0 INR"
                      disabled={!isEditing}
                      value={`₹${updatedData?.[key] || "0"}`}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^0-9,]/g, "");
                        const formattedValue = numericValue.replace(/,/g, "");
                        const parsedValue = parseInt(formattedValue, 10);
                        const finalValue = isNaN(parsedValue) ? "0" : parsedValue.toLocaleString("en-IN");
                        handleChange(key, finalValue);
                      }}
                    />
                  ) : key === "employees" ? (
                    <Input
                      type="number"
                      placeholder="0"
                      disabled={!isEditing}
                      value={updatedData?.[key] || ""}
                      onChange={(e) => {
                        const numericValue = e.target.value.replace(/[^0-9]/g, "");
                        handleChange(key, numericValue);
                      }}
                      min="0"
                    />
                  ) : ["companyStage", "businessType", "natureOfCompany", "domain", "incubated", "patentsCertifications"].includes(key) ? (
                    <div className="flex flex-col">
                      {renderDropdown(key)}
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <Input
                        disabled={!isEditing}
                        value={updatedData?.[key] || ""}
                        onChange={(e) => handleChange(key, e.target.value)}
                        onKeyPress={(e) => {
                          if (["subDomain", "registeredState", "registeredCountry"].includes(key) && !/[a-zA-Z\s]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                      />
                      {key === "registeredCompanyName" && fieldErrors.registeredCompanyName && (
                        <span className="text-red-500 text-sm mt-1">{fieldErrors.registeredCompanyName}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
};

export default CompanyDetails;

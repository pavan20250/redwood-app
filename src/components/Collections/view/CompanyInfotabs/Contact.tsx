"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import { Query } from "appwrite";
import { EditIcon, SaveIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

type ContactData = {
  companyWebsite: string;
  email: string;
  primaryPhone: string;
  secondaryPhone: string;
  registeredAddress1: string;
  registeredAddress2: string;
  registeredCity: string;
  state: string;
  postalCode: string;
  communicationAddress1: string;
  communicationAddress2: string;
  communicationCity: string;
  communicationState: string;
  postalCode2: string;
};

const MAX_CHAR_LIMITS = {
  companyWebsite: 200,
  email: 50,
  primaryPhone: 10,
  secondaryPhone: 10,
  registeredAddress1: 100,
  registeredAddress2: 100,
  registeredCity: 50,
  state: 50,
  postalCode: 6,
  communicationAddress1: 100,
  communicationAddress2: 100,
  communicationCity: 50,
  communicationState: 50,
};

export const CONTACT_ID = "672bac4a0017528d75ae";
export const CONTACT_HISTORY_COLLECTION_ID = "67cc7e6c002757b5375a";

interface ContactInformationProps {
  startupId: string;
  setIsDirty?: (isDirty: boolean) => void;
}

const ContactInformation: React.FC<ContactInformationProps> = ({ startupId, setIsDirty }) => {
  const [contactData, setContactData] = useState<ContactData>({
    companyWebsite: "",
    email: "",
    primaryPhone: "",
    secondaryPhone: "",
    registeredAddress1: "",
    registeredAddress2: "",
    registeredCity: "",
    state: "",
    postalCode: "",
    communicationAddress1: "",
    communicationAddress2: "",
    communicationCity: "",
    communicationState: "",
    postalCode2: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isSameAddress, setIsSameAddress] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const [websiteError, setWebsiteError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [primaryPhoneError, setprimaryPhoneError] = useState<string | null>(null);
  const [secondaryPhoneError, setsecondaryPhoneError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [previousData, setPreviousData] = useState<ContactData | null>(null);
  const isStartupRoute = useIsStartupRoute();

  const [errors, setErrors] = useState<{ [key in keyof ContactData]?: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
        const collectionId = isStartupRoute ? CONTACT_ID : CONTACT_ID;

        const response = await databases.listDocuments(
          databaseId,
          collectionId,
          [Query.equal("startupId", startupId)]
        );
        if (response.documents.length > 0) {
          const document = response.documents[0];
          setContactData({
            companyWebsite: document.companyWebsite || "",
            email: document.email || "",
            primaryPhone: document.primaryPhone || "",
            secondaryPhone: document.secondaryPhone || "",
            registeredAddress1: document.registeredAddress1 || "",
            registeredAddress2: document.registeredAddress2 || "",
            registeredCity: document.registeredCity || "",
            state: document.state || "",
            postalCode: document.postalCode || "",
            communicationAddress1: document.communicationAddress1 || "",
            communicationAddress2: document.communicationAddress2 || "",
            communicationCity: document.communicationCity || "",
            communicationState: document.communicationState || "",
            postalCode2: document.postalCode2 || "",
          });
          setPreviousData({
            companyWebsite: document.companyWebsite || "",
            email: document.email || "",
            primaryPhone: document.primaryPhone || "",
            secondaryPhone: document.secondaryPhone || "",
            registeredAddress1: document.registeredAddress1 || "",
            registeredAddress2: document.registeredAddress2 || "",
            registeredCity: document.registeredCity || "",
            state: document.state || "",
            postalCode: document.postalCode || "",
            communicationAddress1: document.communicationAddress1 || "",
            communicationAddress2: document.communicationAddress2 || "",
            communicationCity: document.communicationCity || "",
            communicationState: document.communicationState || "",
            postalCode2: document.postalCode2 || "",
          });
          setDocumentId(document.$id);
        } else {
          setContactData({
            companyWebsite: "",
            email: "",
            primaryPhone: "",
            secondaryPhone: "",
            registeredAddress1: "",
            registeredAddress2: "",
            registeredCity: "",
            state: "",
            postalCode: "",
            communicationAddress1: "",
            communicationAddress2: "",
            communicationCity: "",
            communicationState: "",
            postalCode2: "",
          });
        }
      } catch (error) {
        console.error("Error fetching contact data:", error);
      }
    };
  
    if (startupId) {
      fetchData();
    }
  }, [startupId, isStartupRoute]);
  

  const validateWebsite = (url: string) => {
    if (url === "") {
      setWebsiteError(null);
      return true;
    }
    try {
      new URL(url);
      setWebsiteError(null);
      return true;
    } catch (error) {
      setWebsiteError("Enter a valid website URL.");
      return false;
    }
  };
  
  const validateEmail = (email: string) => {
    if (email === "") {
      setEmailError(null);
      return true;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      setEmailError(null);
      return true;
    }
    setEmailError("Enter a valid email address.");
    return false;
  };
  
  const validatePhoneNumber = (phone: string) => {
    if (phone === "") {
      return true;
    }
    const phoneRegex = /^\d{10}$/;
    return phoneRegex.test(phone);
  };

  const validatePostalCode = (code: string) => {
    if (code === "") {
      setPostalCodeError(null);
      return true;
    }
    const postalCodeRegex = /^\d{6}$/;
    if (postalCodeRegex.test(code)) {
      setPostalCodeError(null);
      return true;
    }
    setPostalCodeError("Enter a valid 6-digit postal code.");
    return false;
  };
  

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof ContactData
  ) => {
    setIsDirty && setIsDirty(true);
    const value = e.target.value;
    // Validate character limit
  const maxLimit = MAX_CHAR_LIMITS[field as keyof typeof MAX_CHAR_LIMITS];
  if (maxLimit && value.length > maxLimit) {
    setErrors((prevErrors) => ({
      ...prevErrors,
      [field]: `Maximum ${maxLimit} characters allowed.`,
    }));
    return;
  }
  // Clear error if within limit
  setErrors((prevErrors) => ({
    ...prevErrors,
    [field]: undefined,
  }));

  // Update contact data
  setContactData((prevData) => ({
    ...prevData,
    [field]: value,
  }));

    if (field === "companyWebsite") {
      validateWebsite(value);
    } else if (field === "email") {
      validateEmail(value);
    } else if (field === "primaryPhone" || field === "secondaryPhone") {
      if (value === "" || validatePhoneNumber(value)) {
        field === "primaryPhone" ? setprimaryPhoneError(null) : setsecondaryPhoneError(null);
      } else {
        const errorMessage = "Enter a valid 10-digit phone number.";
        field === "primaryPhone" ? setprimaryPhoneError(errorMessage) : setsecondaryPhoneError(errorMessage);
      }
    } else if (field === "postalCode" || field === "postalCode2") {
      validatePostalCode(value);
    }
    setContactData({ ...contactData, [field]: value });
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setIsSameAddress(checked);
    if (checked) {
      setContactData((prevData) => ({
        ...prevData,
        communicationAddress1: prevData.registeredAddress1,
        communicationAddress2: prevData.registeredAddress2,
        communicationCity: prevData.registeredCity,
        communicationState: prevData.state,
        postalCode2: prevData.postalCode,
      }));
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsDirty && setIsDirty(false);
  
    try {
      const { companyWebsite, email, primaryPhone, secondaryPhone, registeredAddress1, registeredAddress2, registeredCity, state, postalCode, communicationAddress1, communicationAddress2, communicationCity, communicationState, postalCode2 } = contactData;
      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? CONTACT_ID : CONTACT_ID;

      if (documentId) {
        await databases.updateDocument(
          databaseId,
          collectionId,
          documentId,
          {
            companyWebsite,
            email,
            primaryPhone,
            secondaryPhone,
            registeredAddress1,
            registeredAddress2,
            registeredCity,
            state,
            postalCode,
            communicationAddress1,
            communicationAddress2,
            communicationCity,
            communicationState,
            postalCode2,
          }
        );
      } else {
        const response = await databases.createDocument(
          databaseId,
          collectionId,
          "unique()",
          {
            companyWebsite,
            email,
            primaryPhone,
            secondaryPhone,
            registeredAddress1,
            registeredAddress2,
            registeredCity,
            state,
            postalCode,
            communicationAddress1,
            communicationAddress2,
            communicationCity,
            communicationState,
            postalCode2,
            startupId: startupId,
          }
        );
        setDocumentId(response.$id);
      }
  
      // Save changes to the Contact History collection
      const changes: { startupId: string; fieldChanged: string; oldValue: string; newValue: string; changedAt: string }[] = [];
  
      Object.keys(contactData).forEach((key) => {
        if (contactData[key as keyof ContactData] !== previousData?.[key as keyof ContactData]) {
          let oldValue = previousData?.[key as keyof ContactData] || "N/A";
          let newValue = contactData[key as keyof ContactData];
  
          changes.push({
            startupId,
            fieldChanged: key,
            oldValue,
            newValue,
            changedAt: new Date().toISOString(),
          });
        }
      });
  
      await Promise.all(
        changes.map((change) =>
          databases.createDocument(STAGING_DATABASE_ID, CONTACT_HISTORY_COLLECTION_ID, "unique()", change)
        )
      );
  
      setPreviousData(contactData);
      setIsEditing(false);
      toast({
        title: "Contact Information saved!",
      });
    } catch (error) {
      console.error("Error saving contact data:", error);
      toast({
        title: "Error saving Contact Information",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
        <h2 className="text-lg font-medium">Contact</h2>
        <div>
        {isStartupRoute && (
            <Link href={`/startup/${startupId}/ContactHistory`}>
              <span className="text-blue-500 hover:text-blue-700 text-sm">
                Audit Trails
              </span>
            </Link>
          )}
          </div>
        </div>
        <>
        {isEditing ? (
          <div
            onClick={handleSave}
            className="cursor-pointer border border-gray-300 rounded-full p-1 flex items-center space-x-1 mb-1"
          >
            <SaveIcon
              size={15}
              className="cursor-pointer text-green-500"
              aria-disabled={isSubmitting}
            />
            <span className="text-xs">
              {isSubmitting ? "Saving..." : "Save"}
            </span>
          </div>
        ) : (
          ! isStartupRoute && (
          <div
            onClick={handleEdit}
            className="cursor-pointer border border-gray-300 rounded-full p-1 flex items-center space-x-1 mb-1"
          >
            <EditIcon size={15} />
            <span className="text-xs">Edit</span>
          </div>
          )
        )}
        </>
      </div>
      <div className="flex flex-col space-y-8 border border-gray-150 p-4 rounded-md shadow-sm bg-white">
      <div>
        <div className="flex flex-row space-x-4 w-full">
          <div className="w-full">
            <Label className="font-semibold text-gray-700">Company Website</Label>
            <Input
              disabled={!isEditing}
              autoComplete="off"
              value={contactData.companyWebsite}
              onChange={(e) => handleInputChange(e, "companyWebsite")}
              className={websiteError ? "border-red-500" : ""}
            />
            {errors.companyWebsite && (
              <p className="text-red-500 text-sm mt-1">{errors.companyWebsite}</p>
            )}
            {websiteError && <p className="text-red-500 text-sm mt-1">{websiteError}</p>}
          </div>
          <div className="w-full">
            <Label className="font-semibold text-gray-700">Email</Label>
            <Input
              disabled={!isEditing}
              autoComplete="off"
              value={contactData.email}
              onChange={(e) => handleInputChange(e, "email")}
              className={emailError ? "border-red-500" : ""}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
            {emailError && <p className="text-red-500 text-sm mt-1">{emailError}</p>}
          </div>
          <div className="w-full">
            <Label className="font-semibold text-gray-700">Primary Phone Number</Label>
            <Input
              type="number"
              disabled={!isEditing}
              value={contactData.primaryPhone}
              onChange={(e) => handleInputChange(e, "primaryPhone")}
              className={primaryPhoneError ? "border-red-500" : ""}
            />
            {primaryPhoneError && <p className="text-red-500 text-sm mt-1">{primaryPhoneError}</p>}
          </div>
          <div className="w-full">
            <Label className="font-semibold text-gray-700">Secondary Phone Number</Label>
            <Input
              type="number"
              disabled={!isEditing}
              value={contactData.secondaryPhone}
              onChange={(e) => handleInputChange(e, "secondaryPhone")}
              className={secondaryPhoneError ? "border-red-500" : ""}
            />
            {secondaryPhoneError && <p className="text-red-500 text-sm mt-1">{secondaryPhoneError}</p>}
          </div>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-sm">Registered Address</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-row space-x-5">
            {[
              ["Address Line 1", "registeredAddress1"],
              ["Address Line 2", "registeredAddress2"],
              ["City", "registeredCity"],
              ["State", "state"],
              ["Postal Code", "postalCode"],
            ].map(([label, field]) => (
              <div key={field} className="w-full">
                <Label className="font-semibold text-gray-700">{label}</Label>
                <Input
                  disabled={!isEditing}
                  value={contactData[field as keyof ContactData]}
                  onChange={(e) => handleInputChange(e, field as keyof ContactData)}
                  className={field === "postalCode" && postalCodeError ? "border-red-500" : ""}
                />
                {errors[field as keyof ContactData] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors[field as keyof ContactData]}
                  </p>
                )}
                {field === "postalCode" && postalCodeError && (
                  <p className="text-red-500 text-sm mt-1">{postalCodeError}</p>
                )}
                
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2 mt-4">
        <input
          type="checkbox"
          id="sameAddress"
          disabled={!isEditing}
          checked={isSameAddress}
          onChange={handleCheckboxChange}
        />
        <Label htmlFor="sameAddress" className="font-semibold text-gray-700">
          Is Communication Address the same as Registered Address?
        </Label>
      </div>
      <div>
        <h3 className="font-bold text-sm">Communication Address</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-row space-x-5">
            {[
              ["Address Line 1", "communicationAddress1"],
              ["Address Line 2", "communicationAddress2"],
              ["City", "communicationCity"],
              ["State", "communicationState"],
              ["Postal Code", "postalCode2"],
            ].map(([label, field]) => (
              <div key={field} className="w-full">
                <Label className="font-semibold text-gray-700">{label}</Label>
                <Input
                  disabled={!isEditing}
                  value={contactData[field as keyof ContactData]}
                  onChange={(e) => handleInputChange(e, field as keyof ContactData)}
                  className={field === "postalCode2" && postalCodeError ? "border-red-500" : ""}
                />
                {errors[field as keyof ContactData] && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors[field as keyof ContactData]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default ContactInformation;

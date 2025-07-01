"use client";

import { Models } from "appwrite";
import React, { useEffect, useState } from "react";
import { Client, Databases, Query } from "appwrite";
import { API_ENDPOINT, PROJECT_ID, STAGING_DATABASE_ID, STARTUP_ID } from "@/appwrite/config";
import { useToast } from "@/hooks/use-toast";
import { CONTACT_ID } from "./view/CompanyInfotabs/Contact";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { FaEye } from "react-icons/fa";
import { useRouter } from "next/navigation";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Input } from "@/components/ui/input";

const client = new Client().setEndpoint(API_ENDPOINT).setProject(PROJECT_ID);
const databases = new Databases(client);
interface Contact extends Models.Document {
  startupId: string;
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
}

interface Startup {
  id: string;
  name: string;
}

const ContactsTable: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [startups, setStartups] = useState<Startup[]>([]);
  const [startupMap, setStartupMap] = useState<{ [id: string]: string }>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await databases.listDocuments<Contact>(
          STAGING_DATABASE_ID,
          CONTACT_ID
        );
        setContacts(response.documents);
        setFilteredContacts(response.documents);
      } catch (error) {
        console.error("Error fetching contacts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch contacts. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchContacts();
  }, [toast]);

  useEffect(() => {
    const fetchStartups = async () => {
      try {
        const response = await databases.listDocuments(STAGING_DATABASE_ID, STARTUP_ID, [Query.limit(300)]);
        const startupList = response.documents.map((doc: any) => ({
          id: doc.$id,
          name: doc.name || "",
        }));
        setStartups(startupList);
        const map: { [id: string]: string } = {};
        startupList.forEach((s) => { map[s.id] = s.name; });
        setStartupMap(map);
      } catch (error) {
        console.error("Error fetching startups for contacts:", error);
      }
    };
    fetchStartups();
  }, []);

  useEffect(() => {
    const filtered = contacts.filter((contact) => {
      const name = startupMap[contact.startupId] || "";
      return name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    setFilteredContacts(filtered);
    setCurrentPage(1);
  }, [searchTerm, contacts, startupMap]);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentContacts = filteredContacts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="p-2 mx-auto">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center space-x-2">
          <h2 className="text-xl font-bold">All Contacts</h2>
        </div>
        <div className="relative">
          <Input
            type="text"
            placeholder="Search by Startup Name"
            value={searchTerm}
            onChange={handleSearch}
            className="w-72 text-xs pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
      </div>
      {loading ? (
        <div className="flex justify-center mt-56">
          <svg width="50" height="50" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-labelledby="title" role="img">
            <title id="title">Loading...</title>
            <circle cx="50" cy="50" r="35" stroke="gray" strokeWidth="5" fill="none" strokeLinecap="round" strokeDasharray="55 35">
              <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
      ) : filteredContacts.length === 0 ? (
        <p>No contacts found.</p>
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
                <TableHead className="w-auto">Startup Name</TableHead>
                <TableHead className="w-auto">Company Website</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone 1</TableHead>
                <TableHead>Phone 2</TableHead>
                <TableHead>Registered Address</TableHead>
                <TableHead>Communication Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentContacts.map((contact) => (
                <TableRow key={contact.$id}>
                  <TableCell>{startupMap[contact.startupId] || <span className="text-gray-400 italic">Unknown</span>}</TableCell>
                  <TableCell>
                    <a
                      href={contact.companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      {contact.companyWebsite}
                    </a>
                  </TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>{contact.primaryPhone}</TableCell>
                  <TableCell>{contact.secondaryPhone}</TableCell>
                  <TableCell>
                    <p>{contact.registeredAddress1}</p>
                    <p>{contact.registeredAddress2}</p>
                    <p>{`${contact.registeredCity}, ${contact.state} - ${contact.postalCode}`}</p>
                  </TableCell>
                  <TableCell>
                    <p>{contact.communicationAddress1}</p>
                    <p>{contact.communicationAddress2}</p>
                    <p>{`${contact.communicationCity}, ${contact.communicationState} - ${contact.postalCode2}`}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {/* Pagination Controls */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-gray-500">
              Showing {filteredContacts.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredContacts.length)} of {filteredContacts.length} entries
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              {/* Condensed Pagination Logic */}
              {(() => {
                const pageButtons = [];
                const pageNeighbors = 2;
                let startPage = Math.max(2, currentPage - pageNeighbors);
                let endPage = Math.min(totalPages - 1, currentPage + pageNeighbors);
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
                if (startPage > 2) {
                  pageButtons.push(
                    <span key="start-ellipsis" className="px-1">...</span>
                  );
                }
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
                if (endPage < totalPages - 1) {
                  pageButtons.push(
                    <span key="end-ellipsis" className="px-1">...</span>
                  );
                }
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
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsTable;

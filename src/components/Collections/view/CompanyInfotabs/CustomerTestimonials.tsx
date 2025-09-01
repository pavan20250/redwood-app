"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircleIcon, ChevronRightIcon, PlusCircle } from "lucide-react";
import { Query } from "appwrite";
import { STAGING_DATABASE_ID, STARTUP_DATABASE } from "@/appwrite/config";
import { databases, useIsStartupRoute } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ButtonWithIcon from "@/lib/addButton";

export const CUSTOMER_COLLECTION_ID = "6731d3a0001a04a8f849";

interface CustomerTestimonialsProps {
  startupId: string;
  setIsDirty: (isDirty: boolean) => void;
}

const CustomerTestimonials: React.FC<CustomerTestimonialsProps> = ({ startupId, setIsDirty }) => {
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [currentTestimonial, setCurrentTestimonial] = useState<any>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isStartupRoute = useIsStartupRoute();


  useEffect(() => {
    if (hasUnsavedChanges) {
      setIsDirty(true);
    } else {
      setIsDirty(false);
    }
  }, [hasUnsavedChanges, setIsDirty]);

  const fetchTestimonials = useCallback(async () => {
    try {
      const databaseId = isStartupRoute ? STARTUP_DATABASE : STAGING_DATABASE_ID;
      const collectionId = isStartupRoute ? CUSTOMER_COLLECTION_ID : CUSTOMER_COLLECTION_ID;

      const response = await databases.listDocuments(
        databaseId,
        collectionId,
        [Query.equal("startupId", startupId)]
      );

      setTestimonials(response.documents);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    }
  }, [startupId, isStartupRoute]);

  useEffect(() => {
    if (startupId) {
      fetchTestimonials();
    }
  }, [startupId, fetchTestimonials]);

  const handleSave = async () => {
    if (isSubmitting) return; // Prevent duplicate submission
    setIsSubmitting(true);
    
    try {
      const testimonialData = Object.fromEntries(
        Object.entries(currentTestimonial).filter(([key]) => !key.startsWith('$'))
      );
      // query5 is saved as a string array [label, value]
      if (currentTestimonial.query5 && Array.isArray(currentTestimonial.query5)) {
        testimonialData.query5 = currentTestimonial.query5;
      }

      if (currentTestimonial.$id) {
        await databases.updateDocument(
          STAGING_DATABASE_ID,
          CUSTOMER_COLLECTION_ID,
          currentTestimonial.$id,
          { ...testimonialData, startupId }
        );
      } else {
        await databases.createDocument(
          STAGING_DATABASE_ID,
          CUSTOMER_COLLECTION_ID,
          "unique()",
          { ...testimonialData, startupId }
        );
      }
      setIsDialogOpen(false);
      fetchTestimonials();
      toast({ title: "Testimonial saved successfully!" });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error saving testimonial:", error);
      toast({ title: "Error saving testimonial", variant: "destructive" });
    }finally {
      setIsSubmitting(false); 
    }
  };

  const handleEdit = (testimonial: any) => {
    setCurrentTestimonial(testimonial);
    setIsDialogOpen(true);
    setHasUnsavedChanges(false); 
  };

  const handleDelete = async () => {
    try {
      await databases.deleteDocument(STAGING_DATABASE_ID, CUSTOMER_COLLECTION_ID, currentTestimonial.$id);
      setIsDialogOpen(false);
      fetchTestimonials();
      toast({ title: "Testimonial deleted successfully!" });
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      toast({ title: "Error deleting testimonial", variant: "destructive" });
    }
  };

  const handleDialogClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        "You have unsaved changes. Are you sure you want to close?"
      );
      if (confirmClose) {
        setIsDialogOpen(false);
        setCurrentTestimonial({});
        setHasUnsavedChanges(false);
      }
    } else {
      setIsDialogOpen(false);
      setCurrentTestimonial({});
    }
  }, [hasUnsavedChanges, setIsDialogOpen, setCurrentTestimonial, setHasUnsavedChanges]);

  return (
    <div className="">
      <div className="flex justify-between items-center">
        <h2 className="container text-lg font-medium mb-2 -mt-4">Customer Testimonials</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              handleDialogClose();
            } else {
              setIsDialogOpen(open);
            }
          }}
        >
          <DialogTrigger asChild>
          <div
              className="cursor-pointer"
              onClick={() => {
                setCurrentTestimonial({});
                setHasUnsavedChanges(false);
              }}
            >
              { !isStartupRoute && (
                <ButtonWithIcon label="Add" />
              )}
            </div>
          </DialogTrigger>
          <DialogContent className="w-full max-w-5xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{currentTestimonial.$id ? "Edit" : "Add"} Testimonial</DialogTitle>
              <DialogDescription>
                Enter the customer testimonial details here. Click save when you re done.
              </DialogDescription>
            </DialogHeader>
            <TestimonialForm
              testimonial={currentTestimonial}
              onChange={(testimonial) => {
                setCurrentTestimonial(testimonial);
                setHasUnsavedChanges(true); 
              }}
              onSave={handleSave}
              onDelete={handleDelete}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>
      <TestimonialsTable testimonials={testimonials} onEdit={handleEdit} />
    </div>
  );
};

interface TestimonialFormProps {
  testimonial: any;
  onChange: (testimonial: any) => void;
  onSave: () => void;
  onDelete: () => void;
  isSubmitting: boolean;
}

const TestimonialForm: React.FC<TestimonialFormProps> = ({
  testimonial,
  onChange,
  onSave,
  onDelete,
  isSubmitting,
}) => {
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [showCustomQuestions, setShowCustomQuestions] = useState(false);
  const [isSaveButtonDisabled, setIsSaveButtonDisabled] = useState(true);

  useEffect(() => {
    // Check if required fields are filled
    const requiredFields = [
      "customerName",
      "designation",
      "phone",
    ];
    const allFieldsFilled = requiredFields.every(
      (field) => testimonial[field]
    );
    setIsSaveButtonDisabled(!allFieldsFilled);
  }, [testimonial]);

  const handleQuery5Change = (index: number, value: string) => {
    const newQuery5 = [...(testimonial.query5 || ['', ''])];
    newQuery5[index] = value;
    onChange({ ...testimonial, query5: newQuery5 });
  };
  const handleQuery6Change = (index: number, value: string) => {
    const newQuery6 = [...(testimonial.query6 || ['', ''])];
    newQuery6[index] = value;
    onChange({ ...testimonial, query6: newQuery6 });
  };

  const handleQuery7Change = (index: number, value: string) => {
    const newQuery7 = [...(testimonial.query7 || ['', ''])];
    newQuery7[index] = value;
    onChange({ ...testimonial, query7: newQuery7 });
  };

  const handleQuery8Change = (index: number, value: string) => {
    const newQuery8 = [...(testimonial.query8 || ['', ''])];
    newQuery8[index] = value;
    onChange({ ...testimonial, query8: newQuery8 });
  };

  const handleChange = (field: string, value: string) => {
    onChange({ ...testimonial, [field]: value });
    validateField(field, value);
  };

  const validateField = (field: string, value: string) => {
    let error = '';
    switch (field) {
      case 'phone':
        if (!/^\d{10}$/.test(value)) {
          error = 'Phone number must be 10 digits';
        }
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          error = 'Invalid email format';
        }
        break;
    }
    setErrors(prev => ({ ...prev, [field]: error }));
  };


  return (
    <div className="space-y-4 w-full">
      <div className="grid grid-cols-3 gap-4 w-full">
        <div>
          <Label htmlFor="customerName">Customer Name<span className="text-red-500">*</span></Label>
          <Input
            id="customerName"
            placeholder="Enter customer name"
            value={testimonial.customerName || ""}
            onChange={(e) => handleChange("customerName", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="designation">Designation<span className="text-red-500">*</span></Label>
          <Input
            id="designation"
            placeholder="Enter designation"
            value={testimonial.designation || ""}
            onChange={(e) => handleChange("designation", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="nameOfInstitution">Name of Institution</Label>
          <Input
            id="nameOfInstitution"
            placeholder="Enter institution name"
            value={testimonial.nameOfInstitution || ""}
            onChange={(e) => handleChange("nameOfInstitution", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone<span className="text-red-500">*</span></Label>
          <Input
            type="text"
            id="phone"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="Enter phone number"
            value={testimonial.phone || ""}
            onChange={(e) => {
              const rawValue = e.target.value.replace(/\D/g, '');
              const limitedValue = rawValue.slice(0, 10);
              handleChange("phone", limitedValue);
            }}
          />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            placeholder="Enter email address"
            value={testimonial.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="query1">What services/products are you using from the company?</Label>
          <Textarea
            id="query1"
            value={testimonial.query1 || ""}
            onChange={(e) => handleChange("query1", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="query2">Your View on Service Utilization-will the service/product be beneficial for your company/personal use</Label>
          <Textarea
            id="query2"
            value={testimonial.query2 || ""}
            onChange={(e) => handleChange("query2", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="query3">Unique selling proposition of the company-what made you switch to using this company s service/product-how were you doing earlier?</Label>
          <Textarea
            id="query3"
            value={testimonial.query3 || ""}
            onChange={(e) => handleChange("query3", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="query4">Future of this Segment- in your view, what will be the future of this segment?</Label>
          <Textarea
            id="query4"
            value={testimonial.query4 || ""}
            onChange={(e) => handleChange("query4", e.target.value)}
          />
        </div>
        </div>
        {/* Toggle Button for Custom Questions */}
        <Button
          variant="outline"
          onClick={() => setShowCustomQuestions(!showCustomQuestions)}
        >
          Add Custom Question & Answer
        </Button>
        {showCustomQuestions && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
              <div>
                <Label htmlFor="query5Label">Query 1</Label>
                <Input
                  id="query5Label"
                  placeholder="Custom Question"
                  value={testimonial.query5?.[0] || ''}
                  onChange={(e) => handleQuery5Change(0, e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  id="query5Value"
                  placeholder="Answer"
                  value={testimonial.query5?.[1] || ''}
                  onChange={(e) => handleQuery5Change(1, e.target.value)}
                />
              </div>
          </div>
          <div className="space-y-2">
              <div>
                <Label htmlFor="query6Label">Query 2</Label>
                <Input
                  id="query6Label"
                  placeholder="Custom Question"
                  value={testimonial.query6?.[0] || ''}
                  onChange={(e) => handleQuery6Change(0, e.target.value)}
                />
              </div>
              {/* Query6 Value */}
              <div>
                <Textarea
                  id="query6Value"
                  placeholder="Answer"
                  value={testimonial.query6?.[1] || ''}
                  onChange={(e) => handleQuery6Change(1, e.target.value)}
                />
              </div>
          </div>
          <div className="space-y-2">
              <div>
                <Label htmlFor="query7Label">Query 3</Label>
                <Input
                  id="query7Label"
                  placeholder="Custom Question"
                  value={testimonial.query7?.[0] || ''}
                  onChange={(e) => handleQuery7Change(0, e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  id="query7Value"
                  placeholder="Answer"
                  value={testimonial.query7?.[1] || ''}
                  onChange={(e) => handleQuery7Change(1, e.target.value)}
                />
              </div>
          </div>
          <div className="space-y-2">
              <div>
                <Label htmlFor="query8Label">Query 4</Label>
                <Input
                  id="query8Label"
                  placeholder="Custom Question"
                  value={testimonial.query8?.[0] || ''}
                  onChange={(e) => handleQuery8Change(0, e.target.value)}
                />
              </div>
              <div>
                <Textarea
                  id="query8Value"
                  placeholder="Answer"
                  value={testimonial.query8?.[1] || ''}
                  onChange={(e) => handleQuery8Change(1, e.target.value)}
                />
              </div>
          </div>
      </div>
      )}
      <div className="flex justify-end space-x-2">
        {testimonial.$id && (
          <Button onClick={onDelete} className="bg-white text-black border border-black hover:bg-neutral-200">
            Delete
          </Button>
        )}
        <Button onClick={onSave} disabled={isSubmitting || isSaveButtonDisabled}>
        {isSubmitting ? "Saving..." : "Save"}
          </Button>
      </div>
    </div>
  );
};

interface TestimonialsTableProps {
  testimonials: any[];
  onEdit: (testimonial: any) => void;
}

const TestimonialsTable: React.FC<TestimonialsTableProps> = ({ testimonials, onEdit }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="mb-6 p-3 bg-white shadow-md rounded-lg border border-gray-300">
      <Table>
        <TableCaption>List of Customer Testimonials</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Customer Name</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Name of Institution</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {testimonials.map((testimonial) => (
            <React.Fragment key={testimonial.$id}>
              <TableRow
                className="cursor-pointer hover:bg-gray-100"
                onClick={() => onEdit(testimonial)}
              >
                <TableCell>{testimonial.customerName}</TableCell>
                <TableCell>{testimonial.designation}</TableCell>
                <TableCell>{testimonial.nameOfInstitution}</TableCell>
                <TableCell>{testimonial.phone}</TableCell>
                <TableCell>{testimonial.email}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(testimonial.$id);
                    }}
                  >
                    <ChevronRightIcon
                      className={`transition-transform ${
                        expandedRow === testimonial.$id ? "rotate-90" : ""
                      }`}
                    />
                  </Button>
                </TableCell>
              </TableRow>
              {expandedRow === testimonial.$id && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50">
                      <div>
                        {testimonial.query1 && (
                          <div>
                            <strong>What services/products are you using from the company?</strong>
                            <div>{testimonial.query1}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        {testimonial.query2 && (
                          <div>
                            <strong>Your View on Service Utilization - will the service/product be beneficial for your company/personal use?</strong>
                            <div>{testimonial.query2}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        {testimonial.query3 && (
                          <div>
                            <strong>Unique selling proposition of the company - what made you switch to using this company s service/product - how were you doing earlier?</strong>
                            <div>{testimonial.query3}</div>
                          </div>
                        )}
                      </div>
                      <div>
                        {testimonial.query4 && (
                          <div>
                            <strong>Future of this Segment - in your view, what will be the future of this segment?</strong>
                            <div>{testimonial.query4}</div>
                          </div>
                        )}
                      </div>
                      {/* Query5 Label and Value */}
                      {testimonial.query5 && (
                        <div>
                          <strong>{testimonial.query5[0]}</strong>
                          <p>{testimonial.query5[1]}</p>
                        </div>
                      )}
                      {/* Query6 Label and Value */}
                      {testimonial.query6 && (
                        <div>
                          <strong>{testimonial.query6[0]}</strong>
                          <p>{testimonial.query6[1]}</p>
                        </div>
                      )}
                      {testimonial.query7 && (
                        <div>
                          <strong>{testimonial.query7[0]}</strong>
                          <p>{testimonial.query7[1]}</p>
                        </div>
                      )}
                      {testimonial.query8 && (
                        <div>
                          <strong>{testimonial.query8[0]}</strong>
                          <p>{testimonial.query8[1]}</p>
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
  );
};

export default CustomerTestimonials;

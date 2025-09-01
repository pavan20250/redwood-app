"use client";

import React, { useEffect, useState } from "react";
import { STAGING_DATABASE_ID, PROJECTS_ID } from "@/appwrite/config";
import { databases } from "@/lib/utils";
import { Query } from "appwrite";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/ui/loading";

type Project = {
  id: string;
  name: string;
  startupStatus: string;
};

const ProjectsTablePage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const response = await databases.listDocuments(
          STAGING_DATABASE_ID,
          PROJECTS_ID,
          [Query.equal("startupStatus", "Pipeline")]
        );
        const projectData: Project[] = response.documents.map((doc: any) => ({
          id: doc.$id,
          name: doc.name || "",
          startupStatus: doc.startupStatus || "",
        }));
        setProjects(projectData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Pipeline Projects</h2>
      <div className="bg-white border border-gray-300 rounded-xl p-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Startup Name</TableHead>
            <TableHead>Project Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => (
            <TableRow key={project.id}>
              <TableCell>{project.name}</TableCell>
              <TableCell>{project.startupStatus}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      {projects.length === 0 && (
        <div className="text-center text-gray-500 mt-4">No pipeline projects found.</div>
      )}
    </div>
  );
};

export default ProjectsTablePage;

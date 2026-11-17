import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { fetchProjects, ProjectManifest, createProject, uploadChapterFile } from '../api';

interface ProjectContextType {
  projects: ProjectManifest[];
  selectedProject: ProjectManifest | null;
  setSelectedProject: (project: ProjectManifest | null) => void;
  isLoading: boolean;
  reloadProjects: () => Promise<ProjectManifest[]>;
  createNewChapter: (name: string, file?: File) => Promise<ProjectManifest | null>;
}

const ProjectContext = createContext<ProjectContextType>({
  projects: [],
  selectedProject: null,
  setSelectedProject: () => {},
  isLoading: false,
  reloadProjects: async () => [],
  createNewChapter: async () => null,
});

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const reloadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchProjects();
      setProjects(data);
      if (data.length > 0) {
        setSelectedProject((prev) => {
          if (!prev) return data[0];
          const found = data.find((p) => p.project_id === prev.project_id);
          return found || data[0];
        });
      }
      return data;
    } catch (err) {
      console.error('Failed to fetch projects', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadProjects();
  }, [reloadProjects]);

  const createNewChapter = async (name: string, file?: File): Promise<ProjectManifest | null> => {
    try {
      const project = await createProject(name.trim() || 'New Chapter');
      if (file) {
        await uploadChapterFile(project.project_id, file);
      }
      await reloadProjects();
      setSelectedProject(project);
      return project;
    } catch (err) {
      console.error('Failed to create new chapter', err);
      return null;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        projects,
        selectedProject,
        setSelectedProject,
        isLoading,
        reloadProjects,
        createNewChapter,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => useContext(ProjectContext);

import React, { useEffect, useState } from 'react';
import { fetchProjects, createProject, uploadChapterFile, ProjectManifest } from '../api';
import { FolderPlus, FileText, Upload, Sparkles, CheckCircle, Video, Presentation, HelpCircle } from 'lucide-react';

export const ChapterDashboard: React.FC = () => {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProject, setSelectedProject] = useState<ProjectManifest | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = () => {
    fetchProjects().then((data) => {
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const p = await createProject(newProjectName.trim());
    setNewProjectName('');
    setProjects([p, ...projects]);
    setSelectedProject(p);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedProject) return;
    setIsUploading(true);
    try {
      await uploadChapterFile(selectedProject.project_id, e.target.files[0]);
      loadProjects();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chapter Learning Packages</h1>
          <p className="text-slate-500 text-sm mt-1">Transform educational textbook chapters into classroom presentations, explainers, and games.</p>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            type="text"
            placeholder="New Chapter Title (e.g. Physics Laws)"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-72"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2 rounded-lg text-sm flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Create
          </button>
        </form>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Project Selector Sidebar */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-2">Your Chapter Projects</h2>
          <div className="space-y-1.5">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-400 p-2">No projects yet. Create one above!</p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.project_id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center justify-between transition-colors ${
                    selectedProject?.project_id === p.project_id
                      ? 'bg-indigo-50 border border-indigo-200 text-indigo-900 font-medium'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {p.source_filename && <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Project Workspace Detail */}
        <div className="col-span-8 bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          {selectedProject ? (
            <div>
              <div className="flex justify-between items-start pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{selectedProject.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Project ID: {selectedProject.project_id}</p>
                </div>

                <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  {isUploading ? 'Extracting...' : selectedProject.source_filename ? 'Replace Chapter File' : 'Upload Chapter (PDF/DOCX)'}
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                </label>
              </div>

              {selectedProject.source_filename ? (
                <div className="mt-6">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-800 flex items-center justify-between">
                    <span>Source: <strong>{selectedProject.source_filename}</strong></span>
                    <span className="bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-medium">Passages Indexed</span>
                  </div>

                  {/* Core Capability Cards */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                      <Presentation className="w-5 h-5 text-indigo-600 mb-2" />
                      <h3 className="font-semibold text-sm text-slate-800">Slide Deck</h3>
                      <p className="text-xs text-slate-500 mt-1">Generate editable .pptx presentation with template layout.</p>
                      <button className="mt-4 text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Generate Deck
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                      <Video className="w-5 h-5 text-purple-600 mb-2" />
                      <h3 className="font-semibold text-sm text-slate-800">Explainer Video</h3>
                      <p className="text-xs text-slate-500 mt-1">Parallel storyboard Manim scenes with Kokoro voiceover.</p>
                      <button className="mt-4 text-xs font-medium text-purple-600 hover:text-purple-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Draft Storyboard
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
                      <HelpCircle className="w-5 h-5 text-amber-600 mb-2" />
                      <h3 className="font-semibold text-sm text-slate-800">Classroom Quizzes</h3>
                      <p className="text-xs text-slate-500 mt-1">Interactive H5P multiple-choice questions & flashcards.</p>
                      <button className="mt-4 text-xs font-medium text-amber-600 hover:text-amber-800 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Generate Quizzes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg mt-6">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-600">No chapter uploaded yet</p>
                  <p className="text-xs text-slate-400 mt-1">Upload a PDF or DOCX file to extract text passages and generate materials.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">Select or create a project to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
};

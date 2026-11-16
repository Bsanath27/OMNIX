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
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Lovable Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          Next-Gen AI Textbook Transformation
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight sm:text-5xl bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Chapter Learning Packages
        </h1>
        <p className="mt-3 text-slate-400 text-sm sm:text-base leading-relaxed">
          Transform textbook chapters into interactive classroom slides, parallel video storyboards, and H5P gamified assessments.
        </p>

        {/* Lovable Floating Prompt Capsule */}
        <form onSubmit={handleCreate} className="mt-8">
          <div className="group relative rounded-2xl bg-white/[0.04] p-1.5 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)] transition-all duration-300 focus-within:border-indigo-500/50 focus-within:shadow-[0_0_35px_rgba(99,102,241,0.22)]">
            <div className="flex items-center gap-3 px-3 py-1.5">
              <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 ml-1" />
              <input
                type="text"
                placeholder="Name your new chapter package (e.g. Newton's Laws of Motion, Cell Biology)..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/25 transition-all shrink-0 cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                Create
              </button>
            </div>
          </div>
        </form>

        {/* Capability Badges */}
        <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
          {[
            { label: 'Reveal.js / PPTX Slides', icon: '✦' },
            { label: 'Manim + Kokoro Explainer', icon: '⚡' },
            { label: 'H5P Quizzes & Flashcards', icon: '🎯' },
            { label: 'Bloom Taxonomy Aligned', icon: '📚' },
          ].map((pill) => (
            <span
              key={pill.label}
              className="text-xs px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-slate-400 flex items-center gap-1.5"
            >
              <span className="text-indigo-400">{pill.icon}</span>
              {pill.label}
            </span>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Project Selector Sidebar */}
        <div className="col-span-4 bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-2xl">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-2">Your Chapter Projects</h2>
          <div className="space-y-2">
            {projects.length === 0 ? (
              <p className="text-sm text-slate-500 p-2">No projects yet. Create one above!</p>
            ) : (
              projects.map((p) => (
                <button
                  key={p.project_id}
                  onClick={() => setSelectedProject(p)}
                  className={`w-full text-left px-3.5 py-3 rounded-xl text-sm flex items-center justify-between transition-all ${
                    selectedProject?.project_id === p.project_id
                      ? 'bg-indigo-600/20 border border-indigo-500/40 text-white font-medium shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                      : 'hover:bg-white/[0.04] text-slate-300 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className={`w-4 h-4 shrink-0 ${selectedProject?.project_id === p.project_id ? 'text-indigo-400' : 'text-slate-400'}`} />
                    <span className="truncate">{p.name}</span>
                  </div>
                  {p.source_filename && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Project Workspace Detail */}
        <div className="col-span-8 bg-slate-900/40 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 shadow-2xl">
          {selectedProject ? (
            <div>
              <div className="flex justify-between items-start pb-6 border-b border-white/[0.08]">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight">{selectedProject.name}</h2>
                  <p className="text-xs text-slate-400 mt-1">Project ID: <span className="font-mono text-slate-300">{selectedProject.project_id}</span></p>
                </div>

                <label className="cursor-pointer bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all">
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
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 flex items-center justify-between">
                    <span>Source: <strong className="text-emerald-200">{selectedProject.source_filename}</strong></span>
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-medium">Passages Indexed</span>
                  </div>

                  {/* Core Capability Cards */}
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="group rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-indigo-500/40 p-4 backdrop-blur-sm transition-all hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-105 transition-transform">
                        <Presentation className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-white">Slide Deck</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">Generate editable .pptx presentation with template layout.</p>
                      <button className="mt-4 text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Generate Deck
                      </button>
                    </div>

                    <div className="group rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-purple-500/40 p-4 backdrop-blur-sm transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                        <Video className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-white">Explainer Video</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">Parallel storyboard Manim scenes with Kokoro voiceover.</p>
                      <button className="mt-4 text-xs font-medium text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Draft Storyboard
                      </button>
                    </div>

                    <div className="group rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.08] hover:border-amber-500/40 p-4 backdrop-blur-sm transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 transition-transform">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <h3 className="font-semibold text-sm text-white">Classroom Quizzes</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">Interactive H5P multiple-choice questions & flashcards.</p>
                      <button className="mt-4 text-xs font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Generate Quizzes
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl mt-6">
                  <FileText className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-300">No chapter uploaded yet</p>
                  <p className="text-xs text-slate-500 mt-1">Upload a PDF or DOCX file to extract text passages and generate materials.</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">Select or create a project to get started.</p>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { useRouter } from '../router';
import { useProjects } from '../context/ProjectContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import {
  BookOpen,
  Plus,
  Search,
  Upload,
  Calendar,
  Layers,
  ArrowRight,
  CheckCircle2,
  FileText,
} from 'lucide-react';

export const ChaptersPage: React.FC = () => {
  const { navigate } = useRouter();
  const { projects, selectedProject, setSelectedProject, createNewChapter, isLoading } = useProjects();

  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.source_filename && p.source_filename.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      const proj = await createNewChapter(newTitle.trim());
      setNewTitle('');
      if (proj) {
        navigate(`/c/${proj.project_id}`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const title = file.name.replace(/\.[^/.]+$/, '');
      setIsCreating(true);
      try {
        const proj = await createNewChapter(title, file);
        if (proj) {
          navigate(`/c/${proj.project_id}`);
        }
      } finally {
        setIsCreating(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-canvas-light dark:bg-canvas-dark text-content-light dark:text-content-dark p-6 sm:p-10 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-light dark:border-border-dark">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-brand/10 text-brand">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Chapter Projects
              </h1>
            </div>
            <p className="text-body-sm text-content-light-muted dark:text-content-dark-muted mt-1">
              Select any textbook chapter project to open its workspace, review source grounding, or generate materials.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-body-sm font-semibold hover:border-brand transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4 text-brand" />
              <span>Upload Document</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Quick Create Form */}
          <form onSubmit={handleCreate} className="flex items-center gap-2 w-full sm:max-w-md">
            <input
              type="text"
              placeholder="New chapter name (e.g. Thermodynamics)..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 px-3.5 py-2.5 text-body-sm rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-content-light dark:text-content-dark placeholder:text-content-light-subtle dark:placeholder:text-content-dark-subtle focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isCreating}
              disabled={!newTitle.trim()}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span>Create</span>
            </Button>
          </form>

          {/* Search Filter */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-content-light-subtle dark:text-content-dark-subtle" />
            <input
              type="text"
              placeholder="Search chapters..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 text-body-sm rounded-xl bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-content-light dark:text-content-dark placeholder:text-content-light-subtle dark:placeholder:text-content-dark-subtle focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="py-20 text-center text-content-light-muted dark:text-content-dark-muted text-body">
            Loading chapter projects from backend...
          </div>
        ) : filteredProjects.length === 0 ? (
          <Card className="p-12 text-center max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-h3 text-content-light dark:text-content-dark">
                {search ? 'No matching chapters' : 'No chapters yet'}
              </h3>
              <p className="text-body-sm text-content-light-muted dark:text-content-dark-muted mt-1">
                {search
                  ? `No chapter projects matched "${search}". Try clearing your search.`
                  : 'Get started by creating your first chapter or uploading a textbook document.'}
              </p>
            </div>
            <div className="pt-2">
              <Button
                variant="primary"
                onClick={() => fileInputRef.current?.click()}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Upload Textbook Document
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProjects.map((p) => {
              const isSelected = selectedProject?.project_id === p.project_id;
              const artifactCount = p.artifacts ? Object.keys(p.artifacts).length : 0;
              const formattedDate = p.created_at
                ? new Date(p.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Recent';

              return (
                <div
                  key={p.project_id}
                  onClick={() => {
                    setSelectedProject(p);
                    navigate(`/c/${p.project_id}`);
                  }}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-surface-light dark:bg-surface-dark border-brand shadow-sm ring-1 ring-brand'
                      : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark hover:border-brand/60 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-body sm:text-h3 text-content-light dark:text-content-dark group-hover:text-brand transition-colors line-clamp-1">
                        {p.name}
                      </h3>
                      {p.source_filename ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Grounded
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-surface-light-subtle dark:bg-surface-dark-subtle text-content-light-subtle dark:text-content-dark-subtle border border-border-light dark:border-border-dark">
                          Draft
                        </span>
                      )}
                    </div>

                    {p.source_filename && (
                      <div className="flex items-center gap-1.5 text-caption text-content-light-subtle dark:text-content-dark-subtle truncate">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.source_filename}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border-light dark:border-border-dark flex items-center justify-between text-caption text-content-light-subtle dark:text-content-dark-subtle">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                      {artifactCount > 0 && (
                        <span className="inline-flex items-center gap-1 text-brand font-medium">
                          <Layers className="w-3 h-3" />
                          {artifactCount} item{artifactCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-brand font-semibold group-hover:translate-x-0.5 transition-transform">
                      Open
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

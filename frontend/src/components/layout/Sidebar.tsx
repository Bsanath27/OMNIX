import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from '../../router';
import { useTheme, ThemeChoice } from '../../context/ThemeContext';
import { useProjects } from '../../context/ProjectContext';
import { STRINGS } from '../../strings';
import {
  Home,
  BookOpen,
  Wrench,
  Settings,
  Sun,
  Moon,
  Laptop,
  ChevronDown,
  Plus,
  Check,
  Search,
  CheckCircle2,
} from 'lucide-react';

interface SidebarProps {
  onNewChapter: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewChapter }) => {
  const { path, chapterId, navigate, openSettings } = useRouter();
  const { theme, setTheme } = useTheme();
  const { projects, selectedProject, setSelectedProject, isLoading } = useProjects();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(dropdownSearch.toLowerCase())
  );

  const navItems = [
    { label: 'Home', path: '/', icon: Home, isActive: path === '/' && !chapterId },
    {
      label: 'Chapters',
      path: '/chapters',
      icon: BookOpen,
      isActive: path === '/chapters',
      badge: projects.length > 0 ? String(projects.length) : undefined,
    },
    { label: 'Tools', path: '/tools', icon: Wrench, isActive: path === '/tools' },
  ];

  return (
    <aside className="w-64 sm:w-72 h-screen flex flex-col shrink-0 bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark select-none transition-colors duration-150">
      {/* 1. Header & Logo */}
      <div className="p-4 sm:p-5 border-b border-border-light dark:border-border-dark flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-base shadow-sm shadow-brand/25 group-hover:scale-105 transition-transform">
            Ω
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base tracking-tight text-content-light dark:text-content-dark">
              {STRINGS.app.name}
            </div>
            <div className="text-[10px] sm:text-[11px] font-medium text-content-light-subtle dark:text-content-dark-subtle leading-tight">
              {STRINGS.app.programme}
            </div>
          </div>
        </button>
      </div>

      {/* 2. Active Chapter Dropdown Selector (Real backend data, no hardcoded items) */}
      <div className="p-3 border-b border-border-light dark:border-border-dark relative" ref={dropdownRef}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-content-light-subtle dark:text-content-dark-subtle mb-1.5 px-1">
          Active Chapter
        </div>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark hover:border-brand/50 text-left transition-colors focus:outline-none focus:ring-1 focus:ring-brand"
        >
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="w-4 h-4 text-brand shrink-0" />
            <span className="text-xs font-semibold text-content-light dark:text-content-dark truncate">
              {selectedProject ? selectedProject.name : 'Select a chapter...'}
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-content-light-subtle dark:text-content-dark-subtle shrink-0 transition-transform ${
              isDropdownOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute left-3 right-3 top-full mt-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-2xl shadow-xl z-50 p-2 text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
            {/* Quick search if > 3 projects */}
            {projects.length > 3 && (
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-content-light-subtle dark:text-content-dark-subtle" />
                <input
                  type="text"
                  placeholder="Search chapters..."
                  value={dropdownSearch}
                  onChange={(e) => setDropdownSearch(e.target.value)}
                  className="w-full pl-8 pr-2 py-1 text-xs rounded-lg bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark text-content-light dark:text-content-dark focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {isLoading ? (
                <div className="p-3 text-center text-content-light-subtle dark:text-content-dark-subtle">
                  Loading chapters...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-3 text-center text-content-light-subtle dark:text-content-dark-subtle">
                  No chapters found
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const isSelected = selectedProject?.project_id === p.project_id;
                  return (
                    <button
                      key={p.project_id}
                      type="button"
                      onClick={() => {
                        setSelectedProject(p);
                        setIsDropdownOpen(false);
                        navigate(`/c/${p.project_id}`);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-brand/10 text-brand font-semibold'
                          : 'text-content-light dark:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{p.name}</span>
                        {p.source_filename && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-1.5 border-t border-border-light dark:border-border-dark">
              <button
                type="button"
                onClick={() => {
                  setIsDropdownOpen(false);
                  onNewChapter();
                }}
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-brand hover:bg-brand/10 font-semibold transition-colors text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Chapter</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Primary Navigation (Home, Chapters, Tools) */}
      <nav className="p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors ${
                item.isActive
                  ? 'bg-brand/10 text-brand font-semibold border border-brand/20'
                  : 'text-content-light-muted dark:text-content-dark-muted hover:text-content-light dark:hover:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${item.isActive ? 'text-brand' : 'opacity-70'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark text-content-light-subtle dark:text-content-dark-subtle">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* 4. Action Banner / New Chapter Button */}
      <div className="px-3 pt-1">
        <button
          type="button"
          onClick={onNewChapter}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs sm:text-sm font-semibold shadow-sm shadow-brand/20 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New chapter</span>
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* 5. Footer: Settings & Theme Switcher */}
      <div className="p-3 border-t border-border-light dark:border-border-dark space-y-2">
        <button
          type="button"
          onClick={openSettings}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-content-light-muted dark:text-content-dark-muted hover:text-content-light dark:hover:text-content-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>{STRINGS.sidebar.settings}</span>
        </button>

        {/* Theme Segmented Switcher */}
        <div className="p-1 rounded-xl bg-surface-light-subtle dark:bg-surface-dark-subtle border border-border-light dark:border-border-dark flex items-center gap-1">
          {[
            { id: 'system' as ThemeChoice, label: STRINGS.sidebar.systemTheme, icon: Laptop },
            { id: 'light' as ThemeChoice, label: STRINGS.sidebar.lightTheme, icon: Sun },
            { id: 'dark' as ThemeChoice, label: STRINGS.sidebar.darkTheme, icon: Moon },
          ].map((mode) => {
            const Icon = mode.icon;
            const isSelected = theme === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTheme(mode.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-surface-light dark:bg-surface-dark text-content-light dark:text-content-dark shadow-sm font-semibold'
                    : 'text-content-light-subtle dark:text-content-dark-subtle hover:text-content-light dark:hover:text-content-dark'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

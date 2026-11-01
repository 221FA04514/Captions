import React, { useEffect, useState } from 'react';
import {
  Film, Plus, Folder, Clock, FileText, ChevronRight,
  Search, X, Trash2
} from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';

interface ProjectSummary {
  id: string;
  title: string;
  updatedAt: string;
  videoName: string | null;
  cueCount: number;
}

interface DashboardProps {
  onEnterEditor: (projectId: string) => void;
}

export default function Dashboard({ onEnterEditor }: DashboardProps) {
  const { notify } = useAppContext();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const list = await api.projects.list();
      setProjects(list);
    } catch (err: any) {
      notify('error', `Failed to load projects: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setCreating(true);
      const project = await api.projects.create(newTitle.trim());
      notify('success', `Created project "${project.title}"`);
      setShowCreateModal(false);
      onEnterEditor(project.id);
    } catch (err: any) {
      notify('error', `Failed to create project: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const filteredProjects = search.trim()
    ? projects.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()))
    : projects;

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col font-sans select-none">
      {/* Top Application Bar */}
      <header className="h-13 bg-surface-50 border-b border-border px-6 flex items-center justify-between shadow-subtle flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-subtle">
            B
          </div>
          <div>
            <h1 className="text-xs font-semibold text-text-primary tracking-tight">
              Bujjigadu Subtitle Studio
            </h1>
            <p className="text-[10px] text-text-secondary leading-none">
              Professional Desktop Editor
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary text-xs"
          id="new-project-btn"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 flex flex-col">
        {/* Header Bar: Title & Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-semibold text-text-primary tracking-tight">
              Projects
            </h2>
            <p className="text-xs text-text-secondary">
              Open an existing project or create a new video editing session.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="input-field pl-8 py-1.5 text-xs"
              id="dashboard-search-input"
            />
          </div>
        </div>

        {/* Project List / Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-surface-50 border border-border rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="py-20 text-center rounded-xl border border-dashed border-border-strong bg-surface-50 p-8 space-y-3 shadow-subtle">
            <div className="w-10 h-10 rounded-full bg-surface-200 text-text-secondary flex items-center justify-center mx-auto">
              <Folder className="w-5 h-5 text-text-muted" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">
                {projects.length === 0 ? 'No projects yet' : 'No matching projects'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {projects.length === 0
                  ? 'Create your first project to start editing captions.'
                  : 'Try clearing your search query.'}
              </p>
            </div>
            {projects.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-primary text-xs mx-auto"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-surface-50 border border-border rounded-xl shadow-subtle divide-y divide-border overflow-hidden">
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => onEnterEditor(p.id)}
                id={`project-${p.id}`}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-surface-150 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-md bg-accent-light text-accent flex items-center justify-center flex-shrink-0">
                    <Film className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-xs text-text-primary group-hover:text-accent truncate">
                      {p.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-secondary">
                      {p.videoName && (
                        <span className="truncate max-w-xs">{p.videoName}</span>
                      )}
                      <span>·</span>
                      <span>{p.cueCount} captions</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 text-[11px] text-text-muted">
                  <span className="hidden sm:inline font-mono">{formatDate(p.updatedAt)}</span>
                  <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-50 border border-border rounded-xl shadow-modal max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-semibold text-xs text-text-primary">Create New Project</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-ghost p-1 text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] text-text-secondary font-medium">Project Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Telugu Vlog Episode 1"
                  className="input-field py-1.5 text-xs"
                  autoFocus
                  id="new-project-title-input"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-ghost text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="btn-primary text-xs px-3"
                >
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

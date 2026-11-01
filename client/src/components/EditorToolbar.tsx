import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronLeft, Film, FileText, Download, Save, Check,
  AlertCircle, X, Loader2, Sparkles, UploadCloud
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { api } from '../services/api';

interface EditorToolbarProps {
  onBack: () => void;
}

export default function EditorToolbar({ onBack }: EditorToolbarProps) {
  const { state, dispatch, notify } = useAppContext();
  const { project, projectDirty, exportJob, isExporting } = state;

  const videoInputRef = useRef<HTMLInputElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingSubs, setUploadingSubs] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(project?.title || '');

  useEffect(() => {
    if (project?.title) setTitleDraft(project.title);
  }, [project?.title]);

  const handleTitleBlur = () => {
    setEditingTitle(false);
    if (!project || !titleDraft.trim() || titleDraft === project.title) return;
    dispatch({
      type: 'SET_PROJECT',
      payload: { ...project, title: titleDraft.trim() },
    });
  };

  const handleSave = async () => {
    if (!project) return;
    try {
      setSaving(true);
      await api.projects.update(project.id, project);
      dispatch({ type: 'MARK_SAVED' });
      notify('success', 'Project saved successfully.');
    } catch (err: any) {
      notify('error', `Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingVideo(true);
      notify('info', `Uploading video "${file.name}"...`);
      const metadata = await api.upload.video(file);
      dispatch({ type: 'UPDATE_VIDEO', payload: metadata });
      notify('success', `Video loaded: ${metadata.width}×${metadata.height} (${Math.round(metadata.duration)}s)`);
    } catch (err: any) {
      notify('error', `Video upload failed: ${err.message}`);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleSubtitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingSubs(true);
      notify('info', `Parsing subtitle file "${file.name}"...`);
      const result = await api.upload.subtitles(file, project?.video?.duration);
      if (!result.isValid) {
        notify('error', `Subtitle errors: ${result.errors.join('; ')}`);
        return;
      }
      dispatch({ type: 'SET_CAPTIONS', payload: result.cues });
      notify('success', `Imported ${result.cueCount} subtitles successfully.`);
    } catch (err: any) {
      notify('error', `Subtitle upload failed: ${err.message}`);
    } finally {
      setUploadingSubs(false);
      if (subtitleInputRef.current) subtitleInputRef.current.value = '';
    }
  };

  const handleStartExport = async () => {
    if (!project || !project.video || project.captions.length === 0) {
      notify('error', 'Please ensure a video and captions are loaded before exporting.');
      return;
    }

    try {
      // Save before rendering
      await api.projects.update(project.id, project);
      dispatch({ type: 'MARK_SAVED' });

      dispatch({ type: 'SET_IS_EXPORTING', payload: true });
      setShowExportModal(true);
      const job = await api.export.start(project.id);
      dispatch({ type: 'SET_EXPORT_JOB', payload: job });

      // Poll until completion
      const interval = setInterval(async () => {
        try {
          const updated = await api.export.status(job.jobId);
          dispatch({ type: 'SET_EXPORT_JOB', payload: updated });

          if (updated.status === 'completed') {
            clearInterval(interval);
            dispatch({ type: 'SET_IS_EXPORTING', payload: false });
            notify('success', 'Video export finished! Click Download to save.');
          } else if (updated.status === 'failed' || updated.status === 'cancelled') {
            clearInterval(interval);
            dispatch({ type: 'SET_IS_EXPORTING', payload: false });
            notify('error', `Export ${updated.status}: ${updated.error || 'Unknown error'}`);
          }
        } catch {
          clearInterval(interval);
          dispatch({ type: 'SET_IS_EXPORTING', payload: false });
        }
      }, 1500);
    } catch (err: any) {
      dispatch({ type: 'SET_IS_EXPORTING', payload: false });
      notify('error', `Export start failed: ${err.message}`);
    }
  };

  const handleCancelExport = async () => {
    if (!exportJob) return;
    try {
      await api.export.cancel(exportJob.jobId);
      dispatch({ type: 'SET_IS_EXPORTING', payload: false });
      dispatch({ type: 'SET_EXPORT_JOB', payload: null });
      notify('info', 'Export cancelled.');
    } catch (err: any) {
      notify('error', `Failed to cancel export: ${err.message}`);
    }
  };

  const handleDownload = () => {
    if (!exportJob || exportJob.status !== 'completed') return;
    window.open(api.export.downloadUrl(exportJob.jobId), '_blank');
  };

  if (!project) return null;

  return (
    <>
      {/* Hidden File Inputs */}
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        className="hidden"
        onChange={handleVideoFile}
      />
      <input
        ref={subtitleInputRef}
        type="file"
        accept=".srt,.vtt,text/plain"
        className="hidden"
        onChange={handleSubtitleFile}
      />

      {/* Top Application Bar */}
      <header className="h-12 bg-surface-50 border-b border-border px-3.5 flex items-center justify-between flex-shrink-0 select-none z-20">
        {/* Left Section: Back, Brand, Breadcrumb, Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              if (projectDirty) {
                if (window.confirm('You have unsaved changes. Start a new video?')) {
                  onBack();
                }
              } else {
                onBack();
              }
            }}
            className="btn-ghost px-2 py-1 text-xs text-text-secondary hover:text-text-primary gap-1"
            title="Upload a new video"
            id="back-to-dashboard-btn"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="font-medium hidden sm:inline">New Video</span>
          </button>

          <div className="flex items-center gap-1.5 pr-2 border-r border-border/80">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center text-white font-bold text-[10px] tracking-tight">
              B
            </div>
            <span className="font-semibold text-xs tracking-tight text-text-primary hidden sm:inline">
              Bujjigadu
            </span>
          </div>

          {/* Project Title Editor */}
          <div className="flex items-center min-w-0">
            {editingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                autoFocus
                className="input-field py-0.5 px-1.5 text-xs font-medium w-48"
              />
            ) : (
              <span
                onClick={() => setEditingTitle(true)}
                className="font-medium text-xs text-text-primary truncate cursor-pointer hover:bg-surface-150 px-1.5 py-0.5 rounded transition-colors"
                title="Click to rename project"
                id="project-title-display"
              >
                {project.title}
              </span>
            )}
          </div>
        </div>

        {/* Center Section: Status Indicator */}
        <div className="hidden md:flex items-center gap-2 text-xs">
          {projectDirty ? (
            <span className="inline-flex items-center gap-1.5 text-status-warning font-medium text-[11px] px-2 py-0.5 rounded-full bg-status-warning-bg border border-amber-200/60">
              <span className="w-1.5 h-1.5 rounded-full bg-status-warning animate-pulse" />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-status-success text-[11px] px-2 py-0.5 rounded-full bg-status-success-bg border border-emerald-200/60 font-medium">
              <Check className="w-3 h-3 text-status-success" />
              Saved
            </span>
          )}
        </div>

        {/* Right Section: Media Actions, Save & Export */}
        <div className="flex items-center gap-2">
          {/* Video import shortcut */}
          <button
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingVideo}
            className={`btn-ghost text-xs ${
              project.video ? 'text-text-primary' : 'text-accent hover:bg-accent-light'
            }`}
            title={project.video ? `Replace video: ${project.video.originalName}` : 'Upload MP4, MOV, or WebM'}
            id="quick-video-upload-btn"
          >
            {uploadingVideo ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Film className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline truncate max-w-[130px]">
              {uploadingVideo ? 'Uploading...' : project.video ? project.video.originalName : 'Import Video'}
            </span>
          </button>

          {/* Subtitle import shortcut */}
          <button
            onClick={() => subtitleInputRef.current?.click()}
            disabled={uploadingSubs}
            className="btn-ghost text-xs text-text-secondary hover:text-text-primary"
            title="Upload SRT or WebVTT subtitles"
            id="quick-subtitle-upload-btn"
          >
            {uploadingSubs ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span className="hidden lg:inline">
              {uploadingSubs ? 'Importing...' : 'Import SRT/VTT'}
            </span>
          </button>

          <div className="h-4 w-px bg-border mx-0.5" />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving || !projectDirty}
            className="btn-secondary text-xs"
            id="save-project-btn"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>

          {/* Export button */}
          <button
            onClick={exportJob && !isExporting ? () => setShowExportModal(true) : handleStartExport}
            disabled={isExporting || !project.video || project.captions.length === 0}
            className="btn-primary text-xs"
            id="export-btn"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{exportJob?.progress || 0}%</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export MP4</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Export Modal / Progress Popover */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-50 border border-border rounded-xl shadow-modal max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-accent-light text-accent flex items-center justify-center font-bold">
                  <Film className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-text-primary">
                    {isExporting ? 'Rendering Video...' : exportJob?.status === 'completed' ? 'Export Complete' : 'Video Export'}
                  </h3>
                  <p className="text-[11px] text-text-secondary">
                    {exportJob?.outputFilename || 'bujjigadu_export.mp4'}
                  </p>
                </div>
              </div>
              {!isExporting && (
                <button
                  onClick={() => setShowExportModal(false)}
                  className="btn-ghost p-1 text-text-muted hover:text-text-primary"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Stage & Progress Bar */}
            <div className="space-y-2 py-1">
              <div className="flex justify-between text-xs">
                <span className="text-text-secondary font-medium">
                  {exportJob?.stage || 'Preparing render pipeline...'}
                </span>
                <span className="font-mono font-semibold text-accent">
                  {exportJob?.progress ?? 0}%
                </span>
              </div>
              <div className="h-2 w-full bg-surface-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300 rounded-full"
                  style={{ width: `${exportJob?.progress ?? 0}%` }}
                />
              </div>
            </div>

            {/* Error display if failed */}
            {exportJob?.error && (
              <div className="p-3 rounded-lg bg-status-error-bg border border-red-200 text-xs text-status-error flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-words leading-relaxed">{exportJob.error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              {isExporting ? (
                <button
                  onClick={handleCancelExport}
                  className="btn-danger text-xs px-3"
                  id="cancel-export-btn"
                >
                  <X className="w-3.5 h-3.5" /> Cancel Render
                </button>
              ) : exportJob?.status === 'completed' ? (
                <>
                  <button
                    onClick={() => setShowExportModal(false)}
                    className="btn-secondary text-xs"
                  >
                    Done
                  </button>
                  <button
                    onClick={handleDownload}
                    className="btn-primary text-xs px-3.5"
                    id="download-export-btn"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download MP4
                  </button>
                </>
              ) : (
                <button
                  onClick={handleStartExport}
                  className="btn-primary text-xs px-3.5"
                >
                  Retry Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

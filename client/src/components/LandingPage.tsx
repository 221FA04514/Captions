import React, { useRef, useState } from 'react';
import {
  Film, Upload, Sparkles, Check, FileText, ArrowRight,
  ShieldCheck, Zap, Download
} from 'lucide-react';
import { api } from '../services/api';
import { useAppContext } from '../context/AppContext';
import GoogleAdBanner from './GoogleAdBanner';

interface LandingPageProps {
  onVideoReady: (projectId: string) => void;
}

export default function LandingPage({ onVideoReady }: LandingPageProps) {
  const { dispatch, notify } = useAppContext();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressStage, setProgressStage] = useState('');

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate video format
    const validExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt && !file.type.startsWith('video/')) {
      notify('error', 'Please select a valid video file (MP4, MOV, WebM).');
      return;
    }

    try {
      setUploading(true);
      setProgressStage('Uploading and inspecting video...');

      // 1. Upload video to get metadata
      const metadata = await api.upload.video(file);

      // 2. Create instant editing project session
      setProgressStage('Creating workspace session...');
      const title = file.name.replace(/\.[^/.]+$/, '');
      const project = await api.projects.create(title);

      // 3. Attach uploaded video to the project
      project.video = metadata;
      await api.projects.update(project.id, project);

      // 4. Update AppContext state & transition immediately to editor
      dispatch({ type: 'SET_PROJECT', payload: project });
      notify('success', `Video ready! Duration: ${Math.round(metadata.duration)}s (${metadata.width}×${metadata.height})`);

      onVideoReady(project.id);
    } catch (err: any) {
      notify('error', `Upload failed: ${err.message}`);
      setUploading(false);
      setProgressStage('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="min-h-screen bg-surface-100 flex flex-col font-sans select-none">
      {/* Top Header */}
      <header className="h-14 bg-surface-50 border-b border-border px-6 flex items-center justify-between shadow-subtle flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white font-bold text-xs tracking-tight shadow-subtle">
            B
          </div>
          <div>
            <h1 className="text-xs font-semibold text-text-primary tracking-tight">
              Bujjigadu Subtitle Studio
            </h1>
            <p className="text-[10px] text-text-secondary leading-none">
              Free Online Subtitle Editor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-status-success px-2.5 py-0.5 rounded-full bg-status-success-bg border border-emerald-200/60 hidden sm:inline-flex items-center gap-1">
            <Check className="w-3 h-3" /> 100% Free • No Sign-up Required
          </span>
        </div>
      </header>

      {/* Hero / Upload Main View */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10 flex flex-col justify-center items-center text-center">
        {/* Value Proposition Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light border border-accent/20 text-accent text-xs font-semibold mb-4 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Telugu & English Subtitle Burn-In • 13 Styles • Karaoke Highlights</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight mb-2">
          Add Subtitles & Captions to Your Video
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary max-w-lg mb-8 leading-relaxed">
          Upload any video. Add your captions or import an SRT/VTT file, customize typography & colors, and download your ready-to-share MP4.
        </p>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {/* Primary Large Drag-and-Drop Video Target */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`w-full max-w-xl p-10 sm:p-14 rounded-2xl border-2 border-dashed transition-all cursor-pointer shadow-subtle ${
            uploading
              ? 'bg-surface-50 border-accent pointer-events-none'
              : isDragOver
              ? 'bg-accent-light/50 border-accent ring-4 ring-accent/10 scale-[1.01]'
              : 'bg-surface-50 border-border-strong hover:border-accent hover:bg-surface-150'
          }`}
          id="main-video-dropzone"
        >
          {uploading ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-accent-light text-accent flex items-center justify-center animate-spin">
                <Film className="w-6 h-6" />
              </div>
              <p className="font-semibold text-sm text-text-primary">{progressStage}</p>
              <p className="text-xs text-text-muted">Extracting video metadata and preparing editor...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-accent-light text-accent flex items-center justify-center shadow-subtle transition-transform group-hover:scale-110">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm text-text-primary">
                  Click to select video or drag and drop
                </p>
                <p className="text-xs text-text-muted mt-1">
                  MP4, MOV, or WebM • Up to 500MB
                </p>
              </div>

              <button
                type="button"
                className="btn-primary text-xs px-4 py-2 mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Choose Video File</span>
              </button>
            </div>
          )}
        </div>

        {/* Feature Highlights Strip */}
        <div className="grid grid-cols-3 gap-4 max-w-xl w-full mt-8 text-center text-xs text-text-secondary">
          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <Zap className="w-4 h-4 text-accent mx-auto mb-1.5" />
            <span className="font-semibold text-text-primary block text-[11px]">Instant Burn-In</span>
            <span className="text-[10px] text-text-muted">FFmpeg MP4 rendering</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <Sparkles className="w-4 h-4 text-accent mx-auto mb-1.5" />
            <span className="font-semibold text-text-primary block text-[11px]">Telugu + English</span>
            <span className="text-[10px] text-text-muted">Full Unicode harmony</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-50 border border-border">
            <ShieldCheck className="w-4 h-4 text-accent mx-auto mb-1.5" />
            <span className="font-semibold text-text-primary block text-[11px]">No Login Needed</span>
            <span className="text-[10px] text-text-muted">100% Free to use</span>
          </div>
        </div>

        {/* Google Ad Slot */}
        <GoogleAdBanner className="mt-8" />
      </main>

      {/* Minimal Footer */}
      <footer className="h-10 bg-surface-50 border-t border-border px-6 flex items-center justify-between text-[11px] text-text-muted flex-shrink-0">
        <span>Bujjigadu Subtitle Studio</span>
        <span>Free Video Tools • Telugu & English Subtitles</span>
      </footer>
    </div>
  );
}


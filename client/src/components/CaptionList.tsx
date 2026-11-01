import React, { useState, useRef } from 'react';
import {
  Search, Plus, Trash2, ChevronUp, ChevronDown, Clock,
  SlidersHorizontal, FileText, UploadCloud, Loader2, Sparkles
} from 'lucide-react';
import type { CaptionCue } from '../types';
import { useAppContext, buildNewCue } from '../context/AppContext';
import { api } from '../services/api';

function formatSrtTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 1000);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0').slice(0, 2)}`;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(3, '0').slice(0, 2)}`;
}

function parseTimeInput(val: string): number | null {
  const clean = val.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 3) {
    const h = parseFloat(parts[0]);
    const m = parseFloat(parts[1]);
    const s = parseFloat(parts[2]);
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const m = parseFloat(parts[0]);
    const s = parseFloat(parts[1]);
    if (isNaN(m) || isNaN(s)) return null;
    return m * 60 + s;
  }
  const n = parseFloat(clean);
  return isNaN(n) ? null : n;
}

interface CaptionRowProps {
  cue: CaptionCue;
  isActive: boolean;
  onClick: () => void;
}

function CaptionRow({ cue, isActive, onClick }: CaptionRowProps) {
  const { dispatch, notify, seekTo } = useAppContext();
  const [editingText, setEditingText] = useState(false);
  const [textDraft, setTextDraft] = useState(cue.text);
  const [editingStart, setEditingStart] = useState(false);
  const [startDraft, setStartDraft] = useState(formatSrtTime(cue.startTime));
  const [editingEnd, setEditingEnd] = useState(false);
  const [endDraft, setEndDraft] = useState(formatSrtTime(cue.endTime));

  const hasOverride = !!cue.styleOverride && Object.keys(cue.styleOverride).length > 0;

  const handleTextBlur = () => {
    setEditingText(false);
    if (textDraft !== cue.text) {
      dispatch({ type: 'UPDATE_CAPTION', payload: { ...cue, text: textDraft } });
    }
  };

  const handleStartBlur = () => {
    setEditingStart(false);
    const parsed = parseTimeInput(startDraft);
    if (parsed === null) {
      setStartDraft(formatSrtTime(cue.startTime));
      notify('error', `Invalid start time: "${startDraft}"`);
      return;
    }
    if (parsed >= cue.endTime) {
      setStartDraft(formatSrtTime(cue.startTime));
      notify('error', 'Start time must be before end time.');
      return;
    }
    const rounded = Math.round(parsed * 1000) / 1000;
    dispatch({ type: 'UPDATE_CAPTION', payload: { ...cue, startTime: rounded } });
  };

  const handleEndBlur = () => {
    setEditingEnd(false);
    const parsed = parseTimeInput(endDraft);
    if (parsed === null) {
      setEndDraft(formatSrtTime(cue.endTime));
      notify('error', `Invalid end time: "${endDraft}"`);
      return;
    }
    if (parsed <= cue.startTime) {
      setEndDraft(formatSrtTime(cue.endTime));
      notify('error', 'End time must be after start time.');
      return;
    }
    const rounded = Math.round(parsed * 1000) / 1000;
    dispatch({ type: 'UPDATE_CAPTION', payload: { ...cue, endTime: rounded } });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'DELETE_CAPTION', payload: cue.id });
  };

  return (
    <div
      onClick={() => {
        onClick();
        seekTo(cue.startTime);
      }}
      id={`caption-row-${cue.id}`}
      className={`group relative px-3 py-2 border-b border-border-subtle cursor-pointer transition-colors ${
        isActive
          ? 'bg-accent-light/50 border-l-2 border-l-accent'
          : 'hover:bg-surface-150 border-l-2 border-l-transparent'
      }`}
    >
      {/* Top micro-row: index, badge, timestamps, delete */}
      <div className="flex items-center justify-between text-[11px] mb-1">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-text-muted font-medium">#{cue.index}</span>
          {hasOverride && (
            <span className="px-1 py-0.2 rounded text-[9px] bg-accent-subtle text-accent font-semibold tracking-tight">
              custom
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Timestamp pills */}
          <div className="flex items-center gap-1 font-mono text-[11px] text-text-secondary">
            {editingStart ? (
              <input
                value={startDraft}
                onChange={(e) => setStartDraft(e.target.value)}
                onBlur={handleStartBlur}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                autoFocus
                className="input-field py-0 px-1 text-[11px] font-mono w-16"
                id={`start-time-${cue.id}`}
              />
            ) : (
              <span
                onClick={() => {
                  setEditingStart(true);
                  setStartDraft(formatSrtTime(cue.startTime));
                }}
                className="hover:text-accent hover:underline cursor-pointer"
                title="Click to edit start time"
              >
                {formatSrtTime(cue.startTime)}
              </span>
            )}
            <span className="text-text-dim text-[10px]">→</span>
            {editingEnd ? (
              <input
                value={endDraft}
                onChange={(e) => setEndDraft(e.target.value)}
                onBlur={handleEndBlur}
                onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                autoFocus
                className="input-field py-0 px-1 text-[11px] font-mono w-16"
                id={`end-time-${cue.id}`}
              />
            ) : (
              <span
                onClick={() => {
                  setEditingEnd(true);
                  setEndDraft(formatSrtTime(cue.endTime));
                }}
                className="hover:text-accent hover:underline cursor-pointer"
                title="Click to edit end time"
              >
                {formatSrtTime(cue.endTime)}
              </span>
            )}
          </div>

          {/* Delete Icon Button (revealed on hover) */}
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-status-error p-0.5 rounded transition-all"
            title="Delete caption"
            id={`delete-caption-${cue.id}`}
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Caption text */}
      {editingText ? (
        <textarea
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          onBlur={handleTextBlur}
          autoFocus
          rows={2}
          className="input-field text-xs resize-none"
          onClick={(e) => e.stopPropagation()}
          id={`caption-text-input-${cue.id}`}
        />
      ) : (
        <p
          onDoubleClick={(e) => {
            e.stopPropagation();
            setEditingText(true);
            setTextDraft(cue.text);
          }}
          className="text-xs text-text-primary leading-snug line-clamp-2 select-text"
          title="Double-click to edit text"
        >
          {cue.text || <span className="text-text-muted italic">Empty caption text</span>}
        </p>
      )}
    </div>
  );
}

export default function CaptionList() {
  const { state, dispatch, notify, seekTo } = useAppContext();
  const { project, activeCueId, currentTime } = state;
  const [search, setSearch] = useState('');
  const [offsetInput, setOffsetInput] = useState('0');
  const [showOffsetControl, setShowOffsetControl] = useState(false);
  const [uploadingSubs, setUploadingSubs] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const subtitleInputRef = useRef<HTMLInputElement>(null);

  if (!project) return null;

  const captions = project.captions;

  const filtered = search.trim()
    ? captions.filter((c) => c.text.toLowerCase().includes(search.toLowerCase()))
    : captions;

  const handleAddCaption = () => {
    const newCue = buildNewCue(currentTime);
    dispatch({ type: 'ADD_CAPTION', payload: newCue });
    seekTo(newCue.startTime);
    notify('info', 'New caption added. Double-click to edit.');
  };

  const handleSubtitleFile = async (file: File) => {
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

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSubtitleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleSubtitleFile(file);
  };

  const handleApplyOffset = () => {
    const offset = parseFloat(offsetInput);
    if (isNaN(offset)) {
      notify('error', 'Please enter a valid number of seconds for timing offset.');
      return;
    }
    dispatch({ type: 'APPLY_OFFSET', payload: offset });
    notify('success', `Timing offset of ${offset}s applied to all captions.`);
  };

  const activeCueIdx = captions.findIndex((c) => c.id === activeCueId);
  const navToPrev = () => {
    if (activeCueIdx > 0) {
      const prev = captions[activeCueIdx - 1];
      dispatch({ type: 'SET_ACTIVE_CUE', payload: prev.id });
      seekTo(prev.startTime);
    }
  };
  const navToNext = () => {
    if (activeCueIdx < captions.length - 1) {
      const next = captions[activeCueIdx + 1];
      dispatch({ type: 'SET_ACTIVE_CUE', payload: next.id });
      seekTo(next.startTime);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-50 border-r border-border select-none">
      {/* Hidden File Input for Subtitles */}
      <input
        ref={subtitleInputRef}
        type="file"
        accept=".srt,.vtt,text/plain"
        className="hidden"
        onChange={onFileInputChange}
      />

      {/* Header */}
      <div className="p-3 border-b border-border flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-xs text-text-primary tracking-tight">Captions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-200 text-text-secondary text-[11px] font-medium">
              {captions.length}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {captions.length > 0 && (
              <>
                <button
                  onClick={navToPrev}
                  disabled={activeCueIdx <= 0}
                  className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
                  title="Previous caption"
                  id="prev-caption-btn"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={navToNext}
                  disabled={activeCueIdx >= captions.length - 1}
                  className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
                  title="Next caption"
                  id="next-caption-btn"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={() => subtitleInputRef.current?.click()}
              disabled={uploadingSubs}
              className="btn-ghost py-1 px-1.5 text-xs text-text-secondary hover:text-text-primary"
              title="Import SRT or VTT file"
            >
              {uploadingSubs ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
            </button>
            <button
              onClick={handleAddCaption}
              className="btn-secondary py-1 px-2 text-xs"
              id="add-caption-btn"
              title="Add caption at current playback position"
            >
              <Plus className="w-3 h-3 text-accent" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Search */}
        {captions.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search captions..."
              className="input-field pl-8 py-1 text-xs"
              id="caption-search-input"
            />
          </div>
        )}
      </div>

      {/* Caption List or Empty Highlight State */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {captions.length === 0 ? (
          <div className="p-4 flex flex-col items-center justify-center min-h-[380px]">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`w-full rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-accent bg-accent-light/60 scale-[1.01]'
                  : 'border-accent/40 bg-accent/[0.03] hover:border-accent/70 hover:bg-accent/[0.05]'
              }`}
            >
              {/* Step 2 Badge */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent text-white text-[10px] font-bold tracking-wider uppercase shadow-xs mb-3">
                <Sparkles className="w-3 h-3" />
                Step 2: Add Subtitles
              </div>

              <h3 className="text-sm font-semibold text-text-primary tracking-tight mb-1">
                Bring Your Video to Life
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-5">
                Drop your subtitle file here or create captions manually from scratch.
              </p>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  onClick={() => subtitleInputRef.current?.click()}
                  disabled={uploadingSubs}
                  className="btn-primary w-full py-2.5 text-xs font-semibold justify-center shadow-xs"
                  id="import-srt-empty-btn"
                >
                  {uploadingSubs ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                  <span>Upload SRT or VTT File</span>
                </button>

                <div className="flex items-center gap-2 my-2">
                  <div className="h-px bg-border flex-1" />
                  <span className="text-[10px] uppercase font-semibold text-text-muted tracking-widest">
                    OR
                  </span>
                  <div className="h-px bg-border flex-1" />
                </div>

                <button
                  onClick={handleAddCaption}
                  className="btn-secondary w-full py-2 text-xs font-medium justify-center"
                  id="add-manual-empty-btn"
                >
                  <Plus className="w-3.5 h-3.5 text-accent" />
                  <span>Add Captions Manually</span>
                </button>
              </div>

              <p className="mt-4 text-[10px] text-text-muted leading-tight">
                Supports standard .srt and .vtt files with full Telugu & English font rendering.
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs text-text-muted px-4 space-y-1">
            <p className="font-medium text-text-secondary">No matching captions</p>
            <p className="text-[11px]">Try adjusting your search query.</p>
          </div>
        ) : (
          filtered.map((cue) => (
            <CaptionRow
              key={cue.id}
              cue={cue}
              isActive={cue.id === activeCueId}
              onClick={() => dispatch({ type: 'SET_ACTIVE_CUE', payload: cue.id })}
            />
          ))
        )}
      </div>

      {/* Footer: Global Timing Offset */}
      {captions.length > 0 && (
        <div className="p-2.5 border-t border-border bg-surface-100 flex-shrink-0 text-xs">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowOffsetControl(!showOffsetControl)}
              className="text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-1 font-medium"
            >
              <SlidersHorizontal className="w-3 h-3 text-text-muted" />
              <span>Global Timing Shift</span>
            </button>
          </div>

          {showOffsetControl && (
            <div className="mt-2 pt-2 border-t border-border-subtle flex items-center gap-1.5">
              <input
                type="number"
                step="0.1"
                value={offsetInput}
                onChange={(e) => setOffsetInput(e.target.value)}
                placeholder="±0.5s"
                className="input-field py-1 px-2 text-xs font-mono w-20"
                id="global-offset-input"
              />
              <button
                onClick={handleApplyOffset}
                className="btn-secondary py-1 text-xs flex-1"
                id="apply-offset-btn"
              >
                Apply Shift
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

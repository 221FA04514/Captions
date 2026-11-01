import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Clock, Sparkles } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import type { CaptionCue } from '../types';

function formatRulerTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'scrub' | null;

interface DragState {
  mode: DragMode;
  cueId?: string;
  initialMouseX: number;
  initialStartTime: number;
  initialEndTime: number;
}

export default function Timeline() {
  const { state, dispatch, seekTo } = useAppContext();
  const { project, currentTime, activeCueId } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const duration = Math.max(10, project?.video?.duration || 30);
  const [pixelsPerSecond, setPixelsPerSecond] = useState(48); // Zoom level
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Auto-scroll timeline to follow playhead when playing
  useEffect(() => {
    if (!containerRef.current || dragState) return;
    const playheadPx = currentTime * pixelsPerSecond;
    const container = containerRef.current;
    const scrollLeft = container.scrollLeft;
    const width = container.clientWidth;

    // Scroll if playhead is past 75% of visible view
    if (playheadPx > scrollLeft + width * 0.75 || playheadPx < scrollLeft) {
      container.scrollTo({
        left: Math.max(0, playheadPx - width * 0.25),
        behavior: 'smooth',
      });
    }
  }, [currentTime, pixelsPerSecond, dragState]);

  const totalWidth = Math.max(800, duration * pixelsPerSecond + 160);

  // Zoom controls
  const handleZoomIn = () => setPixelsPerSecond((prev) => Math.min(180, Math.round(prev * 1.3)));
  const handleZoomOut = () => setPixelsPerSecond((prev) => Math.max(12, Math.round(prev * 0.75)));
  const handleFit = () => {
    if (!containerRef.current || duration <= 0) return;
    const availableWidth = containerRef.current.clientWidth - 40;
    const fitted = Math.max(12, Math.min(120, Math.floor(availableWidth / duration)));
    setPixelsPerSecond(fitted);
  };

  // Click on ruler or track background to seek
  const handleTrackMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.caption-block')) return;
    const track = trackRef.current;
    if (!track) return;

    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const targetTime = Math.max(0, Math.min(duration, clickX / pixelsPerSecond));
    seekTo(targetTime);
    setDragState({
      mode: 'scrub',
      initialMouseX: e.clientX,
      initialStartTime: targetTime,
      initialEndTime: targetTime,
    });
  };

  // Start dragging a caption block or resize handles
  const handleCueMouseDown = (
    e: React.MouseEvent,
    cue: CaptionCue,
    mode: 'move' | 'resize-start' | 'resize-end'
  ) => {
    e.stopPropagation();
    dispatch({ type: 'SET_ACTIVE_CUE', payload: cue.id });
    if (mode === 'move') {
      seekTo(cue.startTime);
    }

    setDragState({
      mode,
      cueId: cue.id,
      initialMouseX: e.clientX,
      initialStartTime: cue.startTime,
      initialEndTime: cue.endTime,
    });
  };

  // Handle drag movements
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !project) return;

      const deltaX = e.clientX - dragState.initialMouseX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (dragState.mode === 'scrub') {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const targetTime = Math.max(0, Math.min(duration, clickX / pixelsPerSecond));
        seekTo(targetTime);
        return;
      }

      if (!dragState.cueId) return;
      const cue = project.captions.find((c) => c.id === dragState.cueId);
      if (!cue) return;

      if (dragState.mode === 'move') {
        const cueDuration = dragState.initialEndTime - dragState.initialStartTime;
        let newStart = Math.max(0, dragState.initialStartTime + deltaTime);
        let newEnd = newStart + cueDuration;
        if (newEnd > duration) {
          newEnd = duration;
          newStart = Math.max(0, newEnd - cueDuration);
        }
        dispatch({
          type: 'UPDATE_CAPTION',
          payload: {
            ...cue,
            startTime: Math.round(newStart * 100) / 100,
            endTime: Math.round(newEnd * 100) / 100,
          },
        });
      } else if (dragState.mode === 'resize-start') {
        const newStart = Math.max(0, Math.min(cue.endTime - 0.2, dragState.initialStartTime + deltaTime));
        dispatch({
          type: 'UPDATE_CAPTION',
          payload: {
            ...cue,
            startTime: Math.round(newStart * 100) / 100,
          },
        });
      } else if (dragState.mode === 'resize-end') {
        const newEnd = Math.max(cue.startTime + 0.2, Math.min(duration, dragState.initialEndTime + deltaTime));
        dispatch({
          type: 'UPDATE_CAPTION',
          payload: {
            ...cue,
            endTime: Math.round(newEnd * 100) / 100,
          },
        });
      }
    },
    [dragState, pixelsPerSecond, duration, project, dispatch, seekTo]
  );

  const handleMouseUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragState, handleMouseMove, handleMouseUp]);

  // Generate ruler tick marks
  const tickInterval = pixelsPerSecond < 30 ? 5 : pixelsPerSecond < 70 ? 2 : 1;
  const ticks: number[] = [];
  for (let t = 0; t <= duration; t += tickInterval) {
    ticks.push(t);
  }

  const captions = project?.captions || [];

  return (
    <div className="flex flex-col h-36 bg-surface-50 border-t border-border flex-shrink-0 select-none z-10">
      {/* Timeline Controls Header */}
      <div className="h-8 px-3.5 bg-surface-100 border-b border-border flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary text-[11px] uppercase tracking-wider">
            Timeline
          </span>
          <span className="text-[11px] text-text-muted">
            {duration.toFixed(1)}s total
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-mono text-text-muted mr-1">
            {pixelsPerSecond}px/s
          </span>
          <button
            onClick={handleZoomOut}
            className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
            title="Zoom Out"
            id="timeline-zoom-out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
            title="Zoom In"
            id="timeline-zoom-in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleFit}
            className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
            title="Fit to View"
            id="timeline-zoom-fit"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Scrollable Track Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative bg-surface-100/50"
        onMouseDown={handleTrackMouseDown}
      >
        <div
          ref={trackRef}
          className="relative h-full"
          style={{ width: `${totalWidth}px` }}
        >
          {/* Time Ruler */}
          <div className="h-6 border-b border-border bg-surface-50/90 relative flex items-center">
            {ticks.map((t) => (
              <div
                key={t}
                className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                style={{ left: `${t * pixelsPerSecond}px` }}
              >
                <span className="text-[10px] font-mono text-text-muted pl-1 select-none">
                  {formatRulerTime(t)}
                </span>
                <div className="w-px h-1.5 bg-border-strong" />
              </div>
            ))}
          </div>

          {/* Subtitle Clips Track */}
          <div className="relative h-20 p-2">
            {captions.map((cue) => {
              const leftPx = cue.startTime * pixelsPerSecond;
              const widthPx = Math.max(24, (cue.endTime - cue.startTime) * pixelsPerSecond);
              const isActive = cue.id === activeCueId;
              const hasOverride = !!cue.styleOverride && Object.keys(cue.styleOverride).length > 0;

              return (
                <div
                  key={cue.id}
                  className={`caption-block absolute top-2.5 h-13 rounded-md border text-xs flex items-center overflow-hidden transition-all cursor-grab active:cursor-grabbing group shadow-subtle ${
                    isActive
                      ? 'bg-accent-light border-accent ring-1 ring-accent text-accent'
                      : 'bg-surface-50 border-border hover:border-accent/60 hover:bg-surface-150 text-text-primary'
                  }`}
                  style={{
                    left: `${leftPx}px`,
                    width: `${widthPx}px`,
                  }}
                  onMouseDown={(e) => handleCueMouseDown(e, cue, 'move')}
                  id={`timeline-cue-${cue.id}`}
                  title={`#${cue.index}: ${cue.text} (${cue.startTime.toFixed(2)}s - ${cue.endTime.toFixed(2)}s)`}
                >
                  {/* Left Trim Handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-accent/40 z-20 group-hover:bg-border transition-colors"
                    onMouseDown={(e) => handleCueMouseDown(e, cue, 'resize-start')}
                    title="Drag to trim start time"
                  />

                  {/* Clip Content */}
                  <div className="flex-1 px-2.5 truncate pointer-events-none">
                    <div className="flex items-center gap-1 text-[10px] font-mono text-text-secondary mb-0.5">
                      <span className="font-semibold text-text-primary">#{cue.index}</span>
                      {hasOverride && (
                        <span className="px-1 rounded bg-accent-subtle text-accent text-[9px] font-medium">
                          custom
                        </span>
                      )}
                      <span>·</span>
                      <span>{(cue.endTime - cue.startTime).toFixed(2)}s</span>
                    </div>
                    <p className="text-[11px] truncate font-medium leading-none">
                      {cue.text || <span className="text-text-muted italic">Empty</span>}
                    </p>
                  </div>

                  {/* Right Trim Handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-accent/40 z-20 group-hover:bg-border transition-colors"
                    onMouseDown={(e) => handleCueMouseDown(e, cue, 'resize-end')}
                    title="Drag to extend end time"
                  />
                </div>
              );
            })}
          </div>

          {/* Current Playhead Line */}
          <div
            className="absolute top-0 bottom-0 w-[1.5px] bg-accent z-30 pointer-events-none"
            style={{ left: `${currentTime * pixelsPerSecond}px` }}
          >
            {/* Playhead Needle Anchor */}
            <div className="w-2.5 h-2.5 bg-accent rounded-xs -ml-[4.5px] -top-1 absolute shadow-sm" />
          </div>
        </div>
      </div>
    </div>
  );
}

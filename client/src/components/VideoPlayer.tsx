import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Upload, Film, Sparkles, AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import SubtitleOverlay from './SubtitleOverlay';
import { api } from '../services/api';

function formatTime(sec: number): string {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${ms}`;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${ms}`;
}

export default function VideoPlayer() {
  const { state, dispatch, seekTo, notify } = useAppContext();
  const { project, currentTime, activeCueId, seekTarget } = state;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [frameDimensions, setFrameDimensions] = useState<{ width: number; height: number }>({
    width: 640,
    height: 360,
  });

  const videoSrc = state.localVideoUrl || (project?.video ? api.media.videoUrl(project.video.filename) : null);
  const naturalWidth = project?.video?.width || (videoRef.current?.videoWidth || 1920);
  const naturalHeight = project?.video?.height || (videoRef.current?.videoHeight || 1080);
  const aspectRatio = naturalWidth / naturalHeight;

  // Calculate video frame dimensions to maintain exact aspect ratio within container
  const updateFrameDimensions = useCallback(() => {
    const container = containerRef.current;
    if (!container || !naturalWidth || !naturalHeight) return;

    const availableW = Math.max(100, container.clientWidth - 24);
    const availableH = Math.max(100, container.clientHeight - 24);

    let w = availableW;
    let h = w / aspectRatio;

    if (h > availableH) {
      h = availableH;
      w = h * aspectRatio;
    }

    setFrameDimensions({
      width: Math.floor(w),
      height: Math.floor(h),
    });
  }, [aspectRatio, naturalWidth, naturalHeight]);

  useEffect(() => {
    updateFrameDimensions();
    const container = containerRef.current;
    if (!container) return;

    const ro = new ResizeObserver(() => {
      updateFrameDimensions();
    });
    ro.observe(container);
    window.addEventListener('resize', updateFrameDimensions);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateFrameDimensions);
    };
  }, [updateFrameDimensions]);

  // Synchronize external seek requests (from Timeline, Caption List, etc.)
  useEffect(() => {
    if (seekTarget !== null && videoRef.current) {
      videoRef.current.currentTime = seekTarget;
      dispatch({ type: 'CLEAR_SEEK_TARGET' });
    }
  }, [seekTarget, dispatch]);

  // Sync currentTime to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      dispatch({ type: 'SET_CURRENT_TIME', payload: video.currentTime });
      if (project) {
        const active = project.captions.find(
          (c) => video.currentTime >= c.startTime && video.currentTime <= c.endTime
        );
        dispatch({ type: 'SET_ACTIVE_CUE', payload: active?.id ?? null });
      }
    };

    video.addEventListener('timeupdate', update);
    return () => video.removeEventListener('timeupdate', update);
  }, [project, dispatch]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onLoaded = () => {
      setDuration(video.duration || project?.video?.duration || 0);
      updateFrameDimensions();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [project, updateFrameDimensions]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  // Caption navigation controls
  const activeCueIdx = project?.captions.findIndex((c) => c.id === activeCueId) ?? -1;

  const handlePrevCaption = () => {
    if (!project || project.captions.length === 0) return;
    if (activeCueIdx > 0) {
      const prev = project.captions[activeCueIdx - 1];
      dispatch({ type: 'SET_ACTIVE_CUE', payload: prev.id });
      seekTo(prev.startTime);
    } else {
      seekTo(0);
    }
  };

  const handleNextCaption = () => {
    if (!project || project.captions.length === 0) return;
    if (activeCueIdx >= 0 && activeCueIdx < project.captions.length - 1) {
      const next = project.captions[activeCueIdx + 1];
      dispatch({ type: 'SET_ACTIVE_CUE', payload: next.id });
      seekTo(next.startTime);
    } else if (project.captions.length > 0) {
      const first = project.captions[0];
      dispatch({ type: 'SET_ACTIVE_CUE', payload: first.id });
      seekTo(first.startTime);
    }
  };

  // Drag and drop video file
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await processVideoFile(file);
  };

  const processVideoFile = async (file: File) => {
    try {
      setUploading(true);
      const localUrl = URL.createObjectURL(file);
      dispatch({ type: 'SET_LOCAL_VIDEO', payload: { file, url: localUrl } });
      notify('info', `Syncing "${file.name}"...`);
      const metadata = await api.upload.video(file);
      dispatch({ type: 'UPDATE_VIDEO', payload: metadata });
      notify('success', `Video ready: ${metadata.width}×${metadata.height}`);
    } catch (err: any) {
      notify('error', `Failed to upload video: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-100 select-none overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) processVideoFile(f);
        }}
      />

      {/* Central Video Preview Stage */}
      <div
        ref={containerRef}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`relative flex-1 flex items-center justify-center p-3 overflow-hidden transition-colors ${
          isDragOver ? 'bg-accent-light/40 ring-2 ring-dashed ring-accent' : 'bg-surface-100'
        }`}
      >
        {videoSrc ? (
          <div
            id="video-frame-container"
            className="relative overflow-hidden bg-black flex items-center justify-center rounded-lg shadow-subtle border border-border"
            style={{
              width: `${frameDimensions.width}px`,
              height: `${frameDimensions.height}px`,
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            {/* Native HTML5 Video Element */}
            <video
              ref={videoRef}
              src={videoSrc}
              className="w-full h-full object-contain pointer-events-auto cursor-pointer"
              onClick={togglePlay}
              id="preview-video"
              playsInline
            />

            {/* Subtitle Overlay — mathematically bounded to video frame */}
            {project && (
              <SubtitleOverlay
                videoRef={videoRef}
                cues={project.captions}
                globalStyle={project.style}
                renderedFrameHeight={frameDimensions.height}
                renderedFrameWidth={frameDimensions.width}
              />
            )}
          </div>
        ) : (
          /* Empty State: Inviting Video Upload Target */
          <div
            onClick={() => fileInputRef.current?.click()}
            className="max-w-sm w-full p-8 rounded-xl border border-dashed border-border-strong bg-surface-50 text-center cursor-pointer hover:border-accent hover:bg-surface-150 transition-all shadow-subtle group"
          >
            <div className="w-12 h-12 rounded-full bg-surface-200 group-hover:bg-accent-light text-text-secondary group-hover:text-accent flex items-center justify-center mx-auto mb-3 transition-colors">
              <Upload className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-text-primary">
              {uploading ? 'Processing video...' : 'Import a video to begin'}
            </p>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
              Drag & drop MP4, MOV, or WebM here, or click to browse.
            </p>
          </div>
        )}
      </div>

      {/* Playback Controls Strip Directly Underneath Video */}
      <div className="h-10 px-4 bg-surface-50 border-t border-border flex items-center justify-between flex-shrink-0 text-xs">
        {/* Left: Previous, Play/Pause, Next */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrevCaption}
            className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
            title="Previous caption (or jump to start)"
            id="prev-cue-btn"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={!videoSrc}
            className="w-7 h-7 rounded-full bg-accent hover:bg-accent-hover text-white flex items-center justify-center transition-colors shadow-subtle focus:outline-none"
            id="play-pause-btn"
            title={playing ? 'Pause (Space)' : 'Play (Space)'}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            onClick={handleNextCaption}
            className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
            title="Next caption"
            id="next-cue-btn"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Time display: 00:10 / 01:45 */}
          <div className="ml-2 font-mono text-[11px] text-text-secondary tabular-nums select-text">
            <span className="font-semibold text-text-primary">{formatTime(currentTime)}</span>
            <span className="text-text-dim mx-1">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right: Aspect Tag, Volume Mute */}
        <div className="flex items-center gap-2">
          {project?.video && (
            <span className="font-mono text-[10px] text-text-secondary px-2 py-0.5 rounded bg-surface-200 border border-border-subtle hidden sm:inline">
              {project.video.width}×{project.video.height} {aspectRatio < 0.8 ? '9:16' : aspectRatio > 1.3 ? '16:9' : '1:1'}
            </span>
          )}

          <button
            onClick={toggleMute}
            className="btn-ghost p-1 text-text-secondary hover:text-text-primary"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5 text-status-error" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export interface WordTimestamp {
  word: string;
  startTime: number; // seconds
  endTime: number;   // seconds
  isEstimated?: boolean;
  hasNewline?: boolean;
}

export interface CaptionCue {
  id: string;
  index: number;
  startTime: number; // in seconds (e.g. 1.25)
  endTime: number;   // in seconds (e.g. 3.50)
  text: string;      // UTF-8 subtitle text (Telugu, English, etc.)
  styleOverride?: Partial<SubtitleStyle>; // Per-caption styling overrides
  words?: WordTimestamp[]; // Word-level timestamps (explicit or estimated)
}

export type SubtitlePresetId =
  | 'viral-shorts'
  | 'clean-educational'
  | 'telugu-english'
  | 'podcast'
  | 'cinematic'
  | 'bujjigadu-signature'
  | 'rainbow-karaoke'
  | 'active-word-pop'
  | 'yellow-punch'
  | 'bujjigadu-comedy'
  | 'neon-glow'
  | 'typewriter'
  | 'two-line-cinema'
  | 'custom';

export type SubtitlePosition = 'top' | 'middle' | 'bottom';
export type SubtitleAlignment = 'left' | 'center' | 'right';
export type SubtitleFontWeight = 'normal' | 'bold' | '800';
export type SubtitleAnimationType = 'none' | 'karaoke-highlight' | 'word-pop' | 'typewriter' | 'rainbow';
export type StylingScope = 'all' | 'selected';

export interface SubtitleStyle {
  presetId: SubtitlePresetId;
  fontFamily: string;
  fontSize: number; // reference size on 1080p canvas (e.g., 42)
  fontWeight: SubtitleFontWeight;
  textColor: string; // Hex color e.g. #FFFFFF or #FFFF00
  highlightColor?: string; // Optional highlight color
  activeWordColor?: string; // Word highlight color for karaoke
  animationType?: SubtitleAnimationType; // Word animation mode
  outlineColor: string; // Hex outline color
  outlineWidth: number; // 0 to 10
  shadowColor: string; // Hex shadow color
  shadowBlur: number; // 0 to 12
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  backgroundColor: string; // Hex background box color
  backgroundOpacity: number; // 0.0 to 1.0 (0 = transparent box)
  backgroundPadding: number; // padding in px
  borderRadius?: number; // border radius in px
  position: SubtitlePosition;
  verticalOffsetPercent: number; // 0% to 50% from screen edge
  alignment: SubtitleAlignment;
  letterSpacing: number; // letter spacing in px
  lineHeight: number; // relative line height (e.g., 1.25)
  allCaps: boolean;
  scope?: StylingScope;
}

export interface SubtitlePreset {
  id: SubtitlePresetId;
  name: string;
  tagline: string;
  description: string;
  previewBg: string;
  style: SubtitleStyle;
}

export interface VideoMetadata {
  id: string;
  filename: string;
  originalName: string;
  duration: number; // seconds
  width: number;
  height: number;
  fps: number;
  size: number; // bytes
  mimeType: string;
  bitRate?: number;
  hasAudio: boolean;
}

export interface ExportSettings {
  format: 'mp4';
  videoCodec: 'libx264';
  audioCodec: 'copy' | 'aac';
  crf?: number;
  preset?: 'ultrafast' | 'fast' | 'medium' | 'slow';
}

export interface ProjectData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  video: VideoMetadata | null;
  captions: CaptionCue[];
  style: SubtitleStyle;
  exportSettings: ExportSettings;
}

export type ExportStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface ExportJob {
  jobId: string;
  projectId: string;
  status: ExportStatus;
  progress: number; // 0 to 100
  stage: string;
  outputFilename?: string;
  outputPath?: string;
  outputSize?: number;
  duration?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface SubtitleValidationWarning {
  cueIndex: number;
  type: 'overlap' | 'empty' | 'duration_zero' | 'duration_too_short' | 'exceeds_video_duration';
  message: string;
}

export interface SubtitleValidationResult {
  isValid: boolean;
  cues: CaptionCue[];
  warnings: SubtitleValidationWarning[];
  errors: string[];
  cueCount: number;
  totalDuration: number;
}

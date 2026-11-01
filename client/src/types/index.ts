// Re-export shared types for use in client
export type {
  CaptionCue,
  SubtitleStyle,
  SubtitlePreset,
  SubtitlePresetId,
  SubtitlePosition,
  SubtitleAlignment,
  SubtitleFontWeight,
  VideoMetadata,
  ExportSettings,
  ProjectData,
  ExportJob,
  ExportStatus,
  SubtitleValidationResult,
  SubtitleValidationWarning,
  WordTimestamp,
  SubtitleAnimationType,
  StylingScope,
} from '@shared/types';

export { SUBTITLE_PRESETS, DEFAULT_STYLE, getPresetById } from '@shared/presets';
export { getCueWords, getActiveWordIndex } from '@shared/wordTiming';

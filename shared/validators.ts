import { z } from 'zod';

export const WordTimestampSchema = z.object({
  word: z.string(),
  startTime: z.number().min(0),
  endTime: z.number().min(0),
  isEstimated: z.boolean().optional(),
});

export const SubtitleStyleSchema = z.object({
  presetId: z.enum([
    'viral-shorts',
    'clean-educational',
    'telugu-english',
    'podcast',
    'cinematic',
    'bujjigadu-signature',
    'rainbow-karaoke',
    'active-word-pop',
    'yellow-punch',
    'bujjigadu-comedy',
    'neon-glow',
    'typewriter',
    'two-line-cinema',
    'custom',
  ]),
  fontFamily: z.string().min(1),
  fontSize: z.number().min(10).max(160),
  fontWeight: z.enum(['normal', 'bold', '800']),
  textColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid hex color'),
  highlightColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  activeWordColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/).optional(),
  animationType: z.enum(['none', 'karaoke-highlight', 'word-pop', 'typewriter', 'rainbow']).optional(),
  outlineColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  outlineWidth: z.number().min(0).max(20),
  shadowColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  shadowBlur: z.number().min(0).max(30),
  shadowOffsetX: z.number().optional(),
  shadowOffsetY: z.number().optional(),
  backgroundColor: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/),
  backgroundOpacity: z.number().min(0).max(1),
  backgroundPadding: z.number().min(0).max(60),
  borderRadius: z.number().min(0).max(40).optional(),
  position: z.enum(['top', 'middle', 'bottom']),
  verticalOffsetPercent: z.number().min(0).max(60),
  alignment: z.enum(['left', 'center', 'right']),
  letterSpacing: z.number().min(-5).max(20),
  lineHeight: z.number().min(0.8).max(3.0),
  allCaps: z.boolean(),
  scope: z.enum(['all', 'selected']).optional(),
});

export const CaptionCueSchema = z.object({
  id: z.string().min(1),
  index: z.number().int().nonnegative(),
  startTime: z.number().min(0, 'Start time cannot be negative'),
  endTime: z.number().min(0, 'End time cannot be negative'),
  text: z.string().min(0),
  styleOverride: SubtitleStyleSchema.partial().optional(),
  words: z.array(WordTimestampSchema).optional(),
}).refine((data) => data.endTime >= data.startTime, {
  message: 'End time must be greater than or equal to start time',
  path: ['endTime'],
});

export const VideoMetadataSchema = z.object({
  id: z.string().min(1),
  filename: z.string().min(1),
  originalName: z.string().min(1),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  size: z.number().int().positive(),
  mimeType: z.string(),
  bitRate: z.number().optional(),
  hasAudio: z.boolean(),
});

export const ExportSettingsSchema = z.object({
  format: z.literal('mp4'),
  videoCodec: z.literal('libx264'),
  audioCodec: z.enum(['copy', 'aac']),
  crf: z.number().min(0).max(51).optional(),
  preset: z.enum(['ultrafast', 'fast', 'medium', 'slow']).optional(),
});

export const ProjectDataSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  createdAt: z.string(),
  updatedAt: z.string(),
  video: VideoMetadataSchema.nullable(),
  captions: z.array(CaptionCueSchema),
  style: SubtitleStyleSchema,
  exportSettings: ExportSettingsSchema,
});

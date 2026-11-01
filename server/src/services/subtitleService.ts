import { v4 as uuidv4 } from 'uuid';
import {
  CaptionCue,
  SubtitleStyle,
  SubtitleValidationResult,
  SubtitleValidationWarning,
} from '../../../shared/types';
import { getCueWords } from '../../../shared/wordTiming';

const RAINBOW_COLORS = ['#38BDF8', '#22C55E', '#FACC15', '#FB7185', '#A855F7'];

/**
 * Parses timestamp string "HH:MM:SS,mmm" or "HH:MM:SS.mmm" or "MM:SS.mmm" into seconds (float).
 */
export function parseTimestampToSeconds(timestamp: string): number {
  const cleaned = timestamp.trim().replace(',', '.');
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  }

  const sec = parseFloat(cleaned);
  return isNaN(sec) ? 0 : sec;
}

/**
 * Formats seconds into SRT timestamp string "HH:MM:SS,mmm".
 */
export function formatSecondsToSrtTimestamp(totalSeconds: number): string {
  const safeSec = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = Math.floor(safeSec % 60);
  const milliseconds = Math.floor((safeSec % 1) * 1000);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${pad(milliseconds, 3)}`;
}

/**
 * Formats seconds into ASS timestamp string "H:MM:SS.cc" (centiseconds).
 */
export function formatSecondsToAssTimestamp(totalSeconds: number): string {
  const safeSec = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSec / 3600);
  const minutes = Math.floor((safeSec % 3600) / 60);
  const seconds = Math.floor(safeSec % 60);
  const centiseconds = Math.floor((safeSec % 1) * 100);

  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centiseconds, 2)}`;
}

/**
 * Parses SRT subtitle content into structured CaptionCue objects.
 */
export function parseSrt(content: string): CaptionCue[] {
  // Strip BOM if present
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const cues: CaptionCue[] = [];

  const timeRegex = /((?:\d{1,2}:)?\d{1,2}:\d{2}[,.]\d{2,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[,.]\d{2,3})/;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    let timeLineIdx = -1;
    let timeMatch: RegExpMatchArray | null = null;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(timeRegex);
      if (match) {
        timeLineIdx = i;
        timeMatch = match;
        break;
      }
    }

    if (!timeMatch || timeLineIdx === -1) continue;

    const startTime = parseTimestampToSeconds(timeMatch[1]);
    const endTime = parseTimestampToSeconds(timeMatch[2]);
    const textLines = lines.slice(timeLineIdx + 1);
    const text = textLines.join('\n').trim();

    cues.push({
      id: uuidv4(),
      index: cues.length + 1,
      startTime: Math.round(startTime * 1000) / 1000,
      endTime: Math.round(endTime * 1000) / 1000,
      text,
    });
  }

  return cues.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Parses WebVTT subtitle content into structured CaptionCue objects.
 */
export function parseVtt(content: string): CaptionCue[] {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\s*\n/);
  const cues: CaptionCue[] = [];

  const timeRegex = /((?:\d{1,2}:)?\d{1,2}:\d{2}[,.]\d{2,3})\s*-->\s*((?:\d{1,2}:)?\d{1,2}:\d{2}[,.]\d{2,3})/;

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (!lines.length) continue;

    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE') || lines[0].startsWith('STYLE')) {
      continue;
    }

    let timeLineIdx = -1;
    let timeMatch: RegExpMatchArray | null = null;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(timeRegex);
      if (match) {
        timeLineIdx = i;
        timeMatch = match;
        break;
      }
    }

    if (!timeMatch || timeLineIdx === -1) continue;

    const startTime = parseTimestampToSeconds(timeMatch[1]);
    const endTime = parseTimestampToSeconds(timeMatch[2]);
    const textLines = lines.slice(timeLineIdx + 1);

    // Strip VTT tags like <c.yellow>, <b>, <v Speaker>, etc.
    const text = textLines
      .map((line) => line.replace(/<[^>]+>/g, ''))
      .join('\n')
      .trim();

    cues.push({
      id: uuidv4(),
      index: cues.length + 1,
      startTime: Math.round(startTime * 1000) / 1000,
      endTime: Math.round(endTime * 1000) / 1000,
      text,
    });
  }

  return cues.sort((a, b) => a.startTime - b.startTime);
}

/**
 * Auto-detects format (SRT or VTT) and parses subtitle content.
 */
export function parseSubtitleFile(content: string, filename: string): CaptionCue[] {
  const ext = filename.toLowerCase().split('.').pop();
  const trimmed = content.trim();

  if (ext === 'vtt' || trimmed.startsWith('WEBVTT')) {
    return parseVtt(content);
  }
  return parseSrt(content);
}

/**
 * Validates cues for timing anomalies, overlaps, empty text, or exceeding video duration.
 */
export function validateCues(cues: CaptionCue[], videoDuration?: number): SubtitleValidationResult {
  const warnings: SubtitleValidationWarning[] = [];
  const errors: string[] = [];

  const sortedCues = [...cues].sort((a, b) => a.startTime - b.startTime);

  for (let i = 0; i < sortedCues.length; i++) {
    const cue = sortedCues[i];
    cue.index = i + 1;

    if (cue.startTime < 0) {
      errors.push(`Caption #${cue.index} has a negative start timestamp (${cue.startTime}s).`);
    }

    if (cue.endTime < cue.startTime) {
      errors.push(`Caption #${cue.index} ends before it starts (${cue.startTime}s -> ${cue.endTime}s).`);
    }

    const duration = cue.endTime - cue.startTime;
    if (duration <= 0.05) {
      warnings.push({
        cueIndex: cue.index,
        type: 'duration_too_short',
        message: `Caption #${cue.index} duration is very short (${Math.round(duration * 1000)}ms).`,
      });
    }

    if (!cue.text || !cue.text.trim()) {
      warnings.push({
        cueIndex: cue.index,
        type: 'empty',
        message: `Caption #${cue.index} has empty or whitespace-only text.`,
      });
    }

    // Check overlap with next cue
    if (i < sortedCues.length - 1) {
      const nextCue = sortedCues[i + 1];
      if (cue.endTime > nextCue.startTime + 0.02) {
        warnings.push({
          cueIndex: cue.index,
          type: 'overlap',
          message: `Caption #${cue.index} overlaps with Caption #${i + 2} by ${Math.round(
            (cue.endTime - nextCue.startTime) * 1000
          )}ms.`,
        });
      }
    }

    if (videoDuration && cue.startTime > videoDuration) {
      warnings.push({
        cueIndex: cue.index,
        type: 'exceeds_video_duration',
        message: `Caption #${cue.index} starts after video ends (${cue.startTime}s > ${videoDuration}s).`,
      });
    }
  }

  const totalDuration = sortedCues.length ? sortedCues[sortedCues.length - 1].endTime : 0;

  return {
    isValid: errors.length === 0,
    cues: sortedCues,
    warnings,
    errors,
    cueCount: sortedCues.length,
    totalDuration,
  };
}

/**
 * Adjusts all cue timings by a global offset delta in seconds (+ or -).
 * Clamps start times to 0. Preserves duration.
 */
export function applyGlobalOffset(cues: CaptionCue[], offsetSeconds: number): CaptionCue[] {
  return cues.map((cue) => {
    const duration = Math.max(0.1, cue.endTime - cue.startTime);
    const newStart = Math.max(0, Math.round((cue.startTime + offsetSeconds) * 1000) / 1000);
    const newEnd = Math.round((newStart + duration) * 1000) / 1000;
    return {
      ...cue,
      startTime: newStart,
      endTime: newEnd,
    };
  }).sort((a, b) => a.startTime - b.startTime);
}

/**
 * Converts Hex color "#RRGGBB" + optional opacity [0..1] to ASS color format "&HAABBGGRR&".
 * ASS alpha: &H00 = 100% opaque, &HFF = 100% transparent.
 */
export function hexToAssColor(hex: string, opacity: number = 1.0): string {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    clean = 'FFFFFF';
  }

  const r = clean.substring(0, 2);
  const g = clean.substring(2, 4);
  const b = clean.substring(4, 6);

  // Alpha in ASS: 0 is opaque, 255 is transparent
  const alphaVal = Math.round((1.0 - Math.min(1.0, Math.max(0, opacity))) * 255);
  const aHex = alphaVal.toString(16).padStart(2, '0').toUpperCase();

  return `&H${aHex}${b.toUpperCase()}${g.toUpperCase()}${r.toUpperCase()}&`;
}

/**
 * Generates ASS (Advanced SubStation Alpha v4.00+) script content from cues and styling.
 */
export function generateAssScript(
  cues: CaptionCue[],
  style: SubtitleStyle,
  videoWidth: number = 1920,
  videoHeight: number = 1080
): string {
  // Map alignment:
  // ASS alignment uses numpad convention:
  // 1=bottom-left, 2=bottom-center, 3=bottom-right
  // 4=middle-left, 5=middle-center, 6=middle-right
  // 7=top-left,    8=top-center,    9=top-right
  let alignment = 2; // bottom center default
  if (style.position === 'top') {
    alignment = style.alignment === 'left' ? 7 : style.alignment === 'right' ? 9 : 8;
  } else if (style.position === 'middle') {
    alignment = style.alignment === 'left' ? 4 : style.alignment === 'right' ? 6 : 5;
  } else {
    alignment = style.alignment === 'left' ? 1 : style.alignment === 'right' ? 3 : 2;
  }

  const primaryColor = hexToAssColor(style.textColor, 1.0);
  const outlineColor = hexToAssColor(style.outlineColor, 1.0);
  const shadowColor = hexToAssColor(style.shadowColor, 0.85);
  const backBoxColor = hexToAssColor(style.backgroundColor, style.backgroundOpacity);

  // BorderStyle in ASS:
  // 1 = Normal (Outline + drop shadow)
  // 3 = Opaque box (BackColour fills a box behind the text)
  const isBoxed = style.backgroundOpacity > 0.1 && style.backgroundPadding > 0;
  const borderStyle = isBoxed ? 3 : 1;

  // Margin calculations based on canvas dimensions and vertical offset percentage
  const marginV = Math.round(videoHeight * (style.verticalOffsetPercent / 100));
  const marginL = style.alignment === 'left' ? Math.round(videoWidth * 0.08) : Math.round(videoWidth * 0.05);
  const marginR = style.alignment === 'right' ? Math.round(videoWidth * 0.08) : Math.round(videoWidth * 0.05);

  // Font family fallback for Telugu and Latin
  // E.g., 'Montserrat, "Noto Sans Telugu", Nirmala UI, Arial'
  // In ASS, specify primary font; Windows handles font linking/fallback
  const primaryFont = style.fontFamily.includes('Telugu')
    ? 'Nirmala UI'
    : style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();

  // Bold flag: -1 for true in ASS
  const boldFlag = style.fontWeight === 'bold' || style.fontWeight === '800' ? -1 : 0;

  // Scale font size proportionally to 1080p target
  const scaledFontSize = Math.round(style.fontSize * (videoHeight / 1080));

  const scriptHeader = `[Script Info]
; Script generated by Bujjigadu Subtitle Studio
Title: Bujjigadu Subtitle Project
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${primaryFont},${scaledFontSize},${primaryColor},&H000000FF,${outlineColor},${isBoxed ? backBoxColor : shadowColor},${boldFlag},0,0,0,100,100,${style.letterSpacing},0,${borderStyle},${style.outlineWidth},${style.shadowBlur > 0 ? 2 : 0},${alignment},${marginL},${marginR},${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogueLines: string[] = [];

  for (const cue of cues) {
    const effectiveStyle: SubtitleStyle = { ...style, ...(cue.styleOverride || {}) };
    const anim = effectiveStyle.animationType;
    const isCaps = effectiveStyle.allCaps;

    let overridePrefix = '';
    if (cue.styleOverride) {
      if (cue.styleOverride.fontSize) {
        const cueScaledSize = Math.round(cue.styleOverride.fontSize * (videoHeight / 1080));
        overridePrefix += `\\fs${cueScaledSize}`;
      }
      if (cue.styleOverride.textColor) {
        overridePrefix += `\\c${hexToAssColor(cue.styleOverride.textColor, 1.0)}`;
      }
      if (cue.styleOverride.outlineColor) {
        overridePrefix += `\\3c${hexToAssColor(cue.styleOverride.outlineColor, 1.0)}`;
      }
      if (cue.styleOverride.outlineWidth !== undefined) {
        overridePrefix += `\\bord${cue.styleOverride.outlineWidth}`;
      }
    }

    const words = getCueWords(cue);

    if (anim === 'karaoke-highlight' || anim === 'word-pop' || anim === 'rainbow') {
      if (words.length <= 1) {
        const startStr = formatSecondsToAssTimestamp(cue.startTime);
        const endStr = formatSecondsToAssTimestamp(cue.endTime);
        let text = cue.text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\N');
        if (isCaps) text = text.toUpperCase();
        const lineText = overridePrefix ? `{\\${overridePrefix}}${text}` : text;
        dialogueLines.push(`Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${lineText}`);
      } else {
        const defaultAss = hexToAssColor(effectiveStyle.textColor, 1.0);
        for (let i = 0; i < words.length; i++) {
          const activeWord = words[i];
          const segStart = formatSecondsToAssTimestamp(activeWord.startTime);
          const segEnd = formatSecondsToAssTimestamp(activeWord.endTime);

          const highlightHex = anim === 'rainbow'
            ? RAINBOW_COLORS[i % RAINBOW_COLORS.length]
            : (effectiveStyle.activeWordColor || effectiveStyle.highlightColor || '#FFE81F');
          const activeAss = hexToAssColor(highlightHex, 1.0);

          const wordsFormatted = words.map((w, idx) => {
            let wordStr = isCaps ? w.word.toUpperCase() : w.word;
            wordStr = wordStr.replace(/\\/g, '\\\\');
            if (idx === i) {
              const emphasis = anim === 'word-pop' ? `{\\b1\\c${activeAss}}` : `{\\c${activeAss}}`;
              const reset = anim === 'word-pop' ? `{\\b0\\c${defaultAss}}` : `{\\c${defaultAss}}`;
              wordStr = `${emphasis}${wordStr}${reset}`;
            }
            if (w.hasNewline) {
              wordStr += '\\N';
            }
            return wordStr;
          });

          const fullSentence = wordsFormatted.join(' ').replace(/ \\N /g, '\\N').replace(/ \\N/g, '\\N');
          const lineContent = overridePrefix ? `{\\${overridePrefix}}${fullSentence}` : fullSentence;
          dialogueLines.push(`Dialogue: 0,${segStart},${segEnd},Default,,0,0,0,,${lineContent}`);
        }
      }
    } else if (anim === 'typewriter') {
      if (words.length <= 1) {
        const startStr = formatSecondsToAssTimestamp(cue.startTime);
        const endStr = formatSecondsToAssTimestamp(cue.endTime);
        let text = cue.text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\N');
        if (isCaps) text = text.toUpperCase();
        const lineText = overridePrefix ? `{\\${overridePrefix}}${text}` : text;
        dialogueLines.push(`Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${lineText}`);
      } else {
        for (let i = 0; i < words.length; i++) {
          const segStart = formatSecondsToAssTimestamp(words[i].startTime);
          const segEnd = formatSecondsToAssTimestamp(words[i].endTime);
          const visibleSlice = words.slice(0, i + 1).map((w) => {
            let wordStr = isCaps ? w.word.toUpperCase() : w.word;
            wordStr = wordStr.replace(/\\/g, '\\\\');
            if (w.hasNewline) wordStr += '\\N';
            return wordStr;
          });
          const sentence = visibleSlice.join(' ').replace(/ \\N /g, '\\N').replace(/ \\N/g, '\\N');
          const lineContent = overridePrefix ? `{\\${overridePrefix}}${sentence}` : sentence;
          dialogueLines.push(`Dialogue: 0,${segStart},${segEnd},Default,,0,0,0,,${lineContent}`);
        }
      }
    } else {
      const startStr = formatSecondsToAssTimestamp(cue.startTime);
      const endStr = formatSecondsToAssTimestamp(cue.endTime);
      let text = cue.text.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\N');
      if (isCaps) text = text.toUpperCase();
      const lineText = overridePrefix ? `{\\${overridePrefix}}${text}` : text;
      dialogueLines.push(`Dialogue: 0,${startStr},${endStr},Default,,0,0,0,,${lineText}`);
    }
  }

  return scriptHeader + dialogueLines.join('\n') + '\n';
}

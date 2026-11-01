import { describe, it, expect } from 'vitest';
import {
  parseSrt,
  parseVtt,
  parseSubtitleFile,
  validateCues,
  applyGlobalOffset,
  hexToAssColor,
  generateAssScript,
  parseTimestampToSeconds,
  formatSecondsToSrtTimestamp,
  formatSecondsToAssTimestamp,
} from '../src/services/subtitleService';
import type { SubtitleStyle } from '../../shared/types';
import { SUBTITLE_PRESETS } from '../../shared/presets';

// ─── Timestamp Parsing ───────────────────────────────────────────────────────

describe('parseTimestampToSeconds', () => {
  it('parses HH:MM:SS,mmm SRT format', () => {
    expect(parseTimestampToSeconds('00:01:30,500')).toBeCloseTo(90.5, 3);
  });
  it('parses HH:MM:SS.mmm VTT format', () => {
    expect(parseTimestampToSeconds('00:00:05.123')).toBeCloseTo(5.123, 3);
  });
  it('parses MM:SS.mmm short VTT format', () => {
    expect(parseTimestampToSeconds('01:30.000')).toBeCloseTo(90.0, 3);
  });
  it('returns 0 for invalid input', () => {
    expect(parseTimestampToSeconds('invalid')).toBe(0);
  });
});

describe('formatSecondsToSrtTimestamp', () => {
  it('formats 90.5 seconds correctly', () => {
    expect(formatSecondsToSrtTimestamp(90.5)).toBe('00:01:30,500');
  });
  it('handles zero correctly', () => {
    expect(formatSecondsToSrtTimestamp(0)).toBe('00:00:00,000');
  });
  it('clamps negative values to 0', () => {
    expect(formatSecondsToSrtTimestamp(-5)).toBe('00:00:00,000');
  });
});

describe('formatSecondsToAssTimestamp', () => {
  it('formats 90.5 as ASS timestamp', () => {
    expect(formatSecondsToAssTimestamp(90.5)).toBe('0:01:30.50');
  });
  it('handles hours correctly', () => {
    expect(formatSecondsToAssTimestamp(3661.25)).toBe('1:01:01.25');
  });
});

// ─── SRT Parsing ─────────────────────────────────────────────────────────────

describe('parseSrt', () => {
  it('parses basic SRT content with English text', () => {
    const srt = `1
00:00:01,000 --> 00:00:03,000
Hello World

2
00:00:05,000 --> 00:00:08,000
This is a subtitle
`;
    const cues = parseSrt(srt);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('Hello World');
    expect(cues[0].startTime).toBeCloseTo(1.0);
    expect(cues[0].endTime).toBeCloseTo(3.0);
    expect(cues[1].text).toBe('This is a subtitle');
  });

  it('parses SRT with Telugu Unicode text', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
నమస్కారం! ఇది తెలుగు సబ్‌టైటిల్.

2
00:00:05,000 --> 00:00:08,000
బుజ్జిగాడు సబ్ టైటిల్ స్టూడియో
`;
    const cues = parseSrt(srt);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('నమస్కారం! ఇది తెలుగు సబ్‌టైటిల్.');
    expect(cues[1].text).toBe('బుజ్జిగాడు సబ్ టైటిల్ స్టూడియో');
  });

  it('parses mixed Telugu-English captions', () => {
    const srt = `1
00:00:01,000 --> 00:00:05,000
Hello! నేను Bujjigadu ని.

`;
    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Hello! నేను Bujjigadu ని.');
  });

  it('parses multi-line captions', () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
Line one
Line two
`;
    const cues = parseSrt(srt);
    expect(cues[0].text).toBe('Line one\nLine two');
  });

  it('returns empty array for malformed SRT with no timestamps', () => {
    const srt = `This is not an SRT file\nJust text\n`;
    const cues = parseSrt(srt);
    expect(cues).toHaveLength(0);
  });

  it('strips BOM character from beginning', () => {
    const srt = '\uFEFF1\n00:00:01,000 --> 00:00:02,000\nTest\n\n';
    const cues = parseSrt(srt);
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Test');
  });

  it('sorts cues by start time', () => {
    const srt = `2
00:00:10,000 --> 00:00:12,000
Second

1
00:00:01,000 --> 00:00:03,000
First
`;
    const cues = parseSrt(srt);
    expect(cues[0].text).toBe('First');
    expect(cues[1].text).toBe('Second');
  });

  it('assigns sequential IDs and unique uuid to each cue', () => {
    const srt = `1
00:00:01,000 --> 00:00:02,000
A

2
00:00:03,000 --> 00:00:04,000
B
`;
    const cues = parseSrt(srt);
    expect(cues[0].id).toBeTruthy();
    expect(cues[1].id).toBeTruthy();
    expect(cues[0].id).not.toBe(cues[1].id);
  });
});

// ─── VTT Parsing ─────────────────────────────────────────────────────────────

describe('parseVtt', () => {
  it('parses basic VTT content', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
Hello World

00:00:05.000 --> 00:00:08.000
Second caption
`;
    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0].text).toBe('Hello World');
    expect(cues[0].startTime).toBeCloseTo(1.0);
  });

  it('parses VTT with short MM:SS.mmm timestamps', () => {
    const vtt = `WEBVTT

01:30.500 --> 01:33.000
Short timestamp format
`;
    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0].startTime).toBeCloseTo(90.5, 2);
  });

  it('strips VTT inline tags like <b>, <i>, <c.yellow>', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:03.000
<b>Bold</b> and <i>italic</i>
`;
    const cues = parseVtt(vtt);
    expect(cues[0].text).toBe('Bold and italic');
  });

  it('ignores WEBVTT header and NOTE blocks', () => {
    const vtt = `WEBVTT

NOTE This is a comment

00:00:01.000 --> 00:00:03.000
Valid caption
`;
    const cues = parseVtt(vtt);
    expect(cues).toHaveLength(1);
  });

  it('parses VTT Telugu text correctly', () => {
    const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
తెలుగు VTT పరీక్ష
`;
    const cues = parseVtt(vtt);
    expect(cues[0].text).toBe('తెలుగు VTT పరీక్ష');
  });
});

// ─── Auto-detection ───────────────────────────────────────────────────────────

describe('parseSubtitleFile', () => {
  it('auto-detects VTT by WEBVTT header', () => {
    const vtt = 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello';
    const cues = parseSubtitleFile(vtt, 'file.srt'); // wrong extension
    expect(cues).toHaveLength(1);
    expect(cues[0].text).toBe('Hello');
  });

  it('auto-detects SRT by extension', () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,000\nHello\n\n';
    const cues = parseSubtitleFile(srt, 'subtitles.srt');
    expect(cues[0].text).toBe('Hello');
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('validateCues', () => {
  it('passes clean non-overlapping cues with no warnings', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello\n\n2\n00:00:04,000 --> 00:00:06,000\nWorld\n\n`;
    const cues = parseSrt(srt);
    const result = validateCues(cues);
    expect(result.isValid).toBe(true);
    expect(result.warnings).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('detects overlapping captions', () => {
    const srt = `1\n00:00:01,000 --> 00:00:05,000\nA\n\n2\n00:00:03,000 --> 00:00:07,000\nB\n\n`;
    const cues = parseSrt(srt);
    const result = validateCues(cues);
    const overlapWarning = result.warnings.find((w) => w.type === 'overlap');
    expect(overlapWarning).toBeTruthy();
  });

  it('detects empty captions', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\n   \n\n`;
    const cues = parseSrt(srt);
    const result = validateCues(cues);
    const emptyWarning = result.warnings.find((w) => w.type === 'empty');
    expect(emptyWarning).toBeTruthy();
  });

  it('detects captions exceeding video duration', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nA\n\n2\n01:00:00,000 --> 01:00:03,000\nFuture\n\n`;
    const cues = parseSrt(srt);
    const result = validateCues(cues, 60); // 60 second video
    const durationWarning = result.warnings.find((w) => w.type === 'exceeds_video_duration');
    expect(durationWarning).toBeTruthy();
  });

  it('returns sorted cues and correct cueCount', () => {
    const srt = `1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:03,000 --> 00:00:04,000\nB\n\n`;
    const cues = parseSrt(srt);
    const result = validateCues(cues);
    expect(result.cueCount).toBe(2);
    expect(result.cues[0].startTime).toBeLessThan(result.cues[1].startTime);
  });
});

// ─── Global Offset ────────────────────────────────────────────────────────────

describe('applyGlobalOffset', () => {
  it('shifts all cues forward by the given offset', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello\n\n`;
    const cues = parseSrt(srt);
    const shifted = applyGlobalOffset(cues, 2);
    expect(shifted[0].startTime).toBeCloseTo(3.0);
    expect(shifted[0].endTime).toBeCloseTo(5.0);
  });

  it('shifts all cues backward and clamps to 0', () => {
    const srt = `1\n00:00:01,000 --> 00:00:03,000\nHello\n\n`;
    const cues = parseSrt(srt);
    const shifted = applyGlobalOffset(cues, -5);
    expect(shifted[0].startTime).toBe(0);
    expect(shifted[0].endTime).toBeCloseTo(2.0); // preserves duration
  });

  it('preserves caption duration after offset', () => {
    const srt = `1\n00:00:02,000 --> 00:00:05,000\nThree seconds\n\n`;
    const cues = parseSrt(srt);
    const originalDuration = cues[0].endTime - cues[0].startTime;
    const shifted = applyGlobalOffset(cues, 10);
    const newDuration = shifted[0].endTime - shifted[0].startTime;
    expect(newDuration).toBeCloseTo(originalDuration, 2);
  });
});

// ─── ASS Color Conversion ─────────────────────────────────────────────────────

describe('hexToAssColor', () => {
  it('converts white #FFFFFF to fully opaque ASS color', () => {
    expect(hexToAssColor('#FFFFFF', 1.0)).toBe('&H00FFFFFF&');
  });

  it('converts yellow #FFFF00 correctly (ASS uses BGR)', () => {
    // Red=FF, Green=FF, Blue=00 → BGR = 00FFFF
    expect(hexToAssColor('#FFFF00', 1.0)).toBe('&H0000FFFF&');
  });

  it('converts black #000000 to fully opaque black', () => {
    expect(hexToAssColor('#000000', 1.0)).toBe('&H00000000&');
  });

  it('applies transparency for opacity 0.5 (alpha=7F)', () => {
    const result = hexToAssColor('#FFFFFF', 0.5);
    // Alpha = round((1 - 0.5) * 255) = 128 = 0x80
    expect(result).toMatch(/^&H80/);
  });

  it('handles 3-digit shorthand hex', () => {
    expect(hexToAssColor('#FFF', 1.0)).toBe('&H00FFFFFF&');
  });
});

// ─── ASS Script Generation ────────────────────────────────────────────────────

describe('generateAssScript', () => {
  const testCues = parseSrt(`1\n00:00:01,000 --> 00:00:03,000\nHello World\n\n2\n00:00:05,000 --> 00:00:08,000\nSecond line\n\n`);
  const preset = SUBTITLE_PRESETS[0]; // Viral Shorts

  it('generates valid ASS script header', () => {
    const ass = generateAssScript(testCues, preset.style);
    expect(ass).toContain('[Script Info]');
    expect(ass).toContain('[V4+ Styles]');
    expect(ass).toContain('[Events]');
  });

  it('contains dialogue lines for all cues', () => {
    // Preset 1 (Clean Educational) does not enforce allCaps
    const educationalPreset = SUBTITLE_PRESETS[1];
    const ass = generateAssScript(testCues, educationalPreset.style);
    expect(ass).toContain('Dialogue:');
    expect(ass).toContain('Hello World');
    expect(ass).toContain('Second line');
  });

  it('applies allCaps transformation when enabled', () => {
    const capsStyle = { ...preset.style, allCaps: true };
    const ass = generateAssScript(testCues, capsStyle);
    expect(ass).toContain('HELLO WORLD');
  });

  it('preserves Telugu text in dialogue lines', () => {
    const teluguCues = parseSrt(`1\n00:00:01,000 --> 00:00:03,000\nనమస్కారం\n\n`);
    const ass = generateAssScript(teluguCues, SUBTITLE_PRESETS[2].style); // Telugu-English preset
    expect(ass).toContain('నమస్కారం');
  });

  it('sets PlayResX and PlayResY correctly', () => {
    const ass = generateAssScript(testCues, preset.style, 1280, 720);
    expect(ass).toContain('PlayResX: 1280');
    expect(ass).toContain('PlayResY: 720');
  });

  it('generates correct ASS timestamps', () => {
    const ass = generateAssScript(testCues, preset.style);
    expect(ass).toContain('0:00:01.00');
    expect(ass).toContain('0:00:03.00');
  });

  it('all 6 presets produce valid ASS scripts', () => {
    for (const preset of SUBTITLE_PRESETS) {
      const ass = generateAssScript(testCues, preset.style);
      expect(ass).toContain('[Script Info]');
      expect(ass).toContain('[Events]');
      expect(ass).toContain('Dialogue:');
    }
  });
});

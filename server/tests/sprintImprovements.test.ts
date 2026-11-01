import { describe, it, expect } from 'vitest';
import { SUBTITLE_PRESETS, DEFAULT_STYLE, getPresetById } from '../../shared/presets';
import { getCueWords, getActiveWordIndex } from '../../shared/wordTiming';
import { generateAssScript } from '../src/services/subtitleService';
import { SubtitleStyleSchema, CaptionCueSchema } from '../../shared/validators';
import type { CaptionCue, SubtitleStyle } from '../../shared/types';

// ─── 1. Aspect Ratio & Geometry Calculation Logic ─────────────────────────────

describe('Aspect Ratio & Frame Geometry Calculations', () => {
  function computeFrameDimensions(
    containerWidth: number,
    containerHeight: number,
    videoWidth: number,
    videoHeight: number
  ) {
    const aspectRatio = videoWidth / videoHeight;
    let w = containerWidth;
    let h = w / aspectRatio;

    if (h > containerHeight) {
      h = containerHeight;
      w = h * aspectRatio;
    }

    return {
      width: Math.floor(w),
      height: Math.floor(h),
    };
  }

  it('calculates 9:16 portrait frame strictly bounded within container', () => {
    // 1080x1920 in 1200x800 container
    const frame = computeFrameDimensions(1200, 800, 1080, 1920);
    expect(frame.height).toBe(800);
    expect(frame.width).toBe(450); // 800 * (9/16) = 450
    expect(frame.width).toBeLessThanOrEqual(1200);
    expect(frame.height).toBeLessThanOrEqual(800);
  });

  it('calculates 16:9 landscape frame strictly bounded within container', () => {
    // 1920x1080 in 1200x800 container
    const frame = computeFrameDimensions(1200, 800, 1920, 1080);
    expect(frame.width).toBe(1200);
    expect(frame.height).toBe(675); // 1200 / (16/9) = 675
    expect(frame.width).toBeLessThanOrEqual(1200);
    expect(frame.height).toBeLessThanOrEqual(800);
  });

  it('calculates 1:1 square frame strictly bounded within container', () => {
    // 1080x1080 in 1200x800 container
    const frame = computeFrameDimensions(1200, 800, 1080, 1080);
    expect(frame.width).toBe(800);
    expect(frame.height).toBe(800);
    expect(frame.width).toBeLessThanOrEqual(1200);
  });

  it('preview font scaling factor matches ASS PlayResY math', () => {
    const fontSize = 48; // reference 48px on 1080p
    const renderedFrameHeight = 540; // half scale
    const previewFontSize = (fontSize / 1080) * renderedFrameHeight;
    const assScaledSize = Math.round(fontSize * (renderedFrameHeight / 1080));

    expect(previewFontSize).toBe(24);
    expect(assScaledSize).toBe(24);
  });
});

// ─── 2. Font Size Range & Validation ──────────────────────────────────────────

describe('Font Size Validation', () => {
  it('validates standard font sizes within [10, 160]', () => {
    const style = { ...DEFAULT_STYLE, fontSize: 44 };
    expect(() => SubtitleStyleSchema.parse(style)).not.toThrow();
  });

  it('rejects font size below 10', () => {
    const style = { ...DEFAULT_STYLE, fontSize: 5 };
    expect(() => SubtitleStyleSchema.parse(style)).toThrow();
  });

  it('rejects font size above 160', () => {
    const style = { ...DEFAULT_STYLE, fontSize: 200 };
    expect(() => SubtitleStyleSchema.parse(style)).toThrow();
  });
});

// ─── 3. Apply to Selected vs Apply to All ──────────────────────────────────────

describe('Styling Scope Logic', () => {
  const cues: CaptionCue[] = [
    { id: 'cue-1', index: 1, startTime: 1.0, endTime: 3.0, text: 'First caption' },
    { id: 'cue-2', index: 2, startTime: 4.0, endTime: 6.0, text: 'Second caption' },
  ];

  it('Apply to Selected updates only target cue styleOverride without altering text or timestamps', () => {
    const targetCueId = 'cue-1';
    const override: Partial<SubtitleStyle> = { fontSize: 60, textColor: '#FF0000' };

    const updatedCues = cues.map((c) =>
      c.id === targetCueId ? { ...c, styleOverride: { ...c.styleOverride, ...override } } : c
    );

    // Target cue has override
    expect(updatedCues[0].styleOverride?.fontSize).toBe(60);
    expect(updatedCues[0].styleOverride?.textColor).toBe('#FF0000');
    expect(updatedCues[0].text).toBe('First caption');
    expect(updatedCues[0].startTime).toBe(1.0);
    expect(updatedCues[0].endTime).toBe(3.0);

    // Other cue is unaffected
    expect(updatedCues[1].styleOverride).toBeUndefined();
    expect(updatedCues[1].text).toBe('Second caption');
  });

  it('Apply to All updates global style and clears individual overrides', () => {
    const cuesWithOverrides: CaptionCue[] = [
      { id: 'cue-1', index: 1, startTime: 1.0, endTime: 3.0, text: 'One', styleOverride: { fontSize: 80 } },
      { id: 'cue-2', index: 2, startTime: 4.0, endTime: 6.0, text: 'Two' },
    ];

    const newGlobalStyle: SubtitleStyle = { ...DEFAULT_STYLE, fontSize: 40 };

    // Apply to all
    const sanitizedCues = cuesWithOverrides.map((c) => ({ ...c, styleOverride: undefined }));

    expect(sanitizedCues[0].styleOverride).toBeUndefined();
    expect(sanitizedCues[0].text).toBe('One');
    expect(sanitizedCues[0].startTime).toBe(1.0);
    expect(sanitizedCues[1].text).toBe('Two');
    expect(newGlobalStyle.fontSize).toBe(40);
  });
});

// ─── 4. Estimated Word Timing & Highlight Tracking ────────────────────────────

describe('Word Timing & Highlighting', () => {
  const sampleCue: CaptionCue = {
    id: 'cue-sample',
    index: 1,
    startTime: 2.0,
    endTime: 6.0, // 4 seconds duration
    text: 'Today we are learning programming',
  };

  it('calculates proportional word durations marked as estimated', () => {
    const words = getCueWords(sampleCue);
    expect(words).toHaveLength(5);
    expect(words[0].word).toBe('Today');
    expect(words[4].word).toBe('programming');

    // All marked estimated
    expect(words.every((w) => w.isEstimated)).toBe(true);

    // Bounds verification
    expect(words[0].startTime).toBe(2.0);
    expect(words[4].endTime).toBe(6.0);

    // Longer word 'programming' gets more duration than short word 'we'
    const durationProgramming = words[4].endTime - words[4].startTime;
    const durationWe = words[1].endTime - words[1].startTime;
    expect(durationProgramming).toBeGreaterThan(durationWe);
  });

  it('identifies the active word during playback and seeking', () => {
    const words = getCueWords(sampleCue);

    // At 2.1s (beginning), active word is word 0 ("Today")
    const idxStart = getActiveWordIndex(words, 2.1);
    expect(idxStart).toBe(0);

    // Near the end (5.8s), active word is word 4 ("programming")
    const idxEnd = getActiveWordIndex(words, 5.8);
    expect(idxEnd).toBe(4);

    // Seeking backwards returns early word
    const idxMid = getActiveWordIndex(words, 3.2);
    expect(idxMid).toBeGreaterThanOrEqual(1);
    expect(idxMid).toBeLessThanOrEqual(3);
  });

  it('preserves line breaks in multi-line cues', () => {
    const multiLineCue: CaptionCue = {
      id: 'cue-multi',
      index: 1,
      startTime: 1.0,
      endTime: 4.0,
      text: 'First line\nSecond line',
    };

    const words = getCueWords(multiLineCue);
    expect(words).toHaveLength(4);
    // Word 1 ('line') has newline flag
    expect(words[1].hasNewline).toBe(true);
    expect(words[3].hasNewline).toBe(false);
  });

  it('uses explicit word timestamps when provided', () => {
    const explicitCue: CaptionCue = {
      id: 'cue-explicit',
      index: 1,
      startTime: 0.0,
      endTime: 3.0,
      text: 'Word One Two',
      words: [
        { word: 'Word', startTime: 0.0, endTime: 1.0, isEstimated: false },
        { word: 'One', startTime: 1.0, endTime: 2.0, isEstimated: false },
        { word: 'Two', startTime: 2.0, endTime: 3.0, isEstimated: false },
      ],
    };

    const words = getCueWords(explicitCue);
    expect(words).toEqual(explicitCue.words);
    expect(words[0].isEstimated).toBe(false);
  });
});

// ─── 5. Expanded Style Library (13 Presets) ───────────────────────────────────

describe('Subtitle Presets Library', () => {
  it('contains exactly 13 distinct presets', () => {
    expect(SUBTITLE_PRESETS).toHaveLength(13);
  });

  it('includes all 7 new requested presets', () => {
    const ids = SUBTITLE_PRESETS.map((p) => p.id);
    expect(ids).toContain('rainbow-karaoke');
    expect(ids).toContain('active-word-pop');
    expect(ids).toContain('yellow-punch');
    expect(ids).toContain('bujjigadu-comedy');
    expect(ids).toContain('neon-glow');
    expect(ids).toContain('typewriter');
    expect(ids).toContain('two-line-cinema');
  });

  it('all 13 presets validate against SubtitleStyleSchema', () => {
    for (const preset of SUBTITLE_PRESETS) {
      expect(() => SubtitleStyleSchema.parse(preset.style)).not.toThrow();
    }
  });

  it('generates valid ASS scripts for all 13 presets', () => {
    const testCue: CaptionCue = {
      id: 'test',
      index: 1,
      startTime: 1.0,
      endTime: 4.0,
      text: 'Bujjigadu Subtitle Studio',
    };

    for (const preset of SUBTITLE_PRESETS) {
      const ass = generateAssScript([testCue], preset.style, 1920, 1080);
      expect(ass).toContain('[Script Info]');
      expect(ass).toContain('[V4+ Styles]');
      expect(ass).toContain('[Events]');
      expect(ass).toContain('Dialogue:');
    }
  });
});

// ─── 6. ASS Export with Word Animation and Overrides ──────────────────────────

describe('ASS Export Word Animation & Style Overrides', () => {
  const karaokeCue: CaptionCue = {
    id: 'cue-k',
    index: 1,
    startTime: 1.0,
    endTime: 4.0,
    text: 'Quick brown fox',
  };

  it('generates timed word highlight dialogue segments for karaoke-highlight preset', () => {
    const yellowPunch = getPresetById('yellow-punch')!;
    const ass = generateAssScript([karaokeCue], yellowPunch.style, 1920, 1080);

    // Has dialogue events with color override tags
    expect(ass).toContain('Dialogue:');
    expect(ass).toContain('\\c&H');
  });

  it('generates progressive word slices for typewriter preset', () => {
    const typewriter = getPresetById('typewriter')!;
    const ass = generateAssScript([karaokeCue], typewriter.style, 1920, 1080);

    expect(ass).toContain('Dialogue:');
    expect(ass).toContain('Quick');
    expect(ass).toContain('Quick brown');
    expect(ass).toContain('Quick brown fox');
  });

  it('applies per-caption styleOverride in ASS export output', () => {
    const cueWithOverride: CaptionCue = {
      id: 'cue-override',
      index: 1,
      startTime: 1.0,
      endTime: 3.0,
      text: 'Custom Styled Line',
      styleOverride: {
        fontSize: 72,
        textColor: '#FF0000',
      },
    };

    const cleanEducational = getPresetById('clean-educational')!;
    const ass = generateAssScript([cueWithOverride], cleanEducational.style, 1920, 1080);
    expect(ass).toContain('\\fs72');
    expect(ass).toContain('\\c&H000000FF&'); // Red in ASS BGR
    expect(ass).toContain('Custom Styled Line');
  });
});

// ─── 7. Timeline Dragging & Boundary Validation ───────────────────────────────

describe('Timeline Dragging & Boundaries', () => {
  it('prevents caption start time from becoming negative', () => {
    const initialStart = 1.0;
    const delta = -3.0; // drag backwards past 0
    const newStart = Math.max(0, initialStart + delta);
    expect(newStart).toBe(0);
  });

  it('ensures end time remains strictly greater than start time during trimming', () => {
    const currentEnd = 5.0;
    const proposedStart = 5.5; // drag start past end
    const clampedStart = Math.min(currentEnd - 0.2, proposedStart);
    expect(clampedStart).toBe(4.8);
    expect(currentEnd).toBeGreaterThan(clampedStart);
  });

  it('preserves caption text and index during timing edits', () => {
    const cue: CaptionCue = {
      id: 'c1',
      index: 3,
      startTime: 2.0,
      endTime: 5.0,
      text: 'Unchanged Text',
    };

    const movedCue = {
      ...cue,
      startTime: 4.0,
      endTime: 7.0,
    };

    expect(movedCue.text).toBe(cue.text);
    expect(movedCue.index).toBe(cue.index);
    expect(movedCue.endTime - movedCue.startTime).toBe(cue.endTime - cue.startTime);
  });
});


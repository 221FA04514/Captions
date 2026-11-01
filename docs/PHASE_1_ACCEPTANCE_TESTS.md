# Phase 1 Acceptance Criteria & Verification Matrix

This document defines the acceptance test scenarios required to declare Phase 1 complete. Every criterion must be verified either through automated tests or end-to-end execution.

| # | Acceptance Criterion | Test Method | Status |
|---|---|---|---|
| **AC-01** | Start application using documented commands (`npm run dev`) | Manual & Script Verification | VERIFIED |
| **AC-02** | React frontend opens cleanly in modern browser (Vite dev server) | Subagent Browser / Manual | VERIFIED |
| **AC-03** | Upload valid video (MP4, MOV, WebM) | API & UI Test | VERIFIED |
| **AC-04** | Display video preview & FFprobe metadata (duration, dims, fps) | API & UI Test | VERIFIED |
| **AC-05** | Upload SRT / WebVTT caption file | API & UI Test | VERIFIED |
| **AC-06** | Captions parse and display with exact timestamps and text | Unit & UI Test | VERIFIED |
| **AC-07** | Edit caption text inline with immediate update | UI & Store Test | VERIFIED |
| **AC-08** | Adjust start/end times and apply global timing offset | Unit & UI Test | VERIFIED |
| **AC-09** | Select 6 distinct subtitle presets (Viral Shorts, Clean Educational, Telugu-English Mix, Podcast, Cinematic, Bujjigadu Signature) | UI & Style Engine Test | VERIFIED |
| **AC-10** | Customize typography (font, size, colors, outline, shadow, box, alignment, position) | UI & Style Engine Test | VERIFIED |
| **AC-11** | Live video preview overlay dynamically updates to match style controls | UI Verification | VERIFIED |
| **AC-12** | Export real MP4 with burned-in subtitles using FFmpeg | Integration Test | VERIFIED |
| **AC-13** | Exported video plays in standard media players (VLC, Windows Media Player) | FFprobe & Player Test | VERIFIED |
| **AC-14** | Original audio track and synchronization preserved in export | FFprobe Stream Analysis | VERIFIED |
| **AC-15** | Telugu captions render correctly without glyph corruption | Unit & Render Test | VERIFIED |
| **AC-16** | Malformed inputs (invalid SRT, non-video uploads) produce clear error notifications | Unit & API Test | VERIFIED |
| **AC-17** | Save project to disk and reopen project restores complete state | API & Store Test | VERIFIED |
| **AC-18** | Automated tests pass without failures or skipped critical checks | Vitest Suite (59/59 passing) | VERIFIED |

---

## Detailed Test Procedures

### AC-05 & AC-06: Subtitle Parsing & Validation
- **Input**:
  - Valid SRT with English & Telugu Unicode lines.
  - Valid VTT with timestamps formatted `00:00.000` and `00:00:00.000`.
  - Malformed SRT (missing timestamps, negative duration, overlapping intervals).
- **Expected**:
  - Valid files parsed cleanly into millisecond timestamps.
  - Telugu glyphs (e.g. "నమస్కారం", "బుజ్జిగాడు సబ్ టైటిల్స్") preserved faithfully in UTF-8.
  - Warnings returned for overlapping or out-of-order cues without crashing.

### AC-09 & AC-10: Preset System & ASS Generation
- **Inputs**: All 6 presets applied to identical sample captions.
- **Expected**:
  - Valid ASS v4.00+ script generated for each.
  - Colors converted to ASS hexadecimal format `&HAABBGGRR&`.
  - BorderStyle set appropriately (1 for outline/shadow, 3 for bounding box).
  - Telugu-capable font family included in ASS Style headers.

### AC-12, AC-13 & AC-14: Real FFmpeg Burn-In Render
- **Procedure**:
  1. Generate synthetic 5-second test video with tone/audio.
  2. Parse sample Telugu + English subtitle cues.
  3. Execute render job via `/api/export`.
  4. Track progress messages from FFmpeg.
  5. Inspect output MP4 with FFprobe: verify video stream (`h264`), audio stream (preserved), duration matches source.

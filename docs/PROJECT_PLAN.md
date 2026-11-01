# Bujjigadu Subtitle Studio — Project Plan

## 1. Project Overview & Vision
**Bujjigadu Subtitle Studio** is a desktop-first subtitle editor and video rendering application built for content creators, YouTubers, Instagram Reels editors, and educators. It enables users to upload video and subtitle files (SRT / VTT), preview real-time synchronized captions, customize typography and styling using 6 professional presets or custom controls (with first-class Telugu and English text support), and export an MP4 video with burned-in subtitles rendered with FFmpeg.

The project is structured into three progressive phases:
- **Phase 1 (Current)**: Core Editor MVP — Local web application (Node.js/Express backend + React/Vite/Tailwind frontend) running on Windows, local video/subtitle import, live styling preview, ASS/FFmpeg burn-in export, project save/reopen, and automated test suite.
- **Phase 2 (Future)**: Smart Subtitle Studio — Word-level timestamps, animated word highlighting (karaoke/pop/fade), audio-assisted sync, and timeline improvements.
- **Phase 3 (Future)**: Public Launch & Cloud Hosting — Cloud object storage, background render workers, user auth, production security hardening, Docker deployment.

---

## 2. Technical Stack Selection & Justification

| Layer | Technology | Justification |
|---|---|---|
| **Frontend UI** | React 18, Vite, TypeScript, Tailwind CSS | High performance, instant HMR, modern dark UI styling, robust type-checking. |
| **Icons & UI Accents** | Lucide React | Modern, clean, consistent iconography. |
| **Backend API** | Node.js (v24), Express, TypeScript | Lightweight, fast local REST API, excellent child_process handling for FFmpeg. |
| **Data Validation** | Zod | End-to-end schema validation across API payloads, styling options, and timing rules. |
| **Video Engine** | FFmpeg v8.1.1 & FFprobe (libass enabled) | Industry standard for video transcoding and ASS subtitle filter rendering. |
| **Shared Code** | Shared TypeScript interfaces & schemas | Guarantees single source of truth for subtitle styles, presets, and validation. |
| **Testing** | Vitest, Supertest | Fast unit/integration tests for parsers, validation, and REST endpoints. |

---

## 3. Phase 1 Scope & Work Breakdown

### Task 1: Environment & Repository Inspection
- Status: **DONE**
- Findings: Repository initialized clean; Node v24.16.0, npm 11.13.0, Git 2.54.0 verified. FFmpeg & FFprobe v8.1.1 (libass enabled) located on host at `C:\Program Files\Kdenlive\bin\`. Nirmala UI (Telugu + Latin) verified in Windows Fonts.

### Task 2: Project Planning & Architecture Documentation
- Create `docs/PROJECT_PLAN.md`, `docs/ARCHITECTURE.md`, `docs/PHASE_1_ACCEPTANCE_TESTS.md`, `docs/DEVELOPMENT_LOG.md`.

### Task 3: Monorepo Foundation & Structure
- Root `package.json` with npm workspaces or client/server scripts.
- Shared types directory for subtitle formats, project schema, and style presets.
- Setup TypeScript configs, `.gitignore`, `.env.example`.

### Task 4: Backend API & Storage Engine
- Express app with typed routes:
  - `GET /api/health`
  - `POST /api/projects` / `GET /api/projects/:id` / `PUT /api/projects/:id`
  - `POST /api/upload/video` (with ffprobe metadata extraction)
  - `POST /api/upload/subtitles` (SRT/VTT parsing & validation)
  - `POST /api/export` (FFmpeg ASS burn-in execution with progress tracking)
  - `GET /api/export/:jobId` (job status & progress)
  - `GET /api/export/:jobId/download` (MP4 stream)
  - `GET /api/media/:fileId` (safe video streaming with range headers)
- Security: Path traversal protection, safe temp file cleanup, sanitized filenames, restricted process execution.

### Task 5: Frontend Dashboard & Video Subtitle Editor
- Modern dark mode layout (Charcoal `#121214`, Zinc accents, Indigo/Cyan brand tones).
- Left Panel: Caption list, search, timestamp editors, add/delete, previous/next navigation.
- Center Panel: HTML5 Video preview, playhead sync, live overlay preview matching export styles.
- Right Panel: 6 Subtitle Presets + granular controls (font, size, color, stroke/outline, shadow, background box, position, alignment).
- Bottom Panel: Interactive timeline scrubber and audio/time markers.
- Project Persistence: Save project to disk, reopen previous projects.

### Task 6: Six Polished Subtitle Presets
1. **Viral Shorts**: Bold uppercase font (e.g. Montserrat/Impact), bright yellow/cyan accents, thick black outline, center-bottom placement.
2. **Clean Educational**: Crisp sans-serif (Inter/Roboto), clean white text on semi-transparent dark rounded box.
3. **Telugu-English Mix**: High-legibility Nirmala UI / Noto Sans Telugu, balanced font weights, golden-yellow/white text, dark outline for bilingual video.
4. **Podcast**: Subtle serif/slate typography, lower third, elegant muted colors, soft drop shadow.
5. **Cinematic**: Letterspaced serif or clean neo-grotesque, classic cinema yellow/white, understated outline.
6. **Bujjigadu Signature**: Distinctive vibrant gradient/accent, punchy outline, stylish modern typography tailored for creator content.

### Task 7: Subtitle Processing & FFmpeg ASS Burn-In Pipeline
- Robust SRT & WebVTT parsers supporting Telugu Unicode and multi-line cues.
- Timestamp validation (detect overlapping, empty captions, out-of-order, or cues exceeding video duration).
- ASS (Advanced Substation Alpha) subtitle generator that translates our style presets into exact ASS script styles (Alignment, PrimaryColour, OutlineColour, BackColour, BorderStyle, Outline, Shadow, MarginV).
- FFmpeg invocation with `-vf subtitles='filename.ass':force_style=...` or `-vf ass='filename.ass'`.
- Progress tracking via FFmpeg `-progress pipe:1`.
- Original audio preservation (`-c:a copy` or safe re-encode if required).

### Task 8: Testing & Verification
- Automated unit tests for SRT/VTT parsing, ASS generation, validation schemas, and REST endpoints.
- Integration tests with real video generation and subtitle burning.
- Manual test checklist and development log updates.

---

## 4. Key Milestones & Timeline
- **Milestone 1**: Foundation & Planning docs (Day 1)
- **Milestone 2**: Backend core (upload, metadata, parsing, export engine) (Day 1)
- **Milestone 3**: Frontend layout & interactive editor (Day 1)
- **Milestone 4**: 6 Presets & ASS export consistency (Day 1)
- **Milestone 5**: Persistence, automated test suite, end-to-end verification (Day 1)

# Bujjigadu Subtitle Studio

> **Phase 1 — Core Editor MVP**  
> Professional subtitle studio with first-class Telugu and English typography, real-time live preview overlay, 6 distinct styling presets, and burned-in MP4 export using FFmpeg.

---

## 🌟 Key Features (Phase 1 MVP)

- **Video Import & Streaming**: MP4, MOV, WebM with FFprobe metadata extraction (dimensions, duration, fps, codec) and HTTP 206 range-request streaming.
- **SRT & WebVTT Caption Support**: High-fidelity parser supporting English, Telugu Unicode (`Nirmala UI`, `Noto Sans Telugu`), and mixed languages without corrupting glyphs.
- **Caption Validation**: Overlap detection, out-of-order sequence warnings, and out-of-bounds cue alerts.
- **Caption Editor**: Inline text editing, timestamp precision adjustments, add/delete cues, time search, and global timing offset adjustment.
- **6 Hand-Crafted Presets**:
  1. **Viral Shorts**: Punchy yellow text with heavy black outline for high-retention Reels/Shorts.
  2. **Clean Educational**: Crisp white text on semi-transparent charcoal box for tutorials.
  3. **Telugu-English Mix**: Tailored for bilingual Indian content with `Nirmala UI` and emerald accenting.
  4. **Podcast**: Subtle gray box with high legibility for long-form discussion videos.
  5. **Cinematic**: Classic serif subtitles with restrained drop-shadow.
  6. **Bujjigadu Signature**: Distinctive electric-indigo styling with rounded padded backdrop.
- **Granular Styling Controls**: Real-time typography, colors, outline width, shadow blur, bounding box opacity/padding, and vertical positioning.
- **Synchronized Video Preview**: CSS overlay mathematically mirroring the exported ASS v4.00+ subtitles.
- **Real MP4 Export**: High-quality FFmpeg rendering with `libass`, background progress tracking, and original audio preservation.
- **Project Persistence**: Auto-save and re-load project states from disk without requiring an account.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18 or higher recommended, tested on Node v24)
- **FFmpeg & FFprobe with `libass`** (automatically detected from PATH or `C:\Program Files\Kdenlive\bin`)

### Installation

```bash
# Clone or navigate to the repository
cd captions

# Install all workspace dependencies
npm install
```

### Running in Development

```bash
# Starts both Express backend (:5000) and Vite frontend (:5173)
npm run dev
```

Open your browser at:
👉 **`http://localhost:5173`**

### Running the Test Suite

```bash
# Run all 59 automated unit and API integration tests
npm test
```

### Building for Production

```bash
# Compiles both server and client workspaces
npm run build
```

---

## 📂 Project Structure

```
captions/
├── client/                     # Vite + React 18 + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/         # VideoPlayer, SubtitleOverlay, CaptionList, StylePanel, Toolbar
│   │   ├── context/            # Centralized AppContext store (useReducer)
│   │   ├── services/           # Typed API client
│   │   └── App.tsx
│   └── vite.config.ts
├── server/                     # Node.js + Express + TypeScript backend
│   ├── src/
│   │   ├── controllers/        # Project, upload, media, and export controllers
│   │   ├── services/           # FFmpeg runner, FFprobe inspector, SRT/VTT parser, ASS generator
│   │   └── app.ts
│   └── tests/                  # 59 automated Vitest & Supertest tests
├── shared/                     # Shared TypeScript types, Zod schemas, and presets
│   ├── types.ts
│   ├── presets.ts
│   └── validators.ts
├── docs/                       # Project documentation
│   ├── PROJECT_PLAN.md
│   ├── ARCHITECTURE.md
│   ├── PHASE_1_ACCEPTANCE_TESTS.md
│   └── DEVELOPMENT_LOG.md
└── storage/                    # Local storage for uploads, exports, and projects
```

---

## 📄 License
ISC


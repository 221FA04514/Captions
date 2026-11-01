# Bujjigadu Subtitle Studio — System Architecture

## 1. Architectural Overview

Bujjigadu Subtitle Studio is a decoupled, modern client-server architecture designed for high-performance video preview and reliable server-side media processing.

```
+-----------------------------------------------------------------------------------+
|                                  CLIENT (React)                                   |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  |   Left Panel        |   |    Center Panel     |   |       Right Panel       |  |
|  |  Caption List       |   | HTML5 Video Preview |   | Presets & Style Editors |  |
|  |  Add/Delete/Offset  |   | Synced Canvas/CSS   |   | (Font, Outline, Box)    |  |
|  +---------------------+   +---------------------+   +-------------------------+  |
|  +-----------------------------------------------------------------------------+  |
|  |                       Bottom Panel: Timeline & Controls                     |  |
|  +-----------------------------------------------------------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (Vite Proxy)
                                           v
+-----------------------------------------------------------------------------------+
|                                 SERVER (Express)                                  |
|  +-----------------------------------------------------------------------------+  |
|  | Routes & Controllers: /projects, /upload, /export, /media                   |  |
|  +-----------------------------------------------------------------------------+  |
|  | Services:                                                                   |  |
|  | - VideoService: FFprobe metadata extraction, safe media streaming           |  |
|  | - SubtitleService: SRT/VTT parsing, validation, ASS generation              |  |
|  | - ExportService: FFmpeg queue, libass filter execution, progress parser    |  |
|  | - ProjectStore: Local JSON file-based persistence                           |  |
|  +-----------------------------------------------------------------------------+  |
|  | Security Middleware: Safe path resolver, file sanitization, payload limits  |  |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                              STORAGE & EXTERNAL TOOLS                             |
|  - storage/projects/{projectId}/project.json                                      |
|  - storage/media/{projectId}/original_video.mp4                                   |
|  - storage/exports/{jobId}/output.mp4                                             |
|  - FFmpeg & FFprobe (libass filter enabled)                                       |
+-----------------------------------------------------------------------------------+
```

---

## 2. Subtitle Processing & Consistency Strategy

A central challenge in web-based video editors is ensuring that what the user sees in the browser preview strictly matches the final exported video.

### 2.1 Preview vs. Export Rendering
- **In-Browser Preview**: Rendered using high-fidelity CSS text overlays positioned over an HTML5 `<video>` element, styled with identical metrics:
  - Font family, size in viewport-relative units or percentage.
  - Text color & background box (opacity, padding, border radius).
  - Text stroke/outline (via `-webkit-text-stroke` and multiple `text-shadow` directional passes to prevent hollow fonts).
  - Vertical positioning and alignments.
- **FFmpeg Export**:
  - We convert the project's caption list and style configuration into standard **ASS (Advanced SubStation Alpha v4.00+)** format.
  - ASS is natively supported by `libass` in FFmpeg, which accurately renders:
    - Font family, exact point size (scaled to video height).
    - Primary color, secondary color, outline color, and shadow/back color (in ASS `&HBBGGRR&` hex format with alpha).
    - BorderStyle 1 (outline + drop shadow) or BorderStyle 3 (opaque background bounding box).
    - Alignment (num-pad mapping: 2 for bottom-center, 1 for bottom-left, etc.).
    - Margins (MarginV, MarginL, MarginR).
  - FFmpeg filter: `-vf "ass='.../subtitles.ass'"` or `-vf "subtitles='.../subtitles.ass'"`.
  - Audio stream preserved with `-c:a copy` or encoded to high-bitrate AAC when re-multiplexing.

### 2.2 Telugu & Unicode Typography
- Windows bundles `Nirmala UI` (`Nirmala.ttc`) which supports full Telugu conjuncts and vowel signs.
- For client preview, Google Fonts (`Noto Sans Telugu` and standard Latin fonts) are embedded in `index.html`.
- For ASS rendering, font fallback and font family specification prioritize `Noto Sans Telugu`, `Nirmala UI`, and `Arial Unicode MS`.

---

## 3. Data Schema & Models

### 3.1 Subtitle Cue (`CaptionCue`)
```typescript
interface CaptionCue {
  id: string;
  index: number;
  startTime: number;  // seconds with millisecond precision (e.g. 1.250)
  endTime: number;    // seconds with millisecond precision
  text: string;       // UTF-8 string (Telugu / English / Mixed)
}
```

### 3.2 Subtitle Style Configuration (`SubtitleStyle`)
```typescript
interface SubtitleStyle {
  presetId: 'viral-shorts' | 'clean-educational' | 'telugu-english' | 'podcast' | 'cinematic' | 'bujjigadu-signature' | 'custom';
  fontFamily: string;
  fontSize: number;       // base font size relative to 1080p canvas (e.g. 42)
  fontWeight: 'normal' | 'bold' | '800';
  textColor: string;      // Hex #RRGGBB
  highlightColor?: string;// Hex #RRGGBB for accent words
  outlineColor: string;   // Hex #RRGGBB
  outlineWidth: number;   // 0 to 8 px
  shadowColor: string;    // Hex #RRGGBB
  shadowBlur: number;     // 0 to 10 px
  backgroundColor: string;// Hex #RRGGBB
  backgroundOpacity: number; // 0.0 to 1.0
  backgroundPadding: number; // px
  position: 'top' | 'middle' | 'bottom';
  verticalOffsetPercent: number; // 0% to 50% from edge
  alignment: 'left' | 'center' | 'right';
  letterSpacing: number;  // px
  lineHeight: number;     // e.g. 1.2
  allCaps: boolean;
}
```

### 3.3 Project Document (`ProjectData`)
```typescript
interface ProjectData {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  video: {
    filename: string;
    originalName: string;
    duration: number;
    width: number;
    height: number;
    fps: number;
    size: number;
    mimeType: string;
  } | null;
  captions: CaptionCue[];
  style: SubtitleStyle;
  exportSettings: {
    format: 'mp4';
    videoCodec: 'libx264';
    audioCodec: 'copy' | 'aac';
    resolution?: 'original' | '1080p' | '720p';
  };
}
```

---

## 4. API Endpoints Contract

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | Returns health status, FFmpeg availability, system info |
| `POST` | `/api/projects` | Creates a new empty or initialized project |
| `GET` | `/api/projects` | Lists all saved projects |
| `GET` | `/api/projects/:id` | Fetches project state |
| `PUT` | `/api/projects/:id` | Updates and persists project state |
| `POST` | `/api/upload/video` | Uploads video (multipart), runs ffprobe, returns video metadata |
| `POST` | `/api/upload/subtitles` | Uploads SRT/VTT file, returns parsed cues & validation warnings |
| `GET` | `/api/media/:fileId` | Streams original video file with HTTP 206 partial content support |
| `POST` | `/api/export` | Initiates FFmpeg rendering job |
| `GET` | `/api/export/:jobId` | Polls render status, progress percentage, error message |
| `GET` | `/api/export/:jobId/download` | Downloads rendered MP4 video |
| `POST` | `/api/export/:jobId/cancel` | Terminates active FFmpeg child process |

---

## 5. Security & Reliability

1. **Path Traversal Protection**: All filesystem accesses are strictly scoped to the `storage/` directory using safe path resolution (`path.resolve` check against allowed base directories).
2. **Safe Filenames**: UUIDv4 used for internal file IDs; user filenames never concatenated into shell commands.
3. **No Shell Invocations**: FFmpeg executed using `child_process.spawn()` with structured argument arrays. No `child_process.exec()` or shell string interpolation.
4. **Temporary File Cleanup**: Failed or canceled render jobs trigger automatic cleanup of generated ASS scripts and incomplete video files.
5. **Streaming Media**: Video preview endpoints support `Range` requests (`bytes=0-`) so browsers can seek smoothly without buffering the entire file into memory.

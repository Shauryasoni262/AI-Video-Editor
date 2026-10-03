# Antigravity AI Video Editor (Local & Free for Windows)

A personal-use, high-performance desktop-style AI video editing web application running 100% locally on Windows. Built with **React + Vite**, **Node.js + Express**, and powered by **FFmpeg**.

---

## 🌟 Key Highlights & Design Principles

- **Zero Cloud Uploads**: All video and audio files remain strictly on your local disk.
- **No Intentional Quality Loss**: Source resolution, frame rates (FPS), and color ranges are preserved.
- **Smart FFmpeg Export**: Performs high-speed stream copying (`-c copy`) whenever possible without re-encoding, and visually lossless encoding (CRF 17-18, 320k audio) when visual effects/text are applied.
- **Modular AI Command Pipeline**: Clean separation where natural language commands map to structured JSON actions, mutating the timeline non-destructively and compiling directly to FFmpeg commands.
- **Professional Dark Interface**: DaVinci / Premiere-inspired sleek dark UI with responsive timeline, audio waveform tracks, real-time CSS effect previews, and micro-precision transport controls.

---

## 📁 Project Architecture & Folder Structure

```
ai-video-editor/
├── package.json                 # Unified runner scripts
├── run.js                       # Starts backend & frontend concurrently
├── test_e2e.js                  # End-to-end verification test suite
│
├── server/                      # Node.js + Express backend
│   ├── package.json
│   ├── src/
│   │   ├── index.js             # API routes, partial range streaming, jobs
│   │   ├── ffmpeg/
│   │   │   ├── detector.js      # Auto-detects local FFmpeg / FFprobe
│   │   │   ├── metadata.js      # FFprobe metadata & thumbnail extractor
│   │   │   └── exporter.js      # Stream-copy & complex filtergraph engine
│   │   ├── ai/
│   │   │   └── parser.js        # NL Command -> Structured Action mapper
│   │   ├── projects/
│   │   │   └── projectManager.js# Non-destructive project JSON persistence
│   │   └── generate_sample.js   # Generates 1080p demo video & audio
│   └── storage/
│       ├── uploads/             # Imported source media (untouched)
│       ├── exports/             # Rendered output videos
│       ├── thumbnails/          # Fast generated preview frames
│       └── projects/            # Saved project session files
│
└── client/                      # React + Vite frontend
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── index.css            # Dark theme design system & tokens
        ├── App.css              # Video editor layout & component styles
        ├── App.jsx              # Main editor controller & undo/redo stack
        ├── components/
        │   ├── Header.jsx       # Project title, Undo/Redo, FFmpeg status, Export
        │   ├── Sidebar.jsx      # Media Library, Audio, Text, Effects, Transitions
        │   ├── Preview.jsx      # Video viewport, live effects, timecode, transport
        │   ├── Timeline.jsx     # Multi-track (V1, A1, T1), playhead, trim handles, razor
        │   ├── Properties.jsx   # Speed, volume, color grading, transforms
        │   ├── AiAssistant.jsx  # Natural language command panel & execution log
        │   ├── ExportModal.jsx  # Original/1080p/4K presets, real-time progress bar
        │   └── ProjectModal.jsx # Project load/save dialog
        └── utils/
            ├── api.js           # Local backend client
            └── timeUtils.js     # SMPTE timecode formatting (HH:MM:SS:FF)
```

---

## 🚀 Quick Start Guide

### 1. Recommended Workspace Directory
Set your active workspace to:
`C:\Users\LOQ\.gemini\antigravity-ide\scratch\ai-video-editor`

### 2. Running the Application
From the project root:
```bash
# Start both backend and frontend concurrently:
node run.js
```
- **Backend API**: `http://localhost:5001`
- **Frontend Editor UI**: `http://localhost:5173`

---

## 🎬 Implemented MVP Features

### 1. Video & Audio Import
- Drag-and-drop or file picker for `MP4`, `MOV`, `MKV`, `WebM`, `MP3`, `WAV`.
- Original resolution, bitrates, and audio channels preserved with zero compression on import.
- Automatic metadata extraction (dimensions, fps, duration, codecs) and thumbnail generation.

### 2. Video Preview Player
- Large video viewport with 16:9 safe frame.
- Real-time CSS filter pipeline matching FFmpeg render output (Brightness, Contrast, Saturation, Blur, Grayscale, Sepia, Rotate, Flip, Zoom).
- SMPTE timecode display (`HH:MM:SS:FF`), spacebar play/pause shortcut, seek bar, loop toggle, fullscreen preview.

### 3. Professional Multi-Track Timeline
- Multi-track layout: **V1** (Video clips), **A1** (Audio tracks), **T1** (Text overlays).
- Red draggable scrub playhead with time ruler ticks.
- **Split Tool (Razor)**: Splits clips at current playhead into non-destructive segments.
- **Trim Handles**: Drag left or right handle on any clip to trim start/end points.
- **Delete & Multi-Clip Sequencing**: Add multiple videos in succession.
- Zoom slider to inspect frames up to 80px/second.

### 4. Audio Controls
- Mute original video audio or set custom volume (0% - 200%).
- Import separate background music / songs onto audio track with volume and fade in/out.

### 5. Color Grading & Visual Effects
- Brightness, Contrast, Saturation sliders.
- Grayscale (Noir B&W) and Vintage Sepia looks.
- Gaussian blur and sharpening filters.
- Transform controls: Rotate 90°, Horizontal flip (mirror), Vertical flip, Zoom scaling.

### 6. Text & Title Overlays
- Custom text banners, subtitles, and watermarks with adjustable font size, position (Top, Center, Bottom), and color picker.

### 7. Smart FFmpeg Export
- Presets:
  - **Original Quality (Master)**: Stream-copies when possible (zero quality loss and near-instant processing), or encodes at visually lossless CRF 17.
  - **1080p Full HD**: High bitrate H.264 + 320k AAC audio.
  - **4K Ultra HD**: 3840x2160 mastering.
- Real-time progress bar tracking FFmpeg frame encoding percentage.
- Local download and direct file path display.

### 8. Project System
- Non-destructive JSON project storage in `server/storage/projects/`.
- Full Undo (`Ctrl+Z`) and Redo (`Ctrl+Y`) history stacks.

### 9. AI Editing Architecture
Natural language parser (`server/src/ai/parser.js`) maps commands to structured actions:
- *"Remove the first 5 seconds"* ➔ `TRIM_START`
- *"Trim this video to 30 seconds"* ➔ `SET_DURATION`
- *"Make it brighter"* ➔ `SET_EFFECT (brightness +15%)`
- *"Increase speed to 1.25x"* ➔ `SET_SPEED`
- *"Remove original audio"* ➔ `MUTE_AUDIO`
- *"Add text 'Epic Shot'"* ➔ `ADD_TEXT`
- *"Cut out the silent parts"* ➔ `DETECT_SILENCE`
- Ready for local LLMs (e.g. Ollama `llama3`) and Whisper speech-to-text.

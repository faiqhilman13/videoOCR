# FrameRead Tasks

**Date:** 2024-07-27
**Project Complexity (Estimated):** Level 3

## Phase 1: Core Local Application (MVP)

### Milestone 1: Local Web App Skeleton (React + Node launcher)
- [x] **Task 1.1: Setup Project Environment**
    - [x] Initialize Node.js project (`package.json`)
    - [x] Setup React frontend (e.g., using Create React App or Vite)
    - [x] Install Tailwind CSS and configure for React
    - [x] Define basic project structure (`/app`, `/frontend` as per rules)
- [x] **Task 1.2: Create Node.js Local Server (Launcher)**
    - [x] Basic Express.js (or similar lightweight framework) setup
    - [x] Script to serve the React build (static files)
    - [x] Script to launch the app (e.g., `npm start` opening browser to `localhost:3000`)
    - [x] Define simple API endpoint structure (placeholder for future needs)
- [x] **Task 1.3: Basic UI Layout**
    - [x] Create main application component in React
    - [x] Implement a simple, clean UI layout using Tailwind CSS for video display, controls, and OCR results area.

### Milestone 2: Video Input & Playback + Frame Sampling
- [x] **Task 2.1: Video Upload Component**
    - [x] Implement drag & drop video file input
    - [x] Implement file picker video input
    - [x] Basic validation for video file types (e.g., mp4, webm)
- [x] **Task 2.2: Video Playback Component**
    - [x] Integrate HTML5 `<video>` element
    - [x] Implement play/pause controls
    - [x] Display video preview
- [x] **Task 2.3: Frame Extraction Logic (FFmpeg)**
    - [x] **Sub-Task 2.3.1: Integrate FFmpeg.wasm**
        - [x] Add FFmpeg.wasm to the project
        - [x] Write service to load FFmpeg.wasm
    - [x] **Sub-Task 2.3.2: Frame Sampling Service**
        - [x] Function to extract frames at X-second intervals (configurable, default 1s)
        - [x] Handle video loading into FFmpeg.wasm
        - [x] Output frames as image data (e.g., base64 or blob)
    - [ ] **Sub-Task 2.3.3: (Fallback) System FFmpeg detection (Optional for MVP, consider for robustness)**
        - [ ] If Node.js server has more capabilities, explore detecting local FFmpeg install. For pure browser, this is out of scope.

### Milestone 3: OCR Engine (Tesseract.js integration)
-   **Task 3.1: Integrate Tesseract.js**
    -   **Status:** `✅ Complete`
    -   **Complexity:** 3
    -   **Sub-Tasks:**
        -   Install `tesseract.js` package. (`✅ Complete`)
        -   Create `ocrService.js` to manage Tesseract worker creation, OCR processing, and termination. (`✅ Complete`)
        -   Integrate `ocrService.js` into `App.jsx`:
            -   Initialize Tesseract on component mount. (`✅ Complete`)
            -   Add state for Tesseract loading, readiness, and OCR results. (`✅ Complete`)
            -   Modify `handleExtractFrames` to call `performOCR` for each extracted frame. (`✅ Complete`)
            -   Display basic OCR status/results in the UI. (`✅ Complete`)
            -   Ensure worker termination on component unmount. (`✅ Complete`)
-   **Task 3.2: Enhance OCR Results Handling & Implement Export**
    -   **Status:** `✅ Complete`
    -   **Complexity:** 2
    -   **Sub-Tasks:**
        -   Display OCR results per frame in the UI. (`✅ Complete` - achieved during Task 3.1 and refined)
        -   Implement "Export Text" button to copy all consolidated OCR text to clipboard. (`✅ Complete`)
        -   Ensure appropriate UI feedback for export (e.g., "copied" alert). (`✅ Complete`)
        -   Implement image preprocessing to improve OCR accuracy.
            -   **Status:** `✅ Complete`
            -   **Note (2024-07-29):** Successfully integrated Jimp for image preprocessing (grayscale, contrast, thresholding). The initial complex setup using `@jimp/custom` and individual plugins caused significant build/runtime issues with Vite. The fix was to revert to the standard Jimp import (`import { Jimp } from 'jimp';`), which resolved the module errors and allowed preprocessing to function.
-   **Task 3.3: Link Frame Extraction to OCR**
    - [ ] Orchestrate the process: extract frame -> pass to OCR -> store result with timestamp

### Milestone 4: Text Overlay + Result Viewer + Export
- [ ] **Task 4.1: OCR Results Display**
    - [ ] **Sub-Task 4.1.1: Sidebar Log**
        - [ ] Component to display a running list of OCR text snippets with timestamps
        - [ ] Make text snippets selectable and copyable
    - [ ] **Sub-Task 4.1.2: (Optional MVP) Text Overlay on Video Frame**
        - [ ] Display bounding boxes and recognized text over the video frame (can be complex, might defer post-MVP)
- [ ] **Task 4.2: Search Functionality**
    - [ ] Input field for searching OCR'd text
    - [ ] Basic client-side text search (fuzzy match if feasible, otherwise exact)
    - [ ] Highlight matches in the results log and allow navigation to timestamp
- [ ] **Task 4.3: Export Functionality**
    - [ ] **Sub-Task 4.3.1: Export as Plaintext (.txt)**
        - [ ] Consolidate all OCR text into a single string
        - [ ] Trigger browser download
    - [ ] **Sub-Task 4.3.2: Export as SRT (.srt)**
        - [ ] Format OCR text with timestamps into SRT format
        - [ ] Trigger browser download
    - [ ] **Sub-Task 4.3.3: Export as JSON (.json)**
        - [ ] Structure OCR text, timestamps, and (if available) bounding box data as JSON
        - [ ] Trigger browser download

### Milestone 5: Packaging for Easy Local Install (zip/app)
- [ ] **Task 5.1: Create Distribution Scripts**
    - [ ] `run.bat` for Windows
    - [ ] `run.sh` for macOS/Linux
    - [ ] Scripts should install dependencies (if not bundled) and start the application
- [ ] **Task 5.2: (Optional) Electron Packaging**
    - [ ] Investigate Electron for creating a standalone desktop app
    - [ ] Setup Electron build process
    - [ ] Package Node.js server and React frontend into an Electron app
    - (Consider if this is truly MVP or a v1.1 improvement)
- [ ] **Task 5.3: Documentation for Local Run**
    - [ ] Simple `README.md` in the zip explaining how to run.

## Phase 2: Premium Features & SaaS (Post-MVP)

### Milestone 6: Premium Feature Hooks + SaaS Setup (Stripe)
- [ ] **Task 6.1: User Authentication (Placeholder/Concept)**
    - [ ] Design basic non-persistent user identification if needed for premium (even if local, e.g. license key)
    - [ ] Note: PRD says "No need for a persistent login or cloud account in MVP" - this is future.
- [ ] **Task 6.2: Stripe Integration (Conceptual)**
    - [ ] Research Stripe JS for client-side or Stripe Elements for future payment forms.
    - [ ] Plan how licensing/feature flagging would work.
- [ ] **Task 6.3: Develop Premium Features (Examples, select for actual implementation)**
    - [ ] **Sub-Task 6.3.1: Batch OCR of video folders**
        - [ ] UI for folder selection
        - [ ] Backend logic to iterate and process multiple videos
    - [ ] **Sub-Task 6.3.2: PDF exports with embedded OCR**
        - [ ] Library for PDF generation (e.g., jsPDF)
        - [ ] Logic to embed text
    - [ ] **Sub-Task 6.3.3: Text redaction / obfuscation**
        - [ ] UI tools for selecting text to redact
        - [ ] Logic to alter image data or OCR output
    - [ ] **Sub-Task 6.3.4: "Stealth mode" window**
        - [ ] UI theming options or minimal interface

## General Project Tasks
- [x] **Task G1: Setup Testing Framework (Suggest Jest/Vitest for JS/Node)**
    - [x] Configure Jest or Vitest for React components
    - [ ] Configure testing for Node.js services (if any backend logic beyond serving files)
- [ ] **Task G2: Write Unit Tests (as per rulebook)**
    - [x] For critical React components
    - [ ] For OCR service logic
    - [ ] For frame extraction service logic
    - [ ] For export formatting logic
- [ ] **Task G3: Create `README.md`**
    - [ ] Project overview
    - [ ] Setup and installation instructions
    - [ ] How to run
    - [ ] Known issues/limitations
- [x] **Task G4: Version Control Setup**
    - [x] Initialize Git repository
    - [x] Create `.gitignore` file

## Discovered During Work
*(To be filled as project progresses)*

---
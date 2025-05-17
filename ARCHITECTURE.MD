# FrameRead Architecture

## 1. Overview

FrameRead is a client-side web application designed for extracting text from video files using Optical Character Recognition (OCR). The entire processing pipeline, from video frame extraction to OCR, occurs directly within the user's web browser. A lightweight Node.js server is used locally primarily to serve the frontend application and to configure necessary HTTP headers for WebAssembly module compatibility.

The application allows users to upload a video file, from which frames are extracted at a rate of 1 frame per second. These frames are then preprocessed to enhance image quality before being passed to an OCR engine. The extracted text is subsequently displayed to the user.

## 2. Core Technologies

*   **Frontend:**
    *   **React 19:** For building the user interface and managing application state.
    *   **Vite:** As the build tool and development server, providing a fast and modern frontend tooling experience.
    *   **Tailwind CSS:** For styling the user interface with a utility-first approach.
*   **Video Processing & OCR (Client-Side):**
    *   **FFmpeg.wasm (`@ffmpeg/ffmpeg`, `@ffmpeg/util`):** Enables video frame extraction directly in the browser by compiling FFmpeg to WebAssembly. It loads the video file into an in-memory filesystem and executes FFmpeg commands to generate image frames.
    *   **Jimp (`jimp`):** A JavaScript image processing library used for preprocessing extracted frames before OCR. Operations include converting to grayscale, adjusting contrast, and binarizing the image to improve text recognition accuracy.
    *   **Tesseract.js (`tesseract.js` v5.0.4 via CDN):** A JavaScript OCR engine, also based on WebAssembly, that recognizes text from the preprocessed image frames.
*   **Local Server/Launcher:**
    *   **Node.js with Express.js:** A simple server (`app/server.js`) responsible for:
        *   Serving the static build of the React frontend application.
        *   Setting Cross-Origin Opener Policy (COOP) and Cross-Origin Embedder Policy (COEP) headers. These are critical for `ffmpeg.wasm` (and potentially other WebAssembly modules) to operate correctly due to SharedArrayBuffer requirements.
        *   Automatically opening the application in the user's default web browser on launch.

## 3. Application Structure

The project is organized into two main directories:

*   **`/frontend`**: Contains the React application.
    *   **`/src`**:
        *   **`/components`**: (Implicit, standard React structure) Reusable UI elements. `App.jsx` currently serves as the main component.
        *   **`/services`**:
            *   `ffmpegService.js`: (Intended for FFmpeg logic, though currently direct in `App.jsx`) Manages loading FFmpeg.wasm and provides functions for frame extraction.
            *   `ocrService.js`: Manages Tesseract.js worker initialization (via CDN), image preprocessing with Jimp, and performs OCR on image data.
        *   `App.jsx`: The main React component orchestrating the UI, state management, and interactions between video input, FFmpeg, Jimp, and Tesseract.
        *   `main.jsx`: Entry point for the React application.
    *   `vite.config.js`: Configuration for Vite, including necessary settings for `ffmpeg.wasm` (e.g., `optimizeDeps.exclude`) and WebAssembly polyfills (`vite-plugin-node-polyfills`).
    *   `index.html`: Main HTML file where Tesseract.js is loaded via CDN.
*   **`/app`**: Contains the Node.js local server.
    *   `server.js`: The Express server script.
*   **Root Directory:**
    *   `package.json`: Manages project dependencies and scripts for both the root Node.js environment (for launching the server) and the frontend.
    *   `PLANNING.MD`: High-level project planning.
    *   `TASK.MD`: Detailed task breakdown and progress tracking.
    *   `ARCHITECTURE.MD`: This file.

## 4. Workflow / Data Flow

1.  **Application Launch:**
    *   User runs `npm start` (or equivalent).
    *   The Node.js server (`app/server.js`) starts, serves the React frontend build from `/frontend/dist`, and opens the application in the browser.
    *   Vite dev server (`npm run dev` in `/frontend`) provides Cross-Origin Isolation headers during development.
2.  **Initialization (Client-Side in `App.jsx`):**
    *   FFmpeg.wasm is loaded using its core files from a CDN (`@ffmpeg/core@0.11.0`). The `baseURL` is configured, and Vite's `optimizeDeps.exclude` prevents pre-bundling issues.
    *   Tesseract.js worker is initialized using the version loaded from CDN in `index.html`.
3.  **Video Upload:**
    *   User selects a video file (e.g., MP4, WebM) via the file input (drag & drop or click).
    *   The video file is loaded as a `File` object in `App.jsx`.
4.  **Frame Extraction & OCR (`App.jsx` -> `ffmpegRef` -> `ocrService.js`):**
    *   User clicks "Extract Frames & OCR".
    *   The video `File` object is written to FFmpeg.wasm's virtual filesystem using `await ffmpeg.writeFile()` and `fetchFile()`.
    *   An FFmpeg command (`ffmpeg.exec()`) is run to extract frames (e.g., 1 frame per second) and save them as PNG images (e.g., `output%03d.png`) in the virtual filesystem.
    *   The application iterates through the list of generated image files. For each frame:
        *   The image data is read from FFmpeg's virtual filesystem using `ffmpeg.readFile()`.
        *   The frame data (as an `ArrayBuffer`) is passed to `ocrService.js`'s `performOCR` function.
5.  **Image Preprocessing & OCR (`ocrService.js`):**
    *   `performOCR` converts the incoming `ArrayBuffer` to a Node.js `Buffer`.
    *   Jimp (`Jimp.read()`) reads the buffer.
    *   The Jimp image object is preprocessed:
        *   `image.grayscale()`
        *   `image.contrast()`
        *   `image.threshold()`
    *   The preprocessed image is converted back to a buffer (`image.getBufferAsync(Jimp.MIME_PNG)`).
    *   This buffer is passed to the Tesseract.js worker's `recognize()` method.
    *   The recognized text is returned.
6.  **Display Results (`App.jsx`):**
    *   The OCR text for each frame is received by `App.jsx`.
    *   Results (including the first extracted frame image and OCR text snippets) are displayed in the UI.
    *   Users can copy the consolidated text to the clipboard.

## 5. Key Architectural Considerations

*   **Purely Client-Side Processing:** The core functionality (video decoding, frame extraction, image processing, OCR) runs entirely in the browser. This enhances privacy (no data leaves the user's machine) and simplifies deployment for a local tool.
*   **WebAssembly Power:** Leveraging FFmpeg.wasm and Tesseract.js allows computationally intensive tasks to be performed efficiently on the client-side.
*   **Dependency Management:**
    *   Careful versioning and import strategies are needed for libraries like Jimp, especially when interacting with Vite's build and dev server optimizations.
    *   CDN usage for Tesseract.js was chosen to overcome npm package integration issues with Vite.
*   **HTTP Headers for WASM:** COOP and COEP headers are essential for `ffmpeg.wasm` due to its reliance on `SharedArrayBuffer`. These are configured in both the Node.js/Express server for the served build and the Vite dev server config.
*   **Error Handling & Fallbacks:** The `ocrService.js` includes a fallback to return the original image buffer if Jimp preprocessing fails, allowing OCR to still be attempted.
*   **Modular Services:** Logic for FFmpeg and OCR (including Jimp) is intended to be encapsulated in dedicated service files (`ffmpegService.js`, `ocrService.js`) for better organization, though some FFmpeg logic currently resides directly in `App.jsx` for testing and may be refactored.

## 6. Future Considerations (Potential Refinements)

*   **Refactor FFmpeg logic:** Move all FFmpeg operations from `App.jsx` into `ffmpegService.js` for better separation of concerns.
*   **Web Workers for Jimp:** If Jimp preprocessing becomes a bottleneck for UI responsiveness, consider offloading it to a separate Web Worker.
*   **Configuration Options:** Allow users to configure frame extraction rates or select specific preprocessing steps. 
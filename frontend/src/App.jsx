import React, { useState, useRef, useEffect } from 'react';
// import { loadFFmpeg, extractFrames as extractFramesFFmpeg } from './services/ffmpegService'; // Temporarily disable service
import { FFmpeg } from '@ffmpeg/ffmpeg'; // Import FFmpeg directly for test
import { fetchFile } from '@ffmpeg/util'; // <-- ADDED THIS IMPORT
import { getTesseractWorker, performOCR, terminateTesseractWorker, isTesseractReady as checkTesseractReady } from './services/ocrService';

const FFMPEG_CORE_CDN_PATH = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/';

function App() {
  const [selectedVideoName, setSelectedVideoName] = useState(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setDragging] = useState(false);
  const [videoFile, setVideoFile] = useState(null);

  // FFmpeg state
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState([]);
  const [extractionError, setExtractionError] = useState(null);
  const [extractionLoading, setExtractionLoading] = useState(false);
  const [firstFrameSrc, setFirstFrameSrc] = useState(null);
  const [ffmpegInitializing, setFfmpegInitializing] = useState(false);

  // Tesseract state
  const [tesseractLoading, setTesseractLoading] = useState(false);
  const [tesseractReady, setTesseractReady] = useState(false);
  const [ocrResults, setOcrResults] = useState([]);
  const [ocrError, setOcrError] = useState(null);
  const [ocrInProgress, setOcrInProgress] = useState(false);
  const [tesseractInitializing, setTesseractInitializing] = useState(false);

  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const ffmpegRef = useRef(null); // Will be set by our test

  useEffect(() => {
    let isMounted = true;

    const directFFmpegLoadTest = async () => {
      if (ffmpegRef.current || ffmpegInitializing || ffmpegLoaded) return;
      console.log('[App.jsx Direct Test] Attempting to initialize FFmpeg...');
      setFfmpegInitializing(true);
      setFfmpegLoading(true);
      const ffmpeg = new FFmpeg({
        baseURL: FFMPEG_CORE_CDN_PATH,
        logger: ({ type, message }) => console.log(`[App.jsx FFmpeg CORE ${type}]: ${message}`),
        log: true
      });
      try {
        console.log(`[App.jsx Direct Test] Calling ffmpeg.load()... (baseURL: ${FFMPEG_CORE_CDN_PATH})`);
        await ffmpeg.load();
        if (isMounted) {
          console.log('[App.jsx Direct Test] ffmpeg.load() completed successfully.');
          ffmpegRef.current = ffmpeg; // Store the instance
          setFfmpegLoaded(true);
        }
      } catch (error) {
        if (isMounted) {
          console.error('[App.jsx Direct Test] Error during ffmpeg.load():', error);
          setFfmpegLoaded(false);
        }
      } finally {
        if (isMounted) {
          setFfmpegInitializing(false);
          setFfmpegLoading(false);
        }
      }
    };

    const initTesseractEffect = async () => {
      if (checkTesseractReady() || tesseractInitializing || tesseractReady) return;
      
      console.log('App.jsx: Attempting to initialize Tesseract...');
      setTesseractInitializing(true);
      setTesseractLoading(true);
      try {
        const worker = await getTesseractWorker();
        if (isMounted) {
          if (worker && checkTesseractReady()) {
            setTesseractReady(true);
            console.log('Tesseract initialized successfully via getTesseractWorker from App.jsx.');
          } else {
            setTesseractReady(false);
            console.error('Tesseract failed to initialize via getTesseractWorker from App.jsx. Worker:', worker, 'IsReady:', checkTesseractReady());
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('Failed to initialize Tesseract via getTesseractWorker from App.jsx:', error);
          setTesseractReady(false);
        }
      } finally {
        if (isMounted) {
          setTesseractInitializing(false);
          setTesseractLoading(false);
        }
      }
    };

    directFFmpegLoadTest(); // Call the direct test
    initTesseractEffect();

    return () => {
      isMounted = false;
      console.log('App component unmounting. Attempting to terminate Tesseract worker.');
      terminateTesseractWorker();
      // TODO: Add FFmpeg instance termination if ffmpeg.terminate() exists and is needed
      // if (ffmpegRef.current && ffmpegRef.current.loaded) {
      //   // ffmpegRef.current.terminate(); // or similar method if available
      // }
    };
  }, []);

  useEffect(() => {
    if (extractedFrames.length > 0) {
      const objectUrl = URL.createObjectURL(extractedFrames[0]);
      setFirstFrameSrc(objectUrl);
      console.log('Displaying first frame:', objectUrl);

      return () => {
        console.log('Revoking first frame object URL:', objectUrl);
        URL.revokeObjectURL(objectUrl);
        setFirstFrameSrc(null);
      };
    }
  }, [extractedFrames]);

  const cleanupVideoSrc = () => {
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
      setVideoSrc(null);
    }
    setVideoFile(null);
    setExtractedFrames([]);
    setExtractionError(null);
    setOcrResults([]);
    setOcrError(null);
  };

  const processFile = (file) => {
    console.log('[TEST_DEBUG] processFile called with:', file); 
    if (!file) {
        console.log('[TEST_DEBUG] processFile: file is null or undefined. Cleaning up.');
        cleanupVideoSrc(); 
        setSelectedVideoName(null);
        return;
    }

    cleanupVideoSrc(); 
    console.log('[TEST_DEBUG] file.type is:', file.type); 
    if (file.type === 'video/mp4' || file.type === 'video/webm') {
        console.log('[TEST_DEBUG] Valid file type branch taken.'); 
        const videoURL = URL.createObjectURL(file);
        setVideoSrc(videoURL);
        setSelectedVideoName(file.name);
        setVideoFile(file);
        setExtractedFrames([]);
        setExtractionError(null);
        setOcrResults([]);
        setOcrError(null);
        setIsPlaying(false); 
        console.log('Selected video:', file);
    } else { 
        console.log('[TEST_DEBUG] Invalid file type branch taken. Alerting now.'); 
        alert('Invalid file type. Please select an MP4 or WebM video.');
        setSelectedVideoName(null);
    }
  };

  useEffect(() => {
    return () => {
      cleanupVideoSrc();
    };
  }, []); 

  const handleFileChange = (event) => {
    console.log('[TEST_DEBUG] TOP OF handleFileChange. EVENT RECEIVED.');
    console.log('[TEST_DEBUG] handleFileChange triggered. event.target.files:', event.target.files);
    if (event.target.files && event.target.files.length > 0) {
        processFile(event.target.files[0]);
    } else {
        console.log('[TEST_DEBUG] handleFileChange: No files found on event.target.files.');
        processFile(null);
    }
  };

  const handleLoadVideoClick = () => {
    fileInputRef.current.click();
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    console.log('[TEST_DEBUG] handleDrop triggered. event.dataTransfer.files:', event.dataTransfer.files);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      processFile(event.dataTransfer.files[0]);
    } else {
      console.log('[TEST_DEBUG] handleDrop: No files found on event.dataTransfer.files.');
      processFile(null);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoPlay = () => setIsPlaying(true);
  const handleVideoPause = () => setIsPlaying(false);

  const handleExtractFrames = async () => {
    if (!videoFile || !ffmpegRef.current || !ffmpegRef.current.loaded) {
      alert('Video not loaded or FFmpeg not ready (App.jsx direct test).');
      return;
    }
    const ffmpeg = ffmpegRef.current; // Use the direct instance

    if (!tesseractReady) {
      alert('Tesseract OCR not ready. Please wait.');
      return;
    }

    setExtractionLoading(true);
    setOcrInProgress(true);
    setExtractedFrames([]);
    setOcrResults([]);
    setExtractionError(null);
    setOcrError(null);
    setFirstFrameSrc(null); // Clear previous first frame

    try {
      const { name: videoFileName } = videoFile;
      console.log(`[App.jsx] Writing ${videoFileName} to FFmpeg's FS...`);
      await ffmpeg.writeFile(videoFileName, await fetchFile(videoFile));
      console.log(`[App.jsx] ${videoFileName} written. Executing FFmpeg command...`);

      // For now, extract only 1 frame (e.g., at the 1-second mark, or first frame)
      // To extract one frame at the beginning:
      // await ffmpeg.exec(['-i', videoFileName, '-ss', '00:00:00', '-frames:v', '1', 'output.png']);
      // To extract one frame per second (as an example, will take first N for N seconds if N is small)
      await ffmpeg.exec(['-i', videoFileName, '-vf', 'fps=1', 'output%03d.png']);
      console.log('[App.jsx] FFmpeg command executed.');

      const extractedImageBlobs = [];
      const files = await ffmpeg.listDir('.');
      console.log('[App.jsx] Files in FFmpeg FS after exec:', files);

      for (const f of files) {
        if (f.name.startsWith('output') && f.name.endsWith('.png')) {
          console.log(`[App.jsx] Reading extracted frame: ${f.name}`);
          const data = await ffmpeg.readFile(f.name);
          extractedImageBlobs.push(new Blob([data.buffer], { type: 'image/png' }));
          console.log(`[App.jsx] Deleting ${f.name} from FFmpeg FS.`);
          await ffmpeg.deleteFile(f.name);
        }
      }
      
      console.log(`[App.jsx] Deleting ${videoFileName} from FFmpeg FS.`);
      await ffmpeg.deleteFile(videoFileName);

      setExtractedFrames(extractedImageBlobs);
      console.log('[App.jsx] Extracted frames:', extractedImageBlobs);

      if (extractedImageBlobs.length > 0) {
        const results = [];
        for (let i = 0; i < extractedImageBlobs.length; i++) {
          console.log(`[App.jsx] Performing OCR for frame ${i + 1}/${extractedImageBlobs.length}`);
          try {
            const text = await performOCR(extractedImageBlobs[i]);
            results.push({ frameNumber: i + 1, imageBlob: extractedImageBlobs[i], text });
            setOcrResults([...results]); 
          } catch (ocrErr) {
            console.error(`[App.jsx] Error during OCR for frame ${i + 1}:`, ocrErr);
            results.push({ frameNumber: i + 1, imageBlob: extractedImageBlobs[i], text: '[OCR Error]' });
            setOcrResults([...results]); 
            setOcrError(`Error during OCR for frame ${i + 1}: ${ocrErr.message}`);
          }
        }
        console.log('[App.jsx] All OCR processing complete.', results);
      } else {
        console.log('[App.jsx] No frames extracted to perform OCR on.');
        setExtractionError('No frames were extracted by FFmpeg.');
      }

    } catch (error) {
      console.error('[App.jsx] Error during frame extraction or OCR process:', error);
      setExtractionError(error.message || 'Failed to extract frames or perform OCR.');
      setOcrResults([]); // Clear any partial OCR results
    }
    setExtractionLoading(false);
    setOcrInProgress(false);
  };

  const handleExportText = () => {
    if (ocrResults.length === 0) {
      alert('No OCR text to export.');
      return;
    }

    const allText = ocrResults.map(result => `Frame ${result.frameNumber}:\n${result.text}`).join('\n\n---\n\n');
    navigator.clipboard.writeText(allText)
      .then(() => {
        alert('OCR text copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy OCR text to clipboard. See console for details.');
      });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-800 text-white">
      <header className="bg-gray-900 p-4 shadow-md">
        <h1 className="text-2xl font-bold text-center">FrameRead</h1>
      </header>

      <main className="flex flex-1 p-4 overflow-hidden">
        <div className="flex-1 flex flex-col mr-2 bg-gray-700 p-4 rounded shadow">
          <div 
            className={`aspect-video mb-4 rounded flex flex-col items-center justify-center text-gray-400 transition-colors duration-200 ease-in-out ${isDragging ? 'bg-gray-600 border-2 border-dashed border-blue-400' : videoSrc ? 'bg-black' : 'bg-gray-900 border-2 border-transparent'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="drop-zone"
          >
            {videoSrc ? (
              <video 
                ref={videoRef} 
                src={videoSrc} 
                className="w-full h-full rounded" 
                onPlay={handleVideoPlay}
                onPause={handleVideoPause}
                data-testid="video-player-testid"
              />
            ) : (
              <div className="text-center p-4">
                <p>Drag & Drop Video File Here <br/>or</p>
                <button 
                  onClick={handleLoadVideoClick} 
                  className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                >
                  Click to Select
                </button>
              </div>
            )}
          </div>
          <div className="mt-auto flex items-center">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="video/mp4,video/webm" 
              style={{ display: 'none' }} 
              data-testid="file-input-testid"
            />
            {videoSrc && (
              <button 
                onClick={handlePlayPause} 
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                disabled={!videoSrc}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
            )}
            <button 
              onClick={handleLoadVideoClick} 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-2"
            >
              {selectedVideoName ? `Loaded: ${selectedVideoName.substring(0,15)}${selectedVideoName.length > 15 ? '...' : ''}` : 'Load Video'}
            </button>
            {videoSrc && ffmpegLoaded && (
              <button
                onClick={handleExtractFrames}
                className="mt-2 ml-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
                disabled={extractionLoading || ffmpegLoading || ocrInProgress}
              >
                {extractionLoading ? 'Extracting Frames...' : (ocrInProgress ? 'OCR in Progress...' : 'Extract Frames & OCR')}
              </button>
            )}
            {!ffmpegLoaded && videoSrc && (
              <p className="text-sm text-yellow-500 mt-2">
                {ffmpegLoading ? 'FFmpeg is loading...' : (ffmpegRef.current ? 'FFmpeg ready.' : 'FFmpeg not loaded. Check console.')}
              </p>
            )}
            {!tesseractReady && videoSrc && ffmpegLoaded && (
               <p className="text-sm text-yellow-500 mt-2">
                {tesseractLoading ? 'Tesseract OCR is loading...' : 'Tesseract OCR not ready. Check console.'}
              </p>
            )}
          </div>
        </div>

        <div className="w-1/3 ml-2 bg-gray-700 p-4 rounded shadow flex flex-col">
          <h2 className="text-xl font-semibold mb-2 border-b border-gray-600 pb-2">OCR Results</h2>
          <div className="flex-1 overflow-y-auto">
            <div className="mt-4 p-4 border border-gray-600 rounded bg-gray-800 min-h-[100px]">
              <h3 className="text-lg font-semibold mb-2">OCR Results / Logs</h3>
              {selectedVideoName && <p className="text-sm">Loaded: {selectedVideoName}</p>}
              {extractedFrames.length > 0 && (
                <p className="text-sm text-green-400">Extracted {extractedFrames.length} frames.</p>
              )}
              {firstFrameSrc && !ocrResults.length && (
                <div className="mt-2">
                  <p className="text-sm">First extracted frame (pre-OCR):</p>
                  <img src={firstFrameSrc} alt="First extracted frame" className="max-w-full h-auto border border-gray-500" />
                </div>
              )}
              {ocrResults.length > 0 && ocrResults.map((result, index) => (
                <div key={index} className="mt-2 p-2 border border-gray-500 rounded bg-gray-700">
                  <p className="text-sm font-semibold">Frame {result.frameNumber}:</p>
                  <p className="text-xs whitespace-pre-wrap">{result.text}</p>
                </div>
              ))}
              {extractionError && (
                <p className="text-sm text-red-400">Frame Extraction Error: {extractionError}</p>
              )}
              {ocrError && !extractionError && (
                <p className="text-sm text-red-400">OCR Error: {ocrError}</p>
              )}
            </div>
          </div>
          <div className="mt-auto">
            <button 
              onClick={handleExportText}
              className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded w-full"
              disabled={ocrResults.length === 0 || ocrInProgress || extractionLoading}
            >
              Export Text
            </button>
          </div>
        </div>
      </main>

      <footer className="bg-gray-900 p-2 text-center text-sm text-gray-400">
        FrameRead MVP - Runs 100% Locally
      </footer>
    </div>
  );
}

export default App;

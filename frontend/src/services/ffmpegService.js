import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpegInstance = null;
let ffmpegLoadingPromise = null; // Added to manage concurrent load attempts

// Define the baseURL for @ffmpeg/core files - trying version 0.11.0
const FFMPEG_CORE_BASE_URL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/esm/';

export const loadFFmpeg = async () => {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    console.log('[FFmpegService] FFmpeg already loaded, returning existing instance.');
    return ffmpegInstance;
  }

  if (ffmpegLoadingPromise) {
    console.log('[FFmpegService] FFmpeg loading is already in progress, returning existing promise.');
    return ffmpegLoadingPromise;
  }

  console.log('[FFmpegService] Starting FFmpeg initialization / new load attempt...');
  const newFFmpeg = new FFmpeg({
    baseURL: FFMPEG_CORE_BASE_URL,
    logger: ({ type, message }) => console.log(`[FFmpeg CORE ${type}]: ${message}`),
    log: true // General flag to enable logging if supported by this version
  }); 
  
  // newFFmpeg.on('log', ({ message }) => { // .on('log') is for messages from FFmpeg commands, not loading
  //   console.log('FFmpeg instance command log:', message);
  // });

  // Create the loading promise
  ffmpegLoadingPromise = (async () => {
    try {
      console.log(`[FFmpegService] Calling ffmpeg.load()... (baseURL: ${FFMPEG_CORE_BASE_URL})`);
      await newFFmpeg.load(); // This is the core, potentially long operation
      console.log('[FFmpegService] ffmpeg.load() completed successfully.');
      ffmpegInstance = newFFmpeg; 
      // ffmpegLoadingPromise = null; // Resetting here might be problematic if another call came in *just* before resolution
                                  // Better to let the initial check `if (ffmpegInstance && ffmpegInstance.loaded)` handle future calls
      return newFFmpeg;
    } catch (error) {
      console.error('[FFmpegService] Error during ffmpeg.load():', error);
      ffmpegLoadingPromise = null; // Allow retrying by clearing the promise on error
      throw error;
    }
  })();

  return ffmpegLoadingPromise;
};

export const isFFmpegLoaded = () => {
  return ffmpegInstance !== null && ffmpegInstance.loaded;
};

// Modified to accept ffmpeg as an argument
export const extractFrames = async (ffmpeg, videoFile, intervalSeconds = 1) => { 
  if (!ffmpeg || !ffmpeg.loaded) { // Check the passed instance
    throw new Error('FFmpeg instance is not provided or not loaded.');
  }
  if (!videoFile) {
    throw new Error('No video file provided for frame extraction.');
  }

  console.log(`Starting frame extraction for ${videoFile.name} at ${intervalSeconds}s intervals using provided FFmpeg instance.`);

  try {
    const data = await fetchFile(videoFile);
    // Use the passed ffmpeg instance and new API
    await ffmpeg.writeFile(videoFile.name, data);

    // Use new exec API
    await ffmpeg.exec(['-i', videoFile.name, '-vf', `fps=1/${intervalSeconds}`, 'frame_%03d.png']);

    const frames = [];
    let i = 1;
    while (true) {
      const frameName = `frame_${String(i).padStart(3, '0')}.png`;
      try {
        // Use new readFile API
        const frameData = await ffmpeg.readFile(frameName);
        frames.push(new Blob([frameData.buffer], { type: 'image/png' }));
        // Tentatively use new deleteFile API, fallback to FS('unlink') if this fails
        await ffmpeg.deleteFile(frameName); 
        i++;
      } catch (e) {
        break;
      }
    }
    
    console.log(`Extracted ${frames.length} frames.`);
    // Tentatively use new deleteFile API
    await ffmpeg.deleteFile(videoFile.name); 
    return frames;
  } catch (error) {
    console.error('Error during frame extraction:', error);
    try {
        // Tentatively use new deleteFile API
        await ffmpeg.deleteFile(videoFile.name);
    } catch (cleanupError) {
        // console.warn('Could not cleanup video file from FS on error:', cleanupError);
    }
    throw error;
  }
}; 
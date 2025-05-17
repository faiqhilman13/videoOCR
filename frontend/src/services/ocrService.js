// import { Buffer } from 'buffer/'; // Handled by vite-plugin-node-polyfills
// window.Buffer = Buffer;       // Handled by vite-plugin-node-polyfills

// import * as Tesseract from 'tesseract.js'; // Try namespace import
// import * as Tesseract from 'tesseract.js'; // Old namespace import
// import { Jimp } from 'jimp'; // Old import, remove or comment out
// import '@jimp/types'; // Old import
// import '@jimp/plugins'; // Old import

// New Jimp setup using @jimp/custom
// import JimpImport from 'jimp'; // Old incorrect import
// import { Jimp } from 'jimp'; // Commenting out this named import
import Jimp from 'jimp'; // Reverting to default import
// import types from '@jimp/types'; // Old incorrect import
// import * as pluginColor from '@jimp/plugin-color'; // Use namespace import
// import * as pluginThreshold from '@jimp/plugin-threshold'; // Use namespace import

// Import specific type format plugins using namespace imports for consistency
// import * as jpeg from '@jimp/jpeg';
// import * as png from '@jimp/png';
// import * as bmp from '@jimp/bmp';

// Configure a custom Jimp instance with only the necessary plugins and types
// const Jimp = configure({
//   types: [jpeg.default, png.default, bmp.default],
//   plugins: [pluginColor.default, pluginThreshold.default]
// }, JimpModule.Jimp); // Pass the named export Jimp from the JimpModule

// Access Tesseract via the global window object injected by the CDN script
const TesseractGlobal = window.Tesseract;

let worker = null;
let workerInitializing = false;
let tesseractReady = false;

// console.log('[ocrService] Imported Jimp object:', Jimp);

const initializeTesseract = async () => {
  if (worker && tesseractReady) {
    return worker;
  }
  if (workerInitializing) {
    return null; 
  }
  console.log('Initializing Tesseract.js worker...');
  workerInitializing = true;
  try {
    const newWorker = await TesseractGlobal.createWorker({
      // logger: m => console.log(m), // Logger removed due to DataCloneError
    });
    await newWorker.loadLanguage('eng');
    await newWorker.initialize('eng');
    worker = newWorker;
    tesseractReady = true;
    console.log('Tesseract.js worker initialized successfully.');
    return worker;
  } catch (error) {
    console.error('Error initializing Tesseract.js worker:', error);
    worker = null;
    tesseractReady = false;
    throw error; // Re-throw to be caught by App.jsx or other callers
  } finally {
    workerInitializing = false;
  }
};

const LogApp = (...args) => console.log('[OCR Service]', ...args);
const ErrApp = (...args) => console.error('[OCR Service]', ...args);

// Function to safely get the worker, ensuring it's ready
export const getTesseractWorker = async () => {
  LogApp('getTesseractWorker called. Worker present:', !!worker, 'Ready:', tesseractReady, 'Initializing:', workerInitializing);
  if (worker && tesseractReady) {
    LogApp('Returning existing ready worker.');
    return worker;
  }

  if (workerInitializing) {
    LogApp('Worker is already initializing. Waiting for it to complete...');
    // Simple busy-wait with a timeout, can be improved with a more robust promise queue
    let attempts = 0;
    while (workerInitializing && attempts < 100) { // Max 10 seconds wait
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    if (worker && tesseractReady) {
      LogApp('Worker finished initializing during wait.');
      return worker;
    }
    if (workerInitializing) {
      ErrApp('Worker still initializing after timeout. This should not happen.');
      return null; // Or throw error
    }
    // If it fell through, means worker became null or not ready during wait, re-initialize
  }

  if (!worker) {
    workerInitializing = true;
    tesseractReady = false;
    LogApp('Initializing Tesseract.js worker (CDN v5.0.4)...');
    if (!TesseractGlobal) {
      ErrApp('Tesseract.js not loaded from CDN. window.Tesseract is not defined.');
      workerInitializing = false;
      return null;
    }
    try {
      const newWorker = await TesseractGlobal.createWorker(); 
      LogApp('Tesseract worker created via CDN global.');
      await newWorker.loadLanguage('eng');
      LogApp('English language loaded for Tesseract.');
      await newWorker.initialize('eng');
      LogApp('Tesseract worker initialized with English.');
      worker = newWorker;
      tesseractReady = true;
      LogApp('Tesseract worker is ready (CDN v5.0.4).');
    } catch (error) {
      ErrApp('Error initializing Tesseract worker (CDN v5.0.4):', error);
      worker = null;
      tesseractReady = false;
    } finally {
      workerInitializing = false;
      LogApp('Worker initialization attempt finished.');
    }
  }
  return worker;
};

export const isTesseractReady = () => {
  return tesseractReady && worker !== null;
};

const preprocessImage = async (imageBuffer) => {
  console.log('Preprocessing image with default Jimp import...');
  try {
    // Ensure imageBuffer is a Node.js Buffer for Jimp.
    // imageBuffer is expected to be an ArrayBuffer from frame.arrayBuffer().
    const bufferForJimp = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);

    // Use the directly imported Jimp
    const image = await Jimp.read(bufferForJimp);
    console.log('Jimp image read successfully.');

    image.grayscale(); // Apply grayscale
    console.log('Grayscale applied.');

    image.contrast(0.5); // Increase contrast (value between -1 and +1)
    console.log('Contrast applied (0.5).');

    // Apply thresholding for binarization.
    // Pixels > threshold become 'max', pixels <= threshold become 0 (black).
    // autoGreyscale: false, as we've already grayscaled.
    image.threshold({ max: 255, threshold: 128, autoGreyscale: false });
    console.log('Threshold applied (max: 255, threshold: 128).');

    const processedImageBuffer = await image.getBufferAsync(Jimp.MIME_PNG); // Get buffer as PNG
    console.log('Image processed and buffer retrieved as PNG.');
    return processedImageBuffer;
  } catch (error) {
    console.error('Error during image preprocessing with Jimp:', error);
    // Fallback: return the original buffer if preprocessing fails
    return imageBuffer; // Return original ArrayBuffer
  }
};

export const performOCR = async (image) => {
  if (!isTesseractReady() || !worker) {
    // Try to initialize if not ready and not already initializing
    if (!workerInitializing) {
      console.log('Tesseract not ready, attempting to initialize...');
      await getTesseractWorker(); // Attempt to initialize
      if (!isTesseractReady() || !worker) {
        console.error('Tesseract worker not initialized or failed to initialize.');
        return 'Error: Tesseract worker not available.';
      }
    } else {
      console.error('Tesseract worker is initializing, please wait and try again.');
      return 'Error: Tesseract worker is initializing.';
    }
  }

  try {
    // console.log('Original image for OCR:', image);
    // Preprocess the image
    // 'image' here is a Blob from FFmpeg extraction.
    // Convert it to an ArrayBuffer for Jimp.
    const imageArrayBuffer = await image.arrayBuffer();
    const processedImageBuffer = await preprocessImage(imageArrayBuffer); // Pass ArrayBuffer

    // Tesseract.js can recognize an ArrayBuffer or Buffer directly.
    // The processedImageBuffer is a Node.js Buffer if Jimp succeeded, or the original ArrayBuffer on failure.
    // console.log('Performing OCR on processed image data.');
    const { data: { text } } = await worker.recognize(processedImageBuffer);
    // console.log('OCR result:', text);
    return text;
  } catch (error) {
    console.error('Error performing OCR:', error);
    // Check if the error is due to Tesseract worker being terminated or busy
    if (error.message && (error.message.includes('terminated') || error.message.includes('busy'))) {
        // Attempt to reinitialize or wait
        console.warn('Tesseract worker was busy or terminated, attempting to re-establish.');
        worker = null; // Reset worker
        tesseractReady = false;
        await getTesseractWorker(); // Try to get a new worker
        if(isTesseractReady()){
            return performOCR(image); // Retry OCR with the new worker
        } else {
            return 'Error: Tesseract worker issue, failed to recover.';
        }
    }
    return `Error during OCR: ${error.message}`;
  }
};

export const terminateTesseractWorker = async () => {
  if (worker) {
    console.log('Terminating Tesseract.js worker...');
    await worker.terminate();
    worker = null;
    tesseractReady = false;
    workerInitializing = false;
    console.log('Tesseract.js worker terminated.');
  }
};

// Removed initializeOcrService as we are back to simpler Tesseract init for now
// App.jsx will need to be adjusted if it was using initializeOcrService

export { initializeTesseract }; // Exporting it so App.jsx can call it on mount proactively if desired. 
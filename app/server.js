// CURSOR: This file should only handle route wiring, not business logic.
// All logic must be called from services/ or utils/

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

// Replicate __dirname functionality for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to set Cross-Origin Isolation headers
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Path to the frontend build directory
// Assumes server.js is in /app and frontend is in /frontend relative to project root
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');

// Serve static files from the React app
app.use(express.static(frontendBuildPath));

// Middleware to parse JSON bodies
app.use(express.json());

// API routes (placeholder)
app.get('/api/health', (req, res) => {
  res.json({ status: 'success', message: 'Server is healthy' });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'));
  // res.send('Wildcard route hit'); // Simple text response
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  open(`http://localhost:${PORT}`);
}); 
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import App from './App';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mocking browser APIs
vi.stubGlobal('URL', {
  createObjectURL: vi.fn(() => 'mock-object-url'),
  revokeObjectURL: vi.fn(),
});
vi.stubGlobal('alert', vi.fn());


describe('App component - FrameRead', () => {
  // Mock HTMLMediaElement play and pause methods
  let playMock, pauseMock;

  beforeEach(() => {
    playMock = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
    pauseMock = vi.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {}); 
    
    // Reset all mocks before each test if not handled by vi.clearAllMocks or specific clear calls
    vi.clearAllMocks(); 
    // Re-initialize createObjectURL and revokeObjectURL mocks for each test as they are cleared by clearAllMocks
    // This is important if they are expected to be called multiple times across tests or within a test
    global.URL.createObjectURL = vi.fn(() => 'mock-object-url');
    global.URL.revokeObjectURL = vi.fn();
    global.alert = vi.fn();
  });

  afterEach(() => {
    // Restore original implementations
    playMock.mockRestore();
    pauseMock.mockRestore();
  });

  // --- Task 2.1: Video Upload Component Tests ---
  describe('Video Upload (File Picker)', () => {
    it('allows selecting a valid MP4 video file via file picker', async () => {
      render(<App />);
      const user = userEvent.setup();
      const fileInput = screen.getByTestId('file-input-testid');
      const testFile = new File(['dummy video content'], 'test-video.mp4', { type: 'video/mp4' });

      await user.upload(fileInput, testFile);

      expect(await screen.findByText(/Loaded: test-video.mp4/i, {}, { timeout: 2000 })).toBeInTheDocument();
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(testFile);
      expect(global.alert).not.toHaveBeenCalled();
    });

    it('shows an alert for an invalid file type via file picker (using fireEvent.change)', async () => {
      render(<App />);
      const fileInput = screen.getByTestId('file-input-testid');
      const invalidFile = new File(['dummy text content'], 'test-text.txt', { type: 'text/plain' });

      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(global.alert).toHaveBeenCalledWith('Invalid file type. Please select an MP4 or WebM video.');
      });
      expect(screen.queryByText(/Loaded: test-text.txt/i)).not.toBeInTheDocument();
      expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('Video Upload (Drag & Drop)', () => {
    const simulateDrop = (dropZone, file) => {
        fireEvent.dragEnter(dropZone, { dataTransfer: { files: [file], types: ['Files'] } });
        fireEvent.dragOver(dropZone, { dataTransfer: { files: [file], types: ['Files'] } });
        fireEvent.drop(dropZone, { dataTransfer: { files: [file], types: ['Files'] } });
    };
    
    it('allows dragging and dropping a valid WebM video file', async () => {
      render(<App />);
      const dropZoneContainer = screen.getByText(/Drag & Drop Video File Here/i).parentElement;
      const testFile = new File(['dummy video content'], 'test-video.webm', { type: 'video/webm' });

      simulateDrop(dropZoneContainer, testFile);
      
      expect(await screen.findByText(/Loaded: test-video.webm/i, {}, {timeout: 2000})).toBeInTheDocument();
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(testFile);
      expect(global.alert).not.toHaveBeenCalled();
    });

    it('shows an alert for an invalid file type via drag and drop', async () => {
      render(<App />);
      const dropZoneContainer = screen.getByText(/Drag & Drop Video File Here/i).parentElement;
      const invalidFile = new File(['dummy image content'], 'test-image.jpg', { type: 'image/jpeg' });

      simulateDrop(dropZoneContainer, invalidFile);

      expect(global.alert).toHaveBeenCalledWith('Invalid file type. Please select an MP4 or WebM video.');
      expect(screen.queryByText(/Loaded: test-image.jpg/i)).not.toBeInTheDocument();
      expect(global.URL.createObjectURL).not.toHaveBeenCalled();
    });
  });

  // --- Task 2.2: Video Playback Component Tests ---
  describe('Video Playback', () => {
    it('sets video src when a valid file is selected and displays Play button', async () => {
      render(<App />);
      const user = userEvent.setup();
      const fileInput = screen.getByTestId('file-input-testid');
      const testFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
      
      await user.upload(fileInput, testFile);
      
      const videoElement = await screen.findByTestId('video-player-testid');
      expect(videoElement.src).toContain('mock-object-url');
      
      const playButton = await screen.findByRole('button', { name: /Play/i });
      expect(playButton).toBeInTheDocument();
    });

    it('calls video.play() and updates button to "Pause" when Play is clicked', async () => {
      render(<App />);
      const user = userEvent.setup();
      const fileInput = screen.getByTestId('file-input-testid');
      const testFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
      await user.upload(fileInput, testFile);

      const playButton = await screen.findByRole('button', { name: /Play/i });
      await user.click(playButton);
      
      expect(playMock).toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: /Pause/i })).toBeInTheDocument();
    });

    it('calls video.pause() and updates button to "Play" when Pause is clicked', async () => {
      render(<App />);
      const user = userEvent.setup();
      const fileInput = screen.getByTestId('file-input-testid');
      const testFile = new File(['video'], 'video.mp4', { type: 'video/mp4' });
      await user.upload(fileInput, testFile);

      // First click to play
      const playButton = await screen.findByRole('button', { name: /Play/i });
      await user.click(playButton);
      
      // Second click to pause
      const pauseButton = await screen.findByRole('button', { name: /Pause/i });
      await user.click(pauseButton);

      expect(pauseMock).toHaveBeenCalled();
      expect(await screen.findByRole('button', { name: /Play/i })).toBeInTheDocument();
    });
  });
}); 
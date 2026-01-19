import { useState } from 'react';
import ImageUpload from './ImageUpload';
import { uploadFiles, submitNanoBananaRequest } from '../services/falService';

export default function NanoBananaEditor() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [enableLogs, setEnableLogs] = useState(true);
  const [numImages, setNumImages] = useState(1);
  const [aspectRatio, setAspectRatio] = useState('auto');
  const [resolution, setResolution] = useState('1K');
  const [outputFormat, setOutputFormat] = useState('png');
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState([]);
  const [result, setResult] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus('');
    setLogs([]);
    setResult(null);

    if (!prompt.trim()) {
      setStatus('ERROR: Please enter an editing prompt');
      return;
    }

    if (images.length === 0) {
      setStatus('ERROR: Please upload at least one reference image');
      return;
    }

    setIsProcessing(true);

    try {
      setStatus('Uploading images...');
      if (enableLogs) addLog('Starting image uploads...');

      const imageFiles = images.map((img) => img.file);
      const imageUrls = await uploadFiles(imageFiles, (current, total) => {
        setUploadProgress({ current, total });
        if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
      });

      if (enableLogs) addLog('All images uploaded successfully');
      setUploadProgress(null);

      setStatus('Submitting edit request...');
      if (enableLogs) addLog('Submitting request to fal.ai Nano Banana...');

      const response = await submitNanoBananaRequest({
        prompt: prompt.trim(),
        imageUrls,
        logs: enableLogs,
        numImages,
        aspectRatio,
        resolution,
        outputFormat,
        enableWebSearch,
        onQueueUpdate: (update) => {
          setStatus(`Status: ${update.status}`);

          if (update.status === 'IN_QUEUE') {
            const position = update.position || 'unknown';
            if (enableLogs) addLog(`Position in queue: ${position}`);
          }

          if (update.status === 'IN_PROGRESS' && update.logs) {
            update.logs.forEach((log) => {
              addLog(log.message);
            });
          }
        }
      });

      setStatus('SUCCESS: Image edit completed!');
      if (enableLogs) addLog('Request completed successfully!');
      if (enableLogs && response.requestId) {
        addLog(`Request ID: ${response.requestId}`);
      }

      setResult(response.data);
    } catch (error) {
      console.error('Error:', error);
      setStatus(`ERROR: ${error.message}`);
      if (enableLogs) addLog(`ERROR: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="form-section">
          <div className="form-group">
            <label htmlFor="prompt-nano">Editing Prompt</label>
            <textarea
              id="prompt-nano"
              rows="4"
              placeholder='Describe the edit you want to make (e.g., "Make the sky more dramatic")'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
            />
            <small>Describe the changes you want to make to the image</small>
          </div>

          <ImageUpload onImagesChange={setImages} maxImages={10} />

          <div className="form-group">
            <label htmlFor="numImages">Number of Images</label>
            <select
              id="numImages"
              value={numImages}
              onChange={(e) => setNumImages(Number(e.target.value))}
              disabled={isProcessing}
            >
              <option value={1}>1 Image</option>
              <option value={2}>2 Images</option>
              <option value={3}>3 Images</option>
              <option value={4}>4 Images</option>
            </select>
            <small>Generate multiple variations (1-4 images)</small>
          </div>

          <div className="form-group">
            <label htmlFor="aspectRatio">Aspect Ratio</label>
            <select
              id="aspectRatio"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              disabled={isProcessing}
            >
              <option value="auto">Auto</option>
              <option value="21:9">21:9 (Ultrawide)</option>
              <option value="16:9">16:9 (Widescreen)</option>
              <option value="3:2">3:2</option>
              <option value="4:3">4:3</option>
              <option value="5:4">5:4</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="4:5">4:5</option>
              <option value="3:4">3:4</option>
              <option value="2:3">2:3</option>
              <option value="9:16">9:16 (Portrait)</option>
            </select>
            <small>The aspect ratio of the generated image</small>
          </div>

          <div className="form-group">
            <label htmlFor="resolution">Resolution</label>
            <select
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={isProcessing}
            >
              <option value="1K">1K (Standard)</option>
              <option value="2K">2K (High Quality)</option>
              <option value="4K">4K (Ultra HD)</option>
            </select>
            <small>Higher resolution means better quality but slower generation</small>
          </div>

          <div className="form-group">
            <label htmlFor="outputFormat">Output Format</label>
            <select
              id="outputFormat"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              disabled={isProcessing}
            >
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
            </select>
            <small>The file format of the generated image</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={enableWebSearch}
                onChange={(e) => setEnableWebSearch(e.target.checked)}
                disabled={isProcessing}
              />
              Enable web search
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={enableLogs}
                onChange={(e) => setEnableLogs(e.target.checked)}
                disabled={isProcessing}
              />
              Enable progress logs
            </label>
          </div>

          <button type="submit" className="btn-primary" disabled={isProcessing}>
            {isProcessing ? 'Processing...' : 'Generate Edited Image'}
          </button>
        </div>
      </form>

      {uploadProgress && (
        <div className="status-section">
          <h2>Upload Progress</h2>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
            />
          </div>
          <p>
            Uploading images: {uploadProgress.current} / {uploadProgress.total}
          </p>
        </div>
      )}

      {status && (
        <div className={`status-section ${status.startsWith('ERROR') ? 'error' : status.startsWith('SUCCESS') ? 'success' : ''}`}>
          <h2>Status</h2>
          <p>{status}</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="logs-section">
          <h2>Progress Logs</h2>
          <div className="logs-content">
            {logs.map((log, index) => (
              <div key={index} className="log-entry">
                <span className="log-timestamp">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="result-section">
          <h2>Result</h2>
          {result.images && result.images.length > 0 && (
            <div className="result-grid">
              {result.images.map((image, index) => (
                <div key={index} className="result-card">
                  <h3>Image {index + 1}</h3>
                  <img src={image.url} alt={`Generated ${index + 1}`} className="result-image" />
                  <div className="result-info">
                    <p>
                      <strong>URL:</strong>{' '}
                      <a href={image.url} target="_blank" rel="noopener noreferrer">
                        View full size
                      </a>
                    </p>
                    {image.width && <p><strong>Width:</strong> {image.width}px</p>}
                    {image.height && <p><strong>Height:</strong> {image.height}px</p>}
                    {image.content_type && <p><strong>Type:</strong> {image.content_type}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.seed !== undefined && (
            <div className="result-meta">
              <p><strong>Seed:</strong> {result.seed}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

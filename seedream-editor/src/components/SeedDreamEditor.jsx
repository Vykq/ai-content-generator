import { useState } from 'react';
import ImageUpload from './ImageUpload';
import { uploadFiles, submitEditRequest } from '../services/falService';

export default function SeedDreamEditor() {
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState([]);
  const [enableLogs, setEnableLogs] = useState(true);
  const [enableSafetyChecker, setEnableSafetyChecker] = useState(true);
  const [imageSize, setImageSize] = useState('square_hd');
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
      if (enableLogs) addLog('Submitting request to fal.ai SeeD Dream v4.5...');

      const response = await submitEditRequest({
        prompt: prompt.trim(),
        imageUrls,
        logs: enableLogs,
        enableSafetyChecker,
        imageSize,
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
            <label htmlFor="prompt">Editing Prompt</label>
            <textarea
              id="prompt"
              rows="4"
              placeholder='Describe the edit you want to make (e.g., "Replace the product in Figure 1 with that in Figure 2")'
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isProcessing}
            />
            <small>Reference images as Figure 1, Figure 2, etc. in your prompt</small>
          </div>

          <ImageUpload onImagesChange={setImages} maxImages={10} />

          <div className="form-group">
            <label htmlFor="imageSize">Image Size</label>
            <select
              id="imageSize"
              value={imageSize}
              onChange={(e) => setImageSize(e.target.value)}
              disabled={isProcessing}
            >
              <option value="square_hd">Square HD</option>
              <option value="square">Square</option>
              <option value="portrait_4_3">Portrait 4:3</option>
              <option value="portrait_16_9">Portrait 16:9</option>
              <option value="landscape_4_3">Landscape 4:3</option>
              <option value="landscape_16_9">Landscape 16:9</option>
              <option value="auto_2K">Auto 2K</option>
              <option value="auto_4K">Auto 4K</option>
            </select>
            <small>The size of the generated image. Width and height must be between 1920 and 4096.</small>
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={enableSafetyChecker}
                onChange={(e) => setEnableSafetyChecker(e.target.checked)}
                disabled={isProcessing}
              />
              Enable safety checker
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

          {result.prompt && (
            <div className="result-meta">
              <p><strong>Prompt:</strong> {result.prompt}</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

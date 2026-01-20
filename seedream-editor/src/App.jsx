import { useState, useEffect } from 'react';
import { isApiKeyConfigured } from './services/falService';
import { uploadFiles, uploadFile, submitEditRequest, submitNanoBananaRequest, submitVeo31Request, submitWanRequest, submitWan25Request, submitFlux2ProRequest, submitGemini3Request } from './services/falService';
import { fetchHistory, addHistoryItem, deleteHistoryItem } from './services/historyService';
import ImageUpload from './components/ImageUpload';
import Sidebar from './components/Sidebar';
import GirlsView from './components/GirlsView';
import GirlSelector from './components/GirlSelector';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Checkbox } from './components/ui/checkbox';
import { Alert, AlertDescription } from './components/ui/alert';
import './App.css';

function SeedDreamPanel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    images,
    enableLogs,
    enableSafetyChecker,
    imageSize,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImages = (value) => setState(prev => ({ ...prev, images: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setEnableSafetyChecker = (value) => setState(prev => ({ ...prev, enableSafetyChecker: value }));
  const setImageSize = (value) => setState(prev => ({ ...prev, imageSize: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      // Add girl's image to the images array
      // Create a pseudo-file object that matches ImageUpload's expected structure
      const girlImage = {
        id: `girl-${girl.id}-${Date.now()}`,
        file: null, // No actual file since it's from URL
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true // Flag to identify URL-based images
      };
      setImages((prev) => [...prev, girlImage]);

      // Prepend default prompt if exists
      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
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

      // Separate URL-based images from file-based images
      const urlImages = images.filter(img => img.isFromUrl).map(img => img.preview);
      const fileImages = images.filter(img => !img.isFromUrl);

      // Upload only file-based images
      let uploadedUrls = [];
      if (fileImages.length > 0) {
        const imageFiles = fileImages.map((img) => img.file);
        uploadedUrls = await uploadFiles(imageFiles, (current, total) => {
          setUploadProgress({ current, total });
          if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
        });
      }

      // Combine URL-based images with uploaded file URLs
      const imageUrls = [...urlImages, ...uploadedUrls];

      if (enableLogs) addLog('All images ready');
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

      // Add to history
      if (onGenerationComplete && response.data) {
        onGenerationComplete(
          {
            prompt: prompt.trim(),
            images,
            enableSafetyChecker,
            imageSize
          },
          response.data
        );
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your image editing parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Editing Prompt</Label>
                <Textarea
                  id="prompt"
                  rows={4}
                  placeholder='Describe the edit you want to make (e.g., "Replace the product in Figure 1 with that in Figure 2")'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-sm text-muted-foreground">
                  Reference images as Figure 1, Figure 2, etc. in your prompt
                </p>
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <ImageUpload onImagesChange={setImages} maxImages={10} />

              <div className="space-y-2">
                <Label htmlFor="imageSize">Image Size</Label>
                <Select value={imageSize} onValueChange={setImageSize} disabled={isProcessing}>
                  <SelectTrigger id="imageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="square_hd">Square HD</SelectItem>
                    <SelectItem value="square">Square</SelectItem>
                    <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                    <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                    <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                    <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                    <SelectItem value="auto_2K">Auto 2K</SelectItem>
                    <SelectItem value="auto_4K">Auto 4K</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The size of the generated image. Width and height must be between 1920 and 4096.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="safetyChecker"
                  checked={enableSafetyChecker}
                  onCheckedChange={setEnableSafetyChecker}
                  disabled={isProcessing}
                />
                <Label htmlFor="safetyChecker" className="font-normal cursor-pointer">
                  Enable safety checker
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="logs"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="logs" className="font-normal cursor-pointer">
                  Enable progress logs
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Generate Edited Image'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {uploadProgress && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Uploading images: {uploadProgress.current} / {uploadProgress.total}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {status && (
          <Alert variant={status.startsWith('ERROR') ? 'destructive' : 'default'}>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
            </CardHeader>
            <CardContent>
              {result.images && result.images.length > 0 && (
                <div className="space-y-4">
                  {result.images.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-medium">Image {index + 1}</h4>
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="result-image"
                      />
                      <div className="text-sm space-y-1">
                        <p>
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View full size
                          </a>
                        </p>
                        {image.width && <p>Width: {image.width}px</p>}
                        {image.height && <p>Height: {image.height}px</p>}
                        {image.content_type && <p>Type: {image.content_type}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.seed !== undefined && (
                <p className="text-sm mt-4">
                  <strong>Seed:</strong> {result.seed}
                </p>
              )}

              {result.prompt && (
                <p className="text-sm mt-2">
                  <strong>Prompt:</strong> {result.prompt}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function NanoBananaPanel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    images,
    enableLogs,
    numImages,
    aspectRatio,
    resolution,
    outputFormat,
    enableWebSearch,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImages = (value) => setState(prev => ({ ...prev, images: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setNumImages = (value) => setState(prev => ({ ...prev, numImages: value }));
  const setAspectRatio = (value) => setState(prev => ({ ...prev, aspectRatio: value }));
  const setResolution = (value) => setState(prev => ({ ...prev, resolution: value }));
  const setOutputFormat = (value) => setState(prev => ({ ...prev, outputFormat: value }));
  const setEnableWebSearch = (value) => setState(prev => ({ ...prev, enableWebSearch: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      const girlImage = {
        id: `girl-${girl.id}-${Date.now()}`,
        file: null,
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true
      };
      setImages((prev) => [...prev, girlImage]);

      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
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

      // Separate URL-based images from file-based images
      const urlImages = images.filter(img => img.isFromUrl).map(img => img.preview);
      const fileImages = images.filter(img => !img.isFromUrl);

      // Upload only file-based images
      let uploadedUrls = [];
      if (fileImages.length > 0) {
        const imageFiles = fileImages.map((img) => img.file);
        uploadedUrls = await uploadFiles(imageFiles, (current, total) => {
          setUploadProgress({ current, total });
          if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
        });
      }

      // Combine URL-based images with uploaded file URLs
      const imageUrls = [...urlImages, ...uploadedUrls];

      if (enableLogs) addLog('All images ready');
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

      // Add to history
      if (onGenerationComplete && response.data) {
        onGenerationComplete(
          {
            prompt: prompt.trim(),
            images,
            numImages,
            aspectRatio,
            resolution,
            outputFormat,
            enableWebSearch
          },
          response.data
        );
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
            <CardDescription>Configure your image editing parameters</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt-nano">Editing Prompt</Label>
                <Textarea
                  id="prompt-nano"
                  rows={4}
                  placeholder='Describe the edit you want to make (e.g., "Make the sky more dramatic")'
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-sm text-muted-foreground">
                  Describe the changes you want to make to the image
                </p>
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <ImageUpload onImagesChange={setImages} maxImages={10} />

              <div className="space-y-2">
                <Label htmlFor="numImages">Number of Images</Label>
                <Select
                  value={numImages.toString()}
                  onValueChange={(val) => setNumImages(Number(val))}
                  disabled={isProcessing}
                >
                  <SelectTrigger id="numImages">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Image</SelectItem>
                    <SelectItem value="2">2 Images</SelectItem>
                    <SelectItem value="3">3 Images</SelectItem>
                    <SelectItem value="4">4 Images</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Generate multiple variations (1-4 images)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isProcessing}>
                  <SelectTrigger id="aspectRatio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="21:9">21:9 (Ultrawide)</SelectItem>
                    <SelectItem value="16:9">16:9 (Widescreen)</SelectItem>
                    <SelectItem value="3:2">3:2</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="5:4">5:4</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="4:5">4:5</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                    <SelectItem value="2:3">2:3</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The aspect ratio of the generated image
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resolution">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution} disabled={isProcessing}>
                  <SelectTrigger id="resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1K">1K (Standard)</SelectItem>
                    <SelectItem value="2K">2K (High Quality)</SelectItem>
                    <SelectItem value="4K">4K (Ultra HD)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Higher resolution means better quality but slower generation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outputFormat">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat} disabled={isProcessing}>
                  <SelectTrigger id="outputFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The file format of the generated image
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="webSearch"
                  checked={enableWebSearch}
                  onCheckedChange={setEnableWebSearch}
                  disabled={isProcessing}
                />
                <Label htmlFor="webSearch" className="font-normal cursor-pointer">
                  Enable web search
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="logs-nano"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="logs-nano" className="font-normal cursor-pointer">
                  Enable progress logs
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Generate Edited Image'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {uploadProgress && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Uploading images: {uploadProgress.current} / {uploadProgress.total}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {status && (
          <Alert variant={status.startsWith('ERROR') ? 'destructive' : 'default'}>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">[{log.timestamp}]</span> {log.message}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
            </CardHeader>
            <CardContent>
              {result.images && result.images.length > 0 && (
                <div className="space-y-4">
                  {result.images.map((image, index) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-medium">Image {index + 1}</h4>
                      <img
                        src={image.url}
                        alt={`Generated ${index + 1}`}
                        className="result-image"
                      />
                      <div className="text-sm space-y-1">
                        <p>
                          <a
                            href={image.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            View full size
                          </a>
                        </p>
                        {image.width && <p>Width: {image.width}px</p>}
                        {image.height && <p>Height: {image.height}px</p>}
                        {image.content_type && <p>Type: {image.content_type}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.seed !== undefined && (
                <p className="text-sm mt-4">
                  <strong>Seed:</strong> {result.seed}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Veo31Panel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    images,
    enableLogs,
    aspectRatio,
    duration,
    resolution,
    generateAudio,
    autoFix,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImages = (value) => setState(prev => ({ ...prev, images: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setAspectRatio = (value) => setState(prev => ({ ...prev, aspectRatio: value }));
  const setDuration = (value) => setState(prev => ({ ...prev, duration: value }));
  const setResolution = (value) => setState(prev => ({ ...prev, resolution: value }));
  const setGenerateAudio = (value) => setState(prev => ({ ...prev, generateAudio: value }));
  const setAutoFix = (value) => setState(prev => ({ ...prev, autoFix: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      const girlImage = {
        id: `girl-${girl.id}-${Date.now()}`,
        file: null,
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true
      };
      setImages((prev) => [...prev, girlImage]);

      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }

    if (images.length === 0) {
      alert('Please upload at least one reference image');
      return;
    }

    setStatus('Uploading images...');
    setLogs([]);
    setResult(null);
    setIsProcessing(true);

    try {
      if (enableLogs) addLog(`Uploading ${images.length} image(s)...`);

      // Separate URL-based images from file-based images
      const urlImages = images.filter(img => img.isFromUrl).map(img => img.preview);
      const fileImages = images.filter(img => !img.isFromUrl);

      // Upload only file-based images
      let uploadedUrls = [];
      if (fileImages.length > 0) {
        // Veo31 expects File objects directly, not objects with file property
        const imageFiles = fileImages.map((img) => img.file);
        uploadedUrls = await uploadFiles(imageFiles, (current, total) => {
          setUploadProgress({ current, total });
          if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
        });
      }

      // Combine URL-based images with uploaded file URLs
      const imageUrls = [...urlImages, ...uploadedUrls];

      setUploadProgress(null);
      setStatus('Generating video...');
      if (enableLogs) addLog('Submitting video generation request...');

      const response = await submitVeo31Request({
        prompt: prompt.trim(),
        imageUrls,
        onQueueUpdate: (update) => {
          if (enableLogs && update.status) {
            addLog(`Queue status: ${update.status}`);
          }
        },
        logs: enableLogs,
        aspectRatio,
        duration,
        resolution,
        generateAudio,
        autoFix
      });

      setStatus('SUCCESS: Video generation completed!');
      if (enableLogs) addLog('Request completed successfully!');
      if (enableLogs && response.requestId) {
        addLog(`Request ID: ${response.requestId}`);
      }

      setResult(response.data);

      // Add to history
      if (onGenerationComplete && response.data) {
        onGenerationComplete(
          {
            prompt: prompt.trim(),
            images,
            aspectRatio,
            duration,
            resolution,
            generateAudio,
            autoFix
          },
          response.data
        );
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Reference-to-Video Settings</CardTitle>
            <CardDescription>Upload reference images and configure video generation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="veo-prompt">Prompt</Label>
                <Textarea
                  id="veo-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the video you want to generate (max 20,000 characters)..."
                  rows={4}
                  disabled={isProcessing}
                />
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <div>
                <Label>Reference Images</Label>
                <ImageUpload onImagesChange={setImages} maxImages={10} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="veo-aspect-ratio">Aspect Ratio</Label>
                  <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isProcessing}>
                    <SelectTrigger id="veo-aspect-ratio">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                      <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="veo-duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration} disabled={isProcessing}>
                    <SelectTrigger id="veo-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8s">8 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="veo-resolution">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution} disabled={isProcessing}>
                  <SelectTrigger id="veo-resolution">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p</SelectItem>
                    <SelectItem value="1080p">1080p</SelectItem>
                    <SelectItem value="4k">4K</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="veo-generate-audio"
                  checked={generateAudio}
                  onCheckedChange={setGenerateAudio}
                  disabled={isProcessing}
                />
                <Label htmlFor="veo-generate-audio">Generate Audio</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="veo-auto-fix"
                  checked={autoFix}
                  onCheckedChange={setAutoFix}
                  disabled={isProcessing}
                />
                <Label htmlFor="veo-auto-fix">Auto Fix Prompts (rewrites prompts failing content policy)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="veo-logs"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="veo-logs">Enable Progress Logs</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Generate Video'}
              </Button>

              {uploadProgress && (
                <p className="text-sm text-muted-foreground">
                  Uploading: {uploadProgress.current}/{uploadProgress.total}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={status.startsWith('ERROR') ? 'text-destructive' : status.startsWith('SUCCESS') ? 'text-green-600' : ''}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {enableLogs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.video && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Video</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                src={result.video.url}
                controls
                className="w-full rounded-md"
              >
                Your browser does not support the video tag.
              </video>
              <div className="mt-4">
                <Button asChild className="w-full">
                  <a href={result.video.url} download target="_blank" rel="noopener noreferrer">
                    Download Video
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function WanPanel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    images,
    enableLogs,
    negativePrompt,
    imageSize,
    numImages,
    enablePromptExpansion,
    seed,
    enableSafetyChecker,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImages = (value) => setState(prev => ({ ...prev, images: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setNegativePrompt = (value) => setState(prev => ({ ...prev, negativePrompt: value }));
  const setImageSize = (value) => setState(prev => ({ ...prev, imageSize: value }));
  const setNumImages = (value) => setState(prev => ({ ...prev, numImages: value }));
  const setEnablePromptExpansion = (value) => setState(prev => ({ ...prev, enablePromptExpansion: value }));
  const setSeed = (value) => setState(prev => ({ ...prev, seed: value }));
  const setEnableSafetyChecker = (value) => setState(prev => ({ ...prev, enableSafetyChecker: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      const girlImage = {
        id: `girl-${girl.id}-${Date.now()}`,
        file: null,
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true
      };
      setImages((prev) => [...prev, girlImage]);

      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus('');
    setLogs([]);
    setResult(null);

    if (!prompt.trim()) {
      setStatus('ERROR: Please enter a prompt');
      return;
    }

    if (images.length === 0) {
      setStatus('ERROR: Please upload at least one reference image (1-3 images)');
      return;
    }

    if (images.length > 3) {
      setStatus('ERROR: Maximum 3 reference images allowed');
      return;
    }

    setIsProcessing(true);

    try {
      setStatus('Uploading images...');
      if (enableLogs) addLog('Starting image uploads...');

      const urlImages = images.filter(img => img.isFromUrl).map(img => img.preview);
      const fileImages = images.filter(img => !img.isFromUrl);

      let uploadedUrls = [];
      if (fileImages.length > 0) {
        const imageFiles = fileImages.map((img) => img.file);
        uploadedUrls = await uploadFiles(imageFiles, (current, total) => {
          setUploadProgress({ current, total });
          if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
        });
      }

      const imageUrls = [...urlImages, ...uploadedUrls];
      setUploadProgress(null);

      setStatus('Submitting to Wan v2.6...');
      if (enableLogs) addLog('Submitting edit request...');

      const result = await submitWanRequest({
        prompt,
        imageUrls,
        negativePrompt,
        imageSize,
        numImages,
        enablePromptExpansion,
        seed: seed ? parseInt(seed) : null,
        enableSafetyChecker,
        logs: enableLogs,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            setStatus(`Processing: ${update.logs?.[update.logs.length - 1]?.message || 'Working...'}`);
            if (enableLogs && update.logs) {
              update.logs.forEach(log => addLog(log.message));
            }
          } else if (update.status === 'IN_QUEUE') {
            setStatus(`In queue (position: ${update.position || '?'})`);
            if (enableLogs) addLog('Request queued');
          }
        }
      });

      setResult(result);
      setStatus('SUCCESS: Images generated successfully!');
      if (enableLogs) addLog('Generation complete');

      onGenerationComplete({
        prompt,
        images,
        negativePrompt,
        imageSize,
        numImages,
        enablePromptExpansion,
        seed,
        enableSafetyChecker
      }, result);

    } catch (error) {
      setStatus(`ERROR: ${error.message}`);
      if (enableLogs) addLog(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Wan v2.6 Image-to-Image</CardTitle>
            <CardDescription>Upload reference images and configure generation</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="wan-prompt">Prompt</Label>
                <Textarea
                  id="wan-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the image you want to generate (max 2000 characters)..."
                  rows={3}
                  disabled={isProcessing}
                />
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <div>
                <Label htmlFor="wan-negative-prompt">Negative Prompt (Optional)</Label>
                <Textarea
                  id="wan-negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Content to avoid in generated image (max 500 characters)..."
                  rows={2}
                  disabled={isProcessing}
                />
              </div>

              <div>
                <Label>Reference Images (1-3 required)</Label>
                <ImageUpload onImagesChange={setImages} maxImages={3} />
                <p className="text-xs text-muted-foreground mt-1">Order matters: reference as 'image 1', 'image 2', etc.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wan-image-size">Image Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize} disabled={isProcessing}>
                    <SelectTrigger id="wan-image-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="square_hd">Square HD (1280×1280)</SelectItem>
                      <SelectItem value="square">Square (1024×1024)</SelectItem>
                      <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                      <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                      <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                      <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wan-num-images">Number of Images</Label>
                  <Select value={numImages.toString()} onValueChange={(v) => setNumImages(parseInt(v))} disabled={isProcessing}>
                    <SelectTrigger id="wan-num-images">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="wan-seed">Seed (Optional)</Label>
                <input
                  id="wan-seed"
                  type="number"
                  min="0"
                  max="2147483647"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Leave empty for random"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wan-prompt-expansion"
                  checked={enablePromptExpansion}
                  onCheckedChange={setEnablePromptExpansion}
                  disabled={isProcessing}
                />
                <Label htmlFor="wan-prompt-expansion">Enable Prompt Expansion (LLM optimization, +3-4s)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wan-safety-checker"
                  checked={enableSafetyChecker}
                  onCheckedChange={setEnableSafetyChecker}
                  disabled={isProcessing}
                />
                <Label htmlFor="wan-safety-checker">Enable Safety Checker</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wan-logs"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="wan-logs">Enable Progress Logs</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Generate Images'}
              </Button>

              {uploadProgress && (
                <p className="text-sm text-muted-foreground">
                  Uploading: {uploadProgress.current}/{uploadProgress.total}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={status.startsWith('ERROR') ? 'text-destructive' : status.startsWith('SUCCESS') ? 'text-green-600' : ''}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {enableLogs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.images && result.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {result.images.map((image, index) => (
                  <div key={index}>
                    <img
                      src={image.url}
                      alt={`Generated ${index + 1}`}
                      className="w-full rounded-md"
                    />
                    <Button asChild className="w-full mt-2">
                      <a href={image.url} download target="_blank" rel="noopener noreferrer">
                        Download Image {index + 1}
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Wan25Panel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    image,
    enableLogs,
    resolution,
    duration,
    audioFile,
    negativePrompt,
    enablePromptExpansion,
    seed,
    enableSafetyChecker,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImage = (value) => setState(prev => ({ ...prev, image: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setResolution = (value) => setState(prev => ({ ...prev, resolution: value }));
  const setDuration = (value) => setState(prev => ({ ...prev, duration: value }));
  const setAudioFile = (value) => setState(prev => ({ ...prev, audioFile: value }));
  const setNegativePrompt = (value) => setState(prev => ({ ...prev, negativePrompt: value }));
  const setEnablePromptExpansion = (value) => setState(prev => ({ ...prev, enablePromptExpansion: value }));
  const setSeed = (value) => setState(prev => ({ ...prev, seed: value }));
  const setEnableSafetyChecker = (value) => setState(prev => ({ ...prev, enableSafetyChecker: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      // Set girl's image as the first frame
      setImage({
        file: null,
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true
      });

      // Prepend default prompt if exists
      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        isFromUrl: false
      });
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setStatus('');
    setLogs([]);
    setResult(null);

    if (!prompt.trim()) {
      setStatus('ERROR: Please enter a motion prompt');
      return;
    }

    if (!image) {
      setStatus('ERROR: Please upload a first frame image');
      return;
    }

    setIsProcessing(true);

    try {
      // Upload image if it's a file
      let imageUrl = image.preview;
      if (!image.isFromUrl && image.file) {
        setStatus('Uploading image...');
        if (enableLogs) addLog('Uploading first frame image...');
        imageUrl = await uploadFile(image.file);
      }

      // Upload audio if provided
      let audioUrl = null;
      if (audioFile) {
        setStatus('Uploading audio...');
        if (enableLogs) addLog('Uploading audio file...');
        audioUrl = await uploadFile(audioFile);
      }

      setStatus('Submitting to Wan 2.5...');
      if (enableLogs) addLog('Submitting image-to-video request...');

      const result = await submitWan25Request({
        prompt,
        imageUrl,
        resolution,
        duration,
        audioUrl,
        negativePrompt,
        enablePromptExpansion,
        seed: seed ? parseInt(seed) : null,
        enableSafetyChecker,
        logs: enableLogs,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            setStatus(`Processing: ${update.logs?.[update.logs.length - 1]?.message || 'Working...'}`);
            if (enableLogs && update.logs) {
              update.logs.forEach(log => addLog(log.message));
            }
          } else if (update.status === 'IN_QUEUE') {
            setStatus(`In queue (position: ${update.position || '?'})`);
            if (enableLogs) addLog('Request queued');
          }
        }
      });

      setResult(result);
      setStatus('SUCCESS: Video generated successfully!');
      if (enableLogs) addLog('Generation complete');

      onGenerationComplete({
        prompt,
        image,
        resolution,
        duration,
        audioFile: audioFile?.name || null,
        negativePrompt,
        enablePromptExpansion,
        seed,
        enableSafetyChecker
      }, result);

    } catch (error) {
      setStatus(`ERROR: ${error.message}`);
      if (enableLogs) addLog(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Wan 2.5 Image-to-Video</CardTitle>
            <CardDescription>Upload a first frame image and describe the motion</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="wan25-prompt">Motion Prompt</Label>
                <Textarea
                  id="wan25-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the desired motion (max 800 characters)..."
                  rows={3}
                  disabled={isProcessing}
                />
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <div>
                <Label htmlFor="wan25-negative-prompt">Negative Prompt (Optional)</Label>
                <Textarea
                  id="wan25-negative-prompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder="Content to avoid (max 500 characters)..."
                  rows={2}
                  disabled={isProcessing}
                />
              </div>

              <div>
                <Label htmlFor="wan25-image">First Frame Image (Required)</Label>
                <input
                  id="wan25-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground mt-1">360-2000px, max 10MB (JPEG/PNG/BMP/WEBP)</p>
                {image && (
                  <div className="mt-4">
                    <img
                      src={image.preview}
                      alt="First frame preview"
                      className="w-full max-w-xs rounded-md"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="wan25-audio">Background Audio (Optional)</Label>
                <input
                  id="wan25-audio"
                  type="file"
                  accept="audio/wav,audio/mpeg,audio/mp3"
                  onChange={handleAudioChange}
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted-foreground mt-1">WAV/MP3, 3-30 seconds, max 15MB</p>
                {audioFile && (
                  <p className="text-sm mt-2">Selected: {audioFile.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wan25-resolution">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution} disabled={isProcessing}>
                    <SelectTrigger id="wan25-resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="480p">480p ($0.05/sec)</SelectItem>
                      <SelectItem value="720p">720p ($0.10/sec)</SelectItem>
                      <SelectItem value="1080p">1080p ($0.15/sec)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="wan25-duration">Duration</Label>
                  <Select value={duration} onValueChange={setDuration} disabled={isProcessing}>
                    <SelectTrigger id="wan25-duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="wan25-seed">Seed (Optional)</Label>
                <input
                  id="wan25-seed"
                  type="number"
                  min="0"
                  max="2147483647"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Leave empty for random"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wan25-prompt-expansion"
                  checked={enablePromptExpansion}
                  onCheckedChange={setEnablePromptExpansion}
                  disabled={isProcessing}
                />
                <Label htmlFor="wan25-prompt-expansion">Enable Prompt Expansion (LLM rewriting)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wan25-safety-checker"
                  checked={enableSafetyChecker}
                  onCheckedChange={setEnableSafetyChecker}
                  disabled={isProcessing}
                />
                <Label htmlFor="wan25-safety-checker">Enable Safety Checker</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="wan25-logs"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="wan25-logs">Enable Progress Logs</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Generate Video'}
              </Button>

              {uploadProgress && (
                <p className="text-sm text-muted-foreground">
                  {uploadProgress}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={status.startsWith('ERROR') ? 'text-destructive' : status.startsWith('SUCCESS') ? 'text-green-600' : ''}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {enableLogs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.video && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Video</CardTitle>
            </CardHeader>
            <CardContent>
              <video
                src={result.video.url}
                controls
                className="w-full rounded-md"
              >
                Your browser does not support the video tag.
              </video>
              {result.actual_prompt && (
                <div className="mt-4">
                  <Label>Actual Prompt Used:</Label>
                  <p className="text-sm text-muted-foreground mt-1">{result.actual_prompt}</p>
                </div>
              )}
              <div className="mt-4">
                <Button asChild className="w-full">
                  <a href={result.video.url} download target="_blank" rel="noopener noreferrer">
                    Download Video
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Flux2ProPanel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    images,
    enableLogs,
    imageSize,
    seed,
    safetyTolerance,
    enableSafetyChecker,
    outputFormat,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImages = (value) => setState(prev => ({ ...prev, images: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setImageSize = (value) => setState(prev => ({ ...prev, imageSize: value }));
  const setSeed = (value) => setState(prev => ({ ...prev, seed: value }));
  const setSafetyTolerance = (value) => setState(prev => ({ ...prev, safetyTolerance: value }));
  const setEnableSafetyChecker = (value) => setState(prev => ({ ...prev, enableSafetyChecker: value }));
  const setOutputFormat = (value) => setState(prev => ({ ...prev, outputFormat: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      const girlImage = {
        id: `girl-${girl.id}-${Date.now()}`,
        file: null,
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true
      };
      setImages((prev) => [...prev, girlImage]);

      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
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
      setStatus('ERROR: Please upload at least one input image');
      return;
    }

    setIsProcessing(true);

    try {
      setStatus('Uploading images...');
      if (enableLogs) addLog('Starting image uploads...');

      const urlImages = images.filter(img => img.isFromUrl).map(img => img.preview);
      const fileImages = images.filter(img => !img.isFromUrl);

      let uploadedUrls = [];
      if (fileImages.length > 0) {
        const imageFiles = fileImages.map((img) => img.file);
        uploadedUrls = await uploadFiles(imageFiles, (current, total) => {
          setUploadProgress({ current, total });
          if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
        });
      }

      const imageUrls = [...urlImages, ...uploadedUrls];
      setUploadProgress(null);

      setStatus('Submitting to Flux 2 Pro...');
      if (enableLogs) addLog('Submitting edit request...');

      const result = await submitFlux2ProRequest({
        prompt,
        imageUrls,
        imageSize,
        seed: seed ? parseInt(seed) : null,
        safetyTolerance,
        enableSafetyChecker,
        outputFormat,
        logs: enableLogs,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            setStatus(`Processing: ${update.logs?.[update.logs.length - 1]?.message || 'Working...'}`);
            if (enableLogs && update.logs) {
              update.logs.forEach(log => addLog(log.message));
            }
          } else if (update.status === 'IN_QUEUE') {
            setStatus(`In queue (position: ${update.position || '?'})`);
            if (enableLogs) addLog('Request queued');
          }
        }
      });

      setResult(result);
      setStatus('SUCCESS: Image edited successfully!');
      if (enableLogs) addLog('Generation complete');

      onGenerationComplete({
        prompt,
        images,
        imageSize,
        seed,
        safetyTolerance,
        enableSafetyChecker,
        outputFormat
      }, result);

    } catch (error) {
      setStatus(`ERROR: ${error.message}`);
      if (enableLogs) addLog(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Flux 2 Pro Image Editor</CardTitle>
            <CardDescription>Advanced image editing with FLUX.2 [pro]</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="flux-prompt">Editing Prompt</Label>
                <Textarea
                  id="flux-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the edits you want to make..."
                  rows={3}
                  disabled={isProcessing}
                />
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <div>
                <Label>Input Images</Label>
                <ImageUpload onImagesChange={setImages} maxImages={10} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flux-image-size">Image Size</Label>
                  <Select value={imageSize} onValueChange={setImageSize} disabled={isProcessing}>
                    <SelectTrigger id="flux-image-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="square_hd">Square HD</SelectItem>
                      <SelectItem value="square">Square</SelectItem>
                      <SelectItem value="portrait_4_3">Portrait 4:3</SelectItem>
                      <SelectItem value="portrait_16_9">Portrait 16:9</SelectItem>
                      <SelectItem value="landscape_4_3">Landscape 4:3</SelectItem>
                      <SelectItem value="landscape_16_9">Landscape 16:9</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="flux-output-format">Output Format</Label>
                  <Select value={outputFormat} onValueChange={setOutputFormat} disabled={isProcessing}>
                    <SelectTrigger id="flux-output-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jpeg">JPEG</SelectItem>
                      <SelectItem value="png">PNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="flux-seed">Seed (Optional)</Label>
                <input
                  id="flux-seed"
                  type="number"
                  min="0"
                  max="2147483647"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Leave empty for random"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <Label htmlFor="flux-safety-tolerance">Safety Tolerance: {safetyTolerance}</Label>
                <input
                  id="flux-safety-tolerance"
                  type="range"
                  min="1"
                  max="5"
                  value={safetyTolerance}
                  onChange={(e) => setSafetyTolerance(parseInt(e.target.value))}
                  disabled={isProcessing}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">1 = Strictest, 5 = Most Permissive</p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flux-safety-checker"
                  checked={enableSafetyChecker}
                  onCheckedChange={setEnableSafetyChecker}
                  disabled={isProcessing}
                />
                <Label htmlFor="flux-safety-checker">Enable Safety Checker</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="flux-logs"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="flux-logs">Enable Progress Logs</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Edit Image'}
              </Button>

              {uploadProgress && (
                <p className="text-sm text-muted-foreground">
                  Uploading: {uploadProgress.current}/{uploadProgress.total}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Pricing: $0.03 for first megapixel; $0.015 per additional megapixel
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={status.startsWith('ERROR') ? 'text-destructive' : status.startsWith('SUCCESS') ? 'text-green-600' : ''}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {enableLogs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.images && result.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Edited Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {result.images.map((image, index) => (
                  <div key={index}>
                    <img
                      src={image.url}
                      alt={`Edited ${index + 1}`}
                      className="w-full rounded-md"
                    />
                    {image.width && image.height && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {image.width} × {image.height}
                      </p>
                    )}
                    <Button asChild className="w-full mt-2">
                      <a href={image.url} download target="_blank" rel="noopener noreferrer">
                        Download Image {index + 1}
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Gemini3Panel({ state, setState, onGenerationComplete }) {
  const {
    prompt,
    images,
    enableLogs,
    numImages,
    seed,
    aspectRatio,
    outputFormat,
    resolution,
    limitGenerations,
    enableWebSearch,
    status,
    logs,
    result,
    isProcessing,
    uploadProgress
  } = state;

  const setPrompt = (value) => setState(prev => ({ ...prev, prompt: value }));
  const setImages = (value) => setState(prev => ({ ...prev, images: value }));
  const setEnableLogs = (value) => setState(prev => ({ ...prev, enableLogs: value }));
  const setNumImages = (value) => setState(prev => ({ ...prev, numImages: value }));
  const setSeed = (value) => setState(prev => ({ ...prev, seed: value }));
  const setAspectRatio = (value) => setState(prev => ({ ...prev, aspectRatio: value }));
  const setOutputFormat = (value) => setState(prev => ({ ...prev, outputFormat: value }));
  const setResolution = (value) => setState(prev => ({ ...prev, resolution: value }));
  const setLimitGenerations = (value) => setState(prev => ({ ...prev, limitGenerations: value }));
  const setEnableWebSearch = (value) => setState(prev => ({ ...prev, enableWebSearch: value }));
  const setStatus = (value) => setState(prev => ({ ...prev, status: value }));
  const setLogs = (value) => setState(prev => ({ ...prev, logs: typeof value === 'function' ? value(prev.logs) : value }));
  const setResult = (value) => setState(prev => ({ ...prev, result: value }));
  const setIsProcessing = (value) => setState(prev => ({ ...prev, isProcessing: value }));
  const setUploadProgress = (value) => setState(prev => ({ ...prev, uploadProgress: value }));

  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message }]);
  };

  const handleGirlSelect = (girl) => {
    if (girl) {
      const girlImage = {
        id: `girl-${girl.id}-${Date.now()}`,
        file: null,
        preview: girl.image_url,
        name: girl.name,
        isFromUrl: true
      };
      setImages((prev) => [...prev, girlImage]);

      if (girl.default_prompt) {
        const currentPrompt = prompt.trim();
        const newPrompt = currentPrompt
          ? `${girl.default_prompt}\n\n${currentPrompt}`
          : girl.default_prompt;
        setPrompt(newPrompt);
      }
    }
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

    if (prompt.length < 3 || prompt.length > 50000) {
      setStatus('ERROR: Prompt must be between 3 and 50,000 characters');
      return;
    }

    if (images.length === 0) {
      setStatus('ERROR: Please upload at least one input image');
      return;
    }

    setIsProcessing(true);

    try {
      setStatus('Uploading images...');
      if (enableLogs) addLog('Starting image uploads...');

      const urlImages = images.filter(img => img.isFromUrl).map(img => img.preview);
      const fileImages = images.filter(img => !img.isFromUrl);

      let uploadedUrls = [];
      if (fileImages.length > 0) {
        const imageFiles = fileImages.map((img) => img.file);
        uploadedUrls = await uploadFiles(imageFiles, (current, total) => {
          setUploadProgress({ current, total });
          if (enableLogs) addLog(`Uploaded ${current}/${total} images`);
        });
      }

      const imageUrls = [...urlImages, ...uploadedUrls];
      setUploadProgress(null);

      setStatus('Submitting to Gemini 3 Pro...');
      if (enableLogs) addLog('Submitting edit request...');

      const result = await submitGemini3Request({
        prompt,
        imageUrls,
        numImages,
        seed: seed ? parseInt(seed) : null,
        aspectRatio,
        outputFormat,
        resolution,
        limitGenerations,
        enableWebSearch,
        logs: enableLogs,
        onQueueUpdate: (update) => {
          if (update.status === 'IN_PROGRESS') {
            setStatus(`Processing: ${update.logs?.[update.logs.length - 1]?.message || 'Working...'}`);
            if (enableLogs && update.logs) {
              update.logs.forEach(log => addLog(log.message));
            }
          } else if (update.status === 'IN_QUEUE') {
            setStatus(`In queue (position: ${update.position || '?'})`);
            if (enableLogs) addLog('Request queued');
          }
        }
      });

      setResult(result);
      setStatus('SUCCESS: Images edited successfully!');
      if (enableLogs) addLog('Generation complete');

      onGenerationComplete({
        prompt,
        images,
        numImages,
        seed,
        aspectRatio,
        outputFormat,
        resolution,
        limitGenerations,
        enableWebSearch
      }, result);

    } catch (error) {
      setStatus(`ERROR: ${error.message}`);
      if (enableLogs) addLog(`Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Left Panel - Settings */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Gemini 3 Pro Image Editor</CardTitle>
            <CardDescription>Advanced image editing with Gemini 3 Pro</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="gemini-prompt">Editing Prompt</Label>
                <Textarea
                  id="gemini-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the edits you want to make (3-50,000 characters)..."
                  rows={4}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {prompt.length} / 50,000 characters
                </p>
              </div>

              <GirlSelector onSelect={handleGirlSelect} disabled={isProcessing} />

              <div>
                <Label>Input Images</Label>
                <ImageUpload onImagesChange={setImages} maxImages={10} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gemini-num-images">Number of Images</Label>
                  <Select value={numImages.toString()} onValueChange={(v) => setNumImages(parseInt(v))} disabled={isProcessing}>
                    <SelectTrigger id="gemini-num-images">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gemini-resolution">Resolution</Label>
                  <Select value={resolution} onValueChange={setResolution} disabled={isProcessing}>
                    <SelectTrigger id="gemini-resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K">1K</SelectItem>
                      <SelectItem value="2K">2K</SelectItem>
                      <SelectItem value="4K">4K (2x price)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="gemini-aspect-ratio">Aspect Ratio</Label>
                <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isProcessing}>
                  <SelectTrigger id="gemini-aspect-ratio">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="21:9">21:9 (Ultra Wide)</SelectItem>
                    <SelectItem value="16:9">16:9 (Wide)</SelectItem>
                    <SelectItem value="3:2">3:2</SelectItem>
                    <SelectItem value="4:3">4:3</SelectItem>
                    <SelectItem value="5:4">5:4</SelectItem>
                    <SelectItem value="1:1">1:1 (Square)</SelectItem>
                    <SelectItem value="4:5">4:5</SelectItem>
                    <SelectItem value="3:4">3:4</SelectItem>
                    <SelectItem value="2:3">2:3</SelectItem>
                    <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gemini-output-format">Output Format</Label>
                <Select value={outputFormat} onValueChange={setOutputFormat} disabled={isProcessing}>
                  <SelectTrigger id="gemini-output-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jpeg">JPEG</SelectItem>
                    <SelectItem value="png">PNG</SelectItem>
                    <SelectItem value="webp">WebP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gemini-seed">Seed (Optional)</Label>
                <input
                  id="gemini-seed"
                  type="number"
                  min="0"
                  max="2147483647"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Leave empty for random"
                  disabled={isProcessing}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gemini-limit-generations"
                  checked={limitGenerations}
                  onCheckedChange={setLimitGenerations}
                  disabled={isProcessing}
                />
                <Label htmlFor="gemini-limit-generations">Limit to 1 Generation per Prompt</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gemini-web-search"
                  checked={enableWebSearch}
                  onCheckedChange={setEnableWebSearch}
                  disabled={isProcessing}
                />
                <Label htmlFor="gemini-web-search">Enable Web Search</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gemini-logs"
                  checked={enableLogs}
                  onCheckedChange={setEnableLogs}
                  disabled={isProcessing}
                />
                <Label htmlFor="gemini-logs">Enable Progress Logs</Label>
              </div>

              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Edit Images'}
              </Button>

              {uploadProgress && (
                <p className="text-sm text-muted-foreground">
                  Uploading: {uploadProgress.current}/{uploadProgress.total}
                </p>
              )}

              <p className="text-xs text-muted-foreground">
                Pricing: $0.15 per image; 4K outputs charged at 2x rate
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Right Panel - Logs and Results */}
      <div className="space-y-6">
        {status && (
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={status.startsWith('ERROR') ? 'text-destructive' : status.startsWith('SUCCESS') ? 'text-green-600' : ''}>
                {status}
              </p>
            </CardContent>
          </Card>
        )}

        {enableLogs && logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {logs.map((log, index) => (
                  <div key={index} className="log-entry">
                    <span className="log-timestamp">{log.timestamp}</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {result && result.images && result.images.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Edited Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {result.images.map((image, index) => (
                  <div key={index}>
                    <img
                      src={image.url}
                      alt={`Edited ${index + 1}`}
                      className="w-full rounded-md"
                    />
                    {image.width && image.height && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {image.width} × {image.height}
                      </p>
                    )}
                    <Button asChild className="w-full mt-2">
                      <a href={image.url} download target="_blank" rel="noopener noreferrer">
                        Download Image {index + 1}
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
              {result.description && (
                <div className="mt-4">
                  <Label>Description:</Label>
                  <p className="text-sm text-muted-foreground mt-1">{result.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function App() {
  const [activeView, setActiveView] = useState('generate');
  const [activeTab, setActiveTab] = useState('seedream');
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load history from database on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const data = await fetchHistory();
    setHistory(data);
    setIsLoadingHistory(false);
  };

  // State for SeeD Dream tab
  const [seedDreamState, setSeedDreamState] = useState({
    prompt: '',
    images: [],
    enableLogs: true,
    enableSafetyChecker: true,
    imageSize: 'square_hd',
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // State for Nano Banana tab
  const [nanoBananaState, setNanoBananaState] = useState({
    prompt: '',
    images: [],
    enableLogs: true,
    numImages: 1,
    aspectRatio: 'auto',
    resolution: '1K',
    outputFormat: 'png',
    enableWebSearch: false,
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // State for Veo 3.1 tab
  const [veo31State, setVeo31State] = useState({
    prompt: '',
    images: [],
    enableLogs: true,
    aspectRatio: '16:9',
    duration: '8s',
    resolution: '720p',
    generateAudio: true,
    autoFix: false,
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // State for Wan v2.6 tab
  const [wanState, setWanState] = useState({
    prompt: '',
    images: [],
    enableLogs: true,
    negativePrompt: '',
    imageSize: 'square_hd',
    numImages: 1,
    enablePromptExpansion: true,
    seed: '',
    enableSafetyChecker: true,
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // State for Wan 2.5 tab
  const [wan25State, setWan25State] = useState({
    prompt: '',
    image: null,
    enableLogs: true,
    resolution: '1080p',
    duration: '5',
    audioFile: null,
    negativePrompt: '',
    enablePromptExpansion: true,
    seed: '',
    enableSafetyChecker: true,
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // State for Flux 2 Pro tab
  const [flux2ProState, setFlux2ProState] = useState({
    prompt: '',
    images: [],
    enableLogs: true,
    imageSize: 'auto',
    seed: '',
    safetyTolerance: 2,
    enableSafetyChecker: true,
    outputFormat: 'jpeg',
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // State for Gemini 3 Pro tab
  const [gemini3State, setGemini3State] = useState({
    prompt: '',
    images: [],
    enableLogs: true,
    numImages: 1,
    seed: '',
    aspectRatio: 'auto',
    outputFormat: 'png',
    resolution: '1K',
    limitGenerations: false,
    enableWebSearch: false,
    status: '',
    logs: [],
    result: null,
    isProcessing: false,
    uploadProgress: null
  });

  // Add to history when generation completes
  const addToHistory = async (type, settings, result) => {
    const timestamp = new Date().toLocaleString();
    try {
      const savedItem = await addHistoryItem(type, timestamp, settings, result);
      setHistory(prev => [savedItem, ...prev]);
    } catch (error) {
      console.error('Failed to save history item:', error);
    }
  };

  // Delete history item
  const handleDeleteHistory = async (id) => {
    try {
      await deleteHistoryItem(id);
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to delete history item:', error);
    }
  };

  // Restore settings from history
  const restoreFromHistory = (item) => {
    setActiveTab(item.type);
    if (item.type === 'seedream') {
      setSeedDreamState(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        images: item.settings.images,
        enableSafetyChecker: item.settings.enableSafetyChecker,
        imageSize: item.settings.imageSize,
        result: item.result
      }));
    } else if (item.type === 'nanobanana') {
      setNanoBananaState(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        images: item.settings.images,
        numImages: item.settings.numImages,
        aspectRatio: item.settings.aspectRatio,
        resolution: item.settings.resolution,
        outputFormat: item.settings.outputFormat,
        enableWebSearch: item.settings.enableWebSearch,
        result: item.result
      }));
    } else if (item.type === 'veo31') {
      setVeo31State(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        images: item.settings.images,
        aspectRatio: item.settings.aspectRatio,
        duration: item.settings.duration,
        resolution: item.settings.resolution,
        generateAudio: item.settings.generateAudio,
        autoFix: item.settings.autoFix,
        result: item.result
      }));
    } else if (item.type === 'wan') {
      setWanState(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        images: item.settings.images,
        negativePrompt: item.settings.negativePrompt,
        imageSize: item.settings.imageSize,
        numImages: item.settings.numImages,
        enablePromptExpansion: item.settings.enablePromptExpansion,
        seed: item.settings.seed,
        enableSafetyChecker: item.settings.enableSafetyChecker,
        result: item.result
      }));
    } else if (item.type === 'wan25') {
      setWan25State(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        image: item.settings.image,
        resolution: item.settings.resolution,
        duration: item.settings.duration,
        negativePrompt: item.settings.negativePrompt,
        enablePromptExpansion: item.settings.enablePromptExpansion,
        seed: item.settings.seed,
        enableSafetyChecker: item.settings.enableSafetyChecker,
        result: item.result
      }));
    } else if (item.type === 'flux2pro') {
      setFlux2ProState(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        images: item.settings.images,
        imageSize: item.settings.imageSize,
        seed: item.settings.seed,
        safetyTolerance: item.settings.safetyTolerance,
        enableSafetyChecker: item.settings.enableSafetyChecker,
        outputFormat: item.settings.outputFormat,
        result: item.result
      }));
    } else if (item.type === 'gemini3') {
      setGemini3State(prev => ({
        ...prev,
        prompt: item.settings.prompt,
        images: item.settings.images,
        numImages: item.settings.numImages,
        seed: item.settings.seed,
        aspectRatio: item.settings.aspectRatio,
        outputFormat: item.settings.outputFormat,
        resolution: item.settings.resolution,
        limitGenerations: item.settings.limitGenerations,
        enableWebSearch: item.settings.enableWebSearch,
        result: item.result
      }));
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />

      <div className="flex-1">
        {activeView === 'girls' ? (
          <GirlsView />
        ) : (
          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h1 className="text-4xl font-bold mb-2">Generate Content</h1>
                <p className="text-muted-foreground">Powered by fal.ai</p>
                {!isApiKeyConfigured() && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertDescription>
                      API key not configured. Please set <code>VITE_FAL_KEY</code> in your <code>.env</code> file.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-5xl grid-cols-7">
            <TabsTrigger value="seedream">SeeD Dream v4.5</TabsTrigger>
            <TabsTrigger value="nanobanana">Nano Banana Pro</TabsTrigger>
            <TabsTrigger value="veo31">Veo 3.1</TabsTrigger>
            <TabsTrigger value="wan">Wan v2.6</TabsTrigger>
            <TabsTrigger value="wan25">Wan 2.5</TabsTrigger>
            <TabsTrigger value="flux2pro">Flux 2 Pro</TabsTrigger>
            <TabsTrigger value="gemini3">Gemini 3</TabsTrigger>
          </TabsList>

          <TabsContent value="seedream">
            <SeedDreamPanel
              state={seedDreamState}
              setState={setSeedDreamState}
              onGenerationComplete={(settings, result) => addToHistory('seedream', settings, result)}
            />
          </TabsContent>

          <TabsContent value="nanobanana">
            <NanoBananaPanel
              state={nanoBananaState}
              setState={setNanoBananaState}
              onGenerationComplete={(settings, result) => addToHistory('nanobanana', settings, result)}
            />
          </TabsContent>

          <TabsContent value="veo31">
            <Veo31Panel
              state={veo31State}
              setState={setVeo31State}
              onGenerationComplete={(settings, result) => addToHistory('veo31', settings, result)}
            />
          </TabsContent>

          <TabsContent value="wan">
            <WanPanel
              state={wanState}
              setState={setWanState}
              onGenerationComplete={(settings, result) => addToHistory('wan', settings, result)}
            />
          </TabsContent>

          <TabsContent value="wan25">
            <Wan25Panel
              state={wan25State}
              setState={setWan25State}
              onGenerationComplete={(settings, result) => addToHistory('wan25', settings, result)}
            />
          </TabsContent>

          <TabsContent value="flux2pro">
            <Flux2ProPanel
              state={flux2ProState}
              setState={setFlux2ProState}
              onGenerationComplete={(settings, result) => addToHistory('flux2pro', settings, result)}
            />
          </TabsContent>

          <TabsContent value="gemini3">
            <Gemini3Panel
              state={gemini3State}
              setState={setGemini3State}
              onGenerationComplete={(settings, result) => addToHistory('gemini3', settings, result)}
            />
          </TabsContent>
        </Tabs>

        {isLoadingHistory ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Loading history...</p>
            </CardContent>
          </Card>
        ) : history.length > 0 ? (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Generation History</CardTitle>
              <CardDescription>Click on any image to restore its settings. Right-click to delete.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="group relative"
                  >
                    <div
                      className="aspect-square rounded-lg overflow-hidden border-2 border-border group-hover:border-primary transition-colors cursor-pointer"
                      onClick={() => restoreFromHistory(item)}
                    >
                      {item.result?.images?.[0] && (
                        <img
                          src={item.result.images[0].url}
                          alt={item.settings.prompt}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {item.result?.video && (
                        <video
                          src={item.result.video.url}
                          className="w-full h-full object-cover"
                          muted
                        />
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteHistory(item.id);
                      }}
                    >
                      ×
                    </Button>
                    <div className="mt-2 space-y-1">
                      <div className="text-xs font-medium text-primary">
                        {item.type === 'seedream' ? 'SeeD Dream' : item.type === 'nanobanana' ? 'Nano Banana' : item.type === 'veo31' ? 'Veo 3.1' : item.type === 'wan' ? 'Wan v2.6' : item.type === 'wan25' ? 'Wan 2.5' : item.type === 'flux2pro' ? 'Flux 2 Pro' : 'Gemini 3'}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {item.settings.prompt}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.timestamp}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

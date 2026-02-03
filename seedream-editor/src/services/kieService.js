const KIE_API_BASE = 'https://api.kie.ai';
const KIE_UPLOAD_BASE = 'https://kieai.redpandaai.co';
const KIE_STORAGE_KEY = 'kie_api_key';

// Size mapping from Fal AI image_size to Kie AI aspect_ratio + quality
const SIZE_MAP = {
  'square_hd': { aspect_ratio: '1:1', quality: 'high' },
  'square': { aspect_ratio: '1:1', quality: 'basic' },
  'portrait_4_3': { aspect_ratio: '3:4', quality: 'basic' },
  'portrait_16_9': { aspect_ratio: '9:16', quality: 'basic' },
  'landscape_4_3': { aspect_ratio: '4:3', quality: 'basic' },
  'landscape_16_9': { aspect_ratio: '16:9', quality: 'basic' },
  'auto_2K': { aspect_ratio: '16:9', quality: 'basic' },
  'auto_4K': { aspect_ratio: '16:9', quality: 'high' }
};

function readStoredValue(key) {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(key) || '';
}

/**
 * Get stored Kie AI API key
 * @returns {string}
 */
export function getKieApiKey() {
  return readStoredValue(KIE_STORAGE_KEY);
}

/**
 * Set Kie AI API key
 * @param {string} key
 */
export function setKieApiKey(key) {
  if (typeof localStorage !== 'undefined') {
    if (key) {
      localStorage.setItem(KIE_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(KIE_STORAGE_KEY);
    }
  }
}

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export function isKieApiKeyConfigured() {
  return !!getKieApiKey();
}

/**
 * Sleep helper for polling
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a task on Kie AI
 * @param {Object} input - Task input parameters
 * @returns {Promise<string>} - Task ID
 */
async function createTask(input) {
  const apiKey = getKieApiKey();
  if (!apiKey) {
    throw new Error('Kie AI API key is not configured. Add it in Settings.');
  }

  const response = await fetch(`${KIE_API_BASE}/api/v1/jobs/createTask`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Kie AI API key. Please check your key in Settings.');
    } else if (response.status === 429) {
      throw new Error('Rate limit reached (20 requests per 10 seconds). Please wait and try again.');
    } else {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Failed to create task: HTTP ${response.status}${errorText ? ': ' + errorText : ''}`);
    }
  }

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(data.msg || 'Failed to create task');
  }

  if (!data.data?.taskId) {
    throw new Error('No task ID returned from Kie AI');
  }

  return data.data.taskId;
}

/**
 * Poll task status until completion
 * @param {string} taskId - Task ID to poll
 * @param {Function} onQueueUpdate - Callback for status updates
 * @returns {Promise<Object>} - Task result
 */
async function pollTaskStatus(taskId, onQueueUpdate) {
  const apiKey = getKieApiKey();
  const maxAttempts = 200; // 10 minutes at 3-second intervals
  const pollInterval = 3000; // 3 seconds

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `${KIE_API_BASE}/api/v1/jobs/recordInfo?taskId=${taskId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to query task status: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 200) {
      throw new Error(data.msg || 'Failed to query task status');
    }

    // Kie AI uses 'state' not 'status'
    const state = data.data?.state;
    const taskData = data.data;

    console.log(`Poll attempt ${attempt}: state=${state}`);

    // Emit status updates compatible with Fal AI's onQueueUpdate format
    if (state === 'waiting') {
      onQueueUpdate?.({
        status: 'IN_QUEUE',
        position: attempt
      });
    } else if (state === 'processing') {
      onQueueUpdate?.({
        status: 'IN_PROGRESS',
        logs: [{ message: `Processing... (${attempt * 3}s elapsed)` }]
      });
    } else if (state === 'success') {
      // Task completed successfully - return the full task data
      console.log('Task completed successfully:', taskData);
      return taskData;
    } else if (state === 'fail' || state === 'failed') {
      // API returns 'fail' not 'failed'
      const errorMsg = taskData?.failMsg || 'Task failed';
      console.error('Task failed:', errorMsg);
      throw new Error(errorMsg);
    }

    // Wait before next poll
    await sleep(pollInterval);
  }

  throw new Error('Generation timeout after 10 minutes');
}

/**
 * Normalize Kie AI response to match Fal AI format
 * @param {Object} kieResult - Kie AI result object
 * @param {string} taskId - Task ID
 * @returns {Object} - Normalized response matching Fal AI format
 */
function normalizeKieResponse(kieResult, taskId) {
  console.log('Normalizing Kie AI response:', kieResult);

  let images = [];

  // Kie AI response structure: { resultJson: "{\"resultUrls\":[...]}" }
  if (kieResult?.resultJson) {
    try {
      const resultData = JSON.parse(kieResult.resultJson);
      if (resultData.resultUrls && Array.isArray(resultData.resultUrls)) {
        images = resultData.resultUrls.map(url => ({
          url: url,
          content_type: 'image/jpeg'
        }));
      }
    } catch (e) {
      console.error('Failed to parse resultJson:', e);
    }
  }

  // Fallback: check for direct images array
  if (images.length === 0 && kieResult?.images) {
    images = Array.isArray(kieResult.images)
      ? kieResult.images.map(img => {
          if (typeof img === 'string') {
            return { url: img, content_type: 'image/jpeg' };
          } else if (img && typeof img === 'object') {
            return {
              url: img.url,
              width: img.width,
              height: img.height,
              content_type: img.content_type || 'image/jpeg'
            };
          }
          return null;
        }).filter(Boolean)
      : [];
  }

  console.log('Normalized images:', images);

  return {
    data: {
      images,
      seed: kieResult?.seed,
      prompt: kieResult?.prompt
    },
    requestId: taskId
  };
}

/**
 * Submit an image edit request to Kie AI SeeD Dream 4.5
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The editing prompt (max 3000 characters)
 * @param {string[]} params.imageUrls - Array of reference image URLs
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs (compatibility, not used by Kie AI)
 * @param {boolean} params.enableSafetyChecker - Enable safety checker (compatibility, not used by Kie AI)
 * @param {string} params.imageSize - Image size preset (will be mapped to aspect_ratio + quality)
 * @returns {Promise<Object>} - The result data in Fal AI-compatible format
 */
export async function submitEditRequest({
  prompt,
  imageUrls,
  onQueueUpdate,
  logs = true,
  enableSafetyChecker = true,
  imageSize = 'square_hd'
}) {
  try {
    // Map imageSize to Kie AI parameters
    const sizeConfig = SIZE_MAP[imageSize] || SIZE_MAP['square_hd'];

    // Build Kie AI request
    const input = {
      model: 'seedream/4.5-text-to-image',
      input: {
        prompt: prompt.substring(0, 3000), // Enforce 3000 char limit
        aspect_ratio: sizeConfig.aspect_ratio,
        quality: sizeConfig.quality,
        image_urls: imageUrls
      }
    };

    // Create task
    onQueueUpdate?.({ status: 'STARTING' });
    const taskId = await createTask(input);

    // Poll for completion
    const result = await pollTaskStatus(taskId, onQueueUpdate);

    // Normalize and return
    return normalizeKieResponse(result, taskId);
  } catch (error) {
    console.error('Error submitting Kie AI request:', error);
    throw error;
  }
}

/**
 * Upload a single file to Kie AI storage
 * @param {File} file - File to upload
 * @returns {Promise<string>} - URL of uploaded file
 */
export async function uploadFile(file) {
  const apiKey = getKieApiKey();

  if (!apiKey) {
    throw new Error('Kie AI API key not configured');
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadPath', 'images');
    formData.append('fileName', file.name);

    const response = await fetch(`${KIE_UPLOAD_BASE}/api/file-stream-upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid Kie AI API key');
      }
      throw new Error(`Upload failed: HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('Kie AI upload response:', result);

    // Check if upload was successful
    if (!result.success) {
      throw new Error(result.msg || 'Upload failed');
    }

    // Try to extract file URL from different possible locations
    const fileUrl = result.data?.fileUrl || result.data?.downloadUrl || result.fileUrl;

    if (!fileUrl) {
      console.error('No file URL found in response. Full response:', result);
      throw new Error('No file URL in upload response');
    }

    return fileUrl;
  } catch (error) {
    console.error('Error uploading file to Kie AI:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Upload multiple files to Kie AI storage
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<string[]>} - Array of uploaded file URLs
 */
export async function uploadFiles(files, onProgress) {
  const uploadedUrls = [];

  for (let i = 0; i < files.length; i++) {
    if (onProgress) {
      onProgress(i + 1, files.length);
    }

    const url = await uploadFile(files[i]);
    uploadedUrls.push(url);
  }

  return uploadedUrls;
}

/**
 * Submit a Nano Banana Pro request to Kie AI
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The image generation prompt
 * @param {string[]} params.imageUrls - Array of reference image URLs (up to 8)
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs (compatibility)
 * @param {number} params.numImages - Number of images to generate (not used by Kie AI)
 * @param {string} params.aspectRatio - Aspect ratio (1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9, auto)
 * @param {string} params.resolution - Resolution (1K, 2K, 4K)
 * @param {string} params.outputFormat - Output format (png, jpg)
 * @param {boolean} params.enableWebSearch - Enable web search (not used by Kie AI)
 * @returns {Promise<Object>} - The result data in Fal AI-compatible format
 */
export async function submitNanoBananaRequest({
  prompt,
  imageUrls = [],
  onQueueUpdate,
  logs = true,
  numImages = 1,
  aspectRatio = 'auto',
  resolution = '1K',
  outputFormat = 'png',
  enableWebSearch = false
}) {
  try {
    if (!isKieApiKeyConfigured()) {
      throw new Error('Kie AI API key not configured. Please add your API key in Settings.');
    }

    // Build Kie AI request for Nano Banana Pro
    const input = {
      model: 'nano-banana-pro',
      input: {
        prompt: prompt.substring(0, 20000), // Max 20,000 characters
        aspect_ratio: aspectRatio,
        resolution: resolution.toUpperCase(), // Ensure uppercase (1K, 2K, 4K)
        output_format: outputFormat.toLowerCase() // Ensure lowercase (png, jpg)
      }
    };

    // Add image_input if images are provided (up to 8)
    if (imageUrls && imageUrls.length > 0) {
      input.input.image_input = imageUrls.slice(0, 8); // Max 8 images
    }

    if (logs) {
      console.log('Kie AI Nano Banana request:', input);
    }

    // Create task
    onQueueUpdate?.({ status: 'STARTING' });
    const taskId = await createTask(input);

    if (logs) {
      console.log('Kie AI Nano Banana task created:', taskId);
    }

    // Poll for completion
    const result = await pollTaskStatus(taskId, onQueueUpdate);

    if (logs) {
      console.log('Kie AI Nano Banana result:', result);
    }

    // Normalize and return
    return normalizeKieResponse(result, taskId);
  } catch (error) {
    console.error('Error submitting Kie AI Nano Banana request:', error);
    throw error;
  }
}

/**
 * Submit a Veo 3.1 video generation request to Kie AI
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The video generation prompt
 * @param {string[]} params.imageUrls - Array of reference image URLs (1-3 for reference mode, 1-2 for first/last frame mode)
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs (compatibility)
 * @param {string} params.aspectRatio - Aspect ratio (16:9, 9:16, Auto)
 * @param {string} params.duration - Duration (not used by Kie AI - they use fixed durations)
 * @param {string} params.resolution - Resolution (not used by Kie AI)
 * @param {boolean} params.generateAudio - Generate audio (not directly supported by Kie AI)
 * @param {boolean} params.autoFix - Auto fix (not used by Kie AI)
 * @returns {Promise<Object>} - The result data in Fal AI-compatible format
 */
export async function submitVeo31Request({
  prompt,
  imageUrls = [],
  onQueueUpdate,
  logs = true,
  aspectRatio = '16:9',
  duration = '8s',
  resolution = '720p',
  generateAudio = true,
  autoFix = false
}) {
  try {
    if (!isKieApiKeyConfigured()) {
      throw new Error('Kie AI API key not configured. Please add your API key in Settings.');
    }

    // Determine generation type based on number of images
    let generationType = 'TEXT_2_VIDEO';
    if (imageUrls && imageUrls.length > 0) {
      if (imageUrls.length <= 2) {
        generationType = 'FIRST_AND_LAST_FRAMES_2_VIDEO';
      } else {
        generationType = 'REFERENCE_2_VIDEO'; // Only for fast model
      }
    }

    // Build Kie AI request for Veo 3
    const input = {
      model: 'veo3_fast', // Using fast model for compatibility with REFERENCE_2_VIDEO
      input: {
        prompt: prompt,
        aspect_ratio: aspectRatio,
        generationType: generationType,
        enableTranslation: true
      }
    };

    // Add image URLs if provided (max 3)
    if (imageUrls && imageUrls.length > 0) {
      input.input.imageUrls = imageUrls.slice(0, 3); // Max 3 images
    }

    if (logs) {
      console.log('Kie AI Veo 3.1 request:', input);
    }

    // Create task
    onQueueUpdate?.({ status: 'STARTING' });
    const taskId = await createTask(input);

    if (logs) {
      console.log('Kie AI Veo 3.1 task created:', taskId);
    }

    // Poll for completion (videos take longer, so use longer timeout)
    const result = await pollTaskStatus(taskId, onQueueUpdate);

    if (logs) {
      console.log('Kie AI Veo 3.1 result:', result);
    }

    // Normalize and return (videos will be in resultJson with video URLs)
    return normalizeKieVideoResponse(result, taskId);
  } catch (error) {
    console.error('Error submitting Kie AI Veo 3.1 request:', error);
    throw error;
  }
}

/**
 * Normalize Kie AI video response to match Fal AI format
 * @param {Object} kieResult - Kie AI result object
 * @param {string} taskId - Task ID
 * @returns {Object} - Normalized response matching Fal AI format
 */
function normalizeKieVideoResponse(kieResult, taskId) {
  console.log('Normalizing Kie AI video response:', kieResult);

  let video = null;

  // Kie AI response structure: { resultJson: "{\"videoUrl\":\"...\"}" }
  if (kieResult?.resultJson) {
    try {
      const resultData = JSON.parse(kieResult.resultJson);
      if (resultData.videoUrl) {
        video = {
          url: resultData.videoUrl,
          content_type: 'video/mp4'
        };
      }
    } catch (e) {
      console.error('Failed to parse video resultJson:', e);
    }
  }

  console.log('Normalized video:', video);

  return {
    data: {
      video: video,
      seed: kieResult?.seed,
      prompt: kieResult?.prompt
    },
    requestId: taskId
  };
}

/**
 * Submit a Qwen image-to-image request to Kie AI
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The image generation prompt (max 5000 characters)
 * @param {string} params.imageUrl - URL of the input image
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {number} params.strength - Remix strength 0-1 (default 0.8)
 * @param {string} params.outputFormat - Output format: png or jpeg (default png)
 * @param {string} params.acceleration - Acceleration: none, regular, or high (default none)
 * @param {string} params.negativePrompt - Negative prompt (max 500 characters)
 * @param {number} params.seed - Random seed for reproducibility
 * @param {number} params.numInferenceSteps - Inference steps 2-250 (default 30)
 * @param {number} params.guidanceScale - Guidance scale 0-20 (default 2.5)
 * @param {boolean} params.enableSafetyChecker - Enable safety checker (default true)
 * @returns {Promise<Object>} - The result data in Fal AI-compatible format
 */
export async function submitQwenRequest({
  prompt,
  imageUrl,
  onQueueUpdate,
  logs = true,
  strength = 0.8,
  outputFormat = 'png',
  acceleration = 'none',
  negativePrompt = 'blurry, ugly',
  seed = null,
  numInferenceSteps = 30,
  guidanceScale = 2.5,
  enableSafetyChecker = true
}) {
  try {
    if (!isKieApiKeyConfigured()) {
      throw new Error('Kie AI API key not configured. Please add your API key in Settings.');
    }

    // Build Kie AI request for Qwen image-to-image
    const input = {
      model: 'qwen/image-to-image',
      input: {
        prompt: prompt.substring(0, 5000), // Max 5000 characters
        image_url: imageUrl,
        strength: strength,
        output_format: outputFormat.toLowerCase(),
        acceleration: acceleration,
        negative_prompt: negativePrompt.substring(0, 500), // Max 500 characters
        num_inference_steps: numInferenceSteps,
        guidance_scale: guidanceScale,
        enable_safety_checker: enableSafetyChecker
      }
    };

    // Add seed only if provided
    if (seed !== null && seed !== undefined) {
      input.input.seed = seed;
    }

    if (logs) {
      console.log('Kie AI Qwen request:', input);
    }

    // Create task
    onQueueUpdate?.({ status: 'STARTING' });
    const taskId = await createTask(input);

    if (logs) {
      console.log('Kie AI Qwen task created:', taskId);
    }

    // Poll for completion
    const result = await pollTaskStatus(taskId, onQueueUpdate);

    if (logs) {
      console.log('Kie AI Qwen result:', result);
    }

    // Normalize and return
    return normalizeKieResponse(result, taskId);
  } catch (error) {
    console.error('Error submitting Kie AI Qwen request:', error);
    throw error;
  }
}

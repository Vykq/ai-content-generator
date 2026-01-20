import { fal } from '@fal-ai/client';

// Configure fal client with API key from environment
const apiKey = import.meta.env.VITE_FAL_KEY;

if (apiKey) {
  fal.config({
    credentials: apiKey
  });
}

/**
 * Upload a file to fal.ai storage
 * @param {File} file - The file to upload
 * @returns {Promise<string>} - The uploaded file URL
 */
export async function uploadFile(file) {
  try {
    const url = await fal.storage.upload(file);
    return url;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

/**
 * Upload multiple files to fal.ai storage
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<string[]>} - Array of uploaded file URLs
 */
export async function uploadFiles(files, onProgress) {
  const urls = [];

  for (let i = 0; i < files.length; i++) {
    const url = await uploadFile(files[i]);
    urls.push(url);

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return urls;
}

/**
 * Submit an image edit request to fal.ai SeeD Dream v4.5
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The editing prompt
 * @param {string[]} params.imageUrls - Array of image URLs
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {boolean} params.enableSafetyChecker - Enable safety checker
 * @param {string} params.imageSize - Image size preset
 * @returns {Promise<Object>} - The result data
 */
export async function submitEditRequest({
  prompt,
  imageUrls,
  onQueueUpdate,
  logs = true,
  enableSafetyChecker = true,
  imageSize = 'square_hd'
}) {
  if (!apiKey) {
    throw new Error('FAL API key is not configured. Please set VITE_FAL_KEY in your .env file.');
  }

  try {
    const input = {
      prompt,
      image_urls: imageUrls,
      enable_safety_checker: enableSafetyChecker,
      image_size: imageSize
    };

    const result = await fal.subscribe('fal-ai/bytedance/seedream/v4.5/edit', {
      input,
      logs,
      onQueueUpdate
    });

    return result;
  } catch (error) {
    console.error('Error submitting edit request:', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }
}

/**
 * Submit an image edit request to fal.ai Nano Banana
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The editing prompt
 * @param {string[]} params.imageUrls - Array of image URLs
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {number} params.numImages - Number of images to generate (1-4)
 * @param {string} params.aspectRatio - Aspect ratio
 * @param {string} params.resolution - Resolution (1K, 2K, 4K)
 * @param {string} params.outputFormat - Output format (jpeg, png, webp)
 * @param {boolean} params.enableWebSearch - Enable web search
 * @returns {Promise<Object>} - The result data
 */
export async function submitNanoBananaRequest({
  prompt,
  imageUrls,
  onQueueUpdate,
  logs = true,
  numImages = 1,
  aspectRatio = 'auto',
  resolution = '1K',
  outputFormat = 'png',
  enableWebSearch = false
}) {
  if (!apiKey) {
    throw new Error('FAL API key is not configured. Please set VITE_FAL_KEY in your .env file.');
  }

  try {
    const input = {
      prompt,
      image_urls: imageUrls,
      num_images: numImages,
      aspect_ratio: aspectRatio,
      resolution,
      output_format: outputFormat,
      enable_web_search: enableWebSearch
    };

    const result = await fal.subscribe('fal-ai/nano-banana-pro/edit', {
      input,
      logs,
      onQueueUpdate
    });

    return result;
  } catch (error) {
    console.error('Error submitting Nano Banana request:', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }
}

/**
 * Submit a reference-to-video request to fal.ai Veo 3.1
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The video generation prompt
 * @param {string[]} params.imageUrls - Array of reference image URLs
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {string} params.aspectRatio - Aspect ratio (16:9, 9:16)
 * @param {string} params.duration - Video duration (8s)
 * @param {string} params.resolution - Video resolution (720p, 1080p, 4k)
 * @param {boolean} params.generateAudio - Generate audio
 * @param {boolean} params.autoFix - Auto fix prompts
 * @returns {Promise<Object>} - The result data
 */
export async function submitVeo31Request({
  prompt,
  imageUrls,
  onQueueUpdate,
  logs = true,
  aspectRatio = '16:9',
  duration = '8s',
  resolution = '720p',
  generateAudio = true,
  autoFix = false
}) {
  if (!apiKey) {
    throw new Error('FAL API key is not configured. Please set VITE_FAL_KEY in your .env file.');
  }

  try {
    const input = {
      prompt,
      image_urls: imageUrls,
      aspect_ratio: aspectRatio,
      duration,
      resolution,
      generate_audio: generateAudio,
      auto_fix: autoFix
    };

    const result = await fal.subscribe('fal-ai/veo3.1/reference-to-video', {
      input,
      logs,
      onQueueUpdate
    });

    return result;
  } catch (error) {
    console.error('Error submitting Veo 3.1 request:', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }
}

/**
 * Submit an image-to-image request to fal.ai Wan v2.6
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The editing prompt (max 2000 characters)
 * @param {string[]} params.imageUrls - Array of reference image URLs (1-3 images)
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {string} params.negativePrompt - Content to avoid (max 500 characters)
 * @param {string} params.imageSize - Image size preset or custom dimensions
 * @param {number} params.numImages - Number of images to generate (1-4)
 * @param {boolean} params.enablePromptExpansion - Enable LLM prompt optimization
 * @param {number} params.seed - Random seed for reproducibility
 * @param {boolean} params.enableSafetyChecker - Enable content moderation
 * @returns {Promise<Object>} - The result data
 */
export async function submitWanRequest({
  prompt,
  imageUrls,
  onQueueUpdate,
  logs = true,
  negativePrompt = '',
  imageSize = 'square_hd',
  numImages = 1,
  enablePromptExpansion = true,
  seed = null,
  enableSafetyChecker = true
}) {
  if (!apiKey) {
    throw new Error('FAL API key is not configured. Please set VITE_FAL_KEY in your .env file.');
  }

  try {
    const input = {
      prompt,
      image_urls: imageUrls,
      negative_prompt: negativePrompt,
      image_size: imageSize,
      num_images: numImages,
      enable_prompt_expansion: enablePromptExpansion,
      enable_safety_checker: enableSafetyChecker
    };

    // Only add seed if provided
    if (seed !== null && seed !== undefined) {
      input.seed = seed;
    }

    const result = await fal.subscribe('wan/v2.6/image-to-image', {
      input,
      logs,
      onQueueUpdate
    });

    console.log('Wan v2.6 API Result:', result);
    console.log('Result data:', result.data);
    console.log('Result images:', result.data?.images);

    return result.data || result;
  } catch (error) {
    console.error('Error submitting Wan v2.6 request:', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }
}

/**
 * Submit an image-to-video request to fal.ai Wan 2.5
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The motion prompt (max 800 characters)
 * @param {string} params.imageUrl - URL of the first frame image
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {string} params.resolution - Video resolution (480p, 720p, 1080p)
 * @param {string} params.duration - Video duration (5, 10)
 * @param {string} params.audioUrl - Optional background music URL
 * @param {string} params.negativePrompt - Content to avoid (max 500 characters)
 * @param {boolean} params.enablePromptExpansion - Enable LLM prompt rewriting
 * @param {number} params.seed - Random seed for reproducibility
 * @param {boolean} params.enableSafetyChecker - Enable content filtering
 * @returns {Promise<Object>} - The result data
 */
export async function submitWan25Request({
  prompt,
  imageUrl,
  onQueueUpdate,
  logs = true,
  resolution = '1080p',
  duration = '5',
  audioUrl = null,
  negativePrompt = '',
  enablePromptExpansion = true,
  seed = null,
  enableSafetyChecker = true
}) {
  if (!apiKey) {
    throw new Error('FAL API key is not configured. Please set VITE_FAL_KEY in your .env file.');
  }

  try {
    const input = {
      prompt,
      image_url: imageUrl,
      resolution,
      duration,
      negative_prompt: negativePrompt,
      enable_prompt_expansion: enablePromptExpansion,
      enable_safety_checker: enableSafetyChecker
    };

    // Add optional fields only if provided
    if (audioUrl) {
      input.audio_url = audioUrl;
    }
    if (seed !== null && seed !== undefined) {
      input.seed = seed;
    }

    const result = await fal.subscribe('fal-ai/wan-25-preview/image-to-video', {
      input,
      logs,
      onQueueUpdate
    });

    console.log('Wan 2.5 API Result:', result);
    console.log('Result data:', result.data);
    console.log('Result video:', result.data?.video);

    return result.data || result;
  } catch (error) {
    console.error('Error submitting Wan 2.5 request:', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }
}

/**
 * Submit an image edit request to fal.ai Flux 2 Pro
 * @param {Object} params - Request parameters
 * @param {string} params.prompt - The editing prompt
 * @param {string[]} params.imageUrls - Array of input image URLs
 * @param {Function} params.onQueueUpdate - Queue update callback
 * @param {boolean} params.logs - Enable logs
 * @param {string} params.imageSize - Image size preset or custom dimensions
 * @param {number} params.seed - Random seed for reproducibility
 * @param {number} params.safetyTolerance - Safety level (1-5)
 * @param {boolean} params.enableSafetyChecker - Enable content filtering
 * @param {string} params.outputFormat - Output format (jpeg, png)
 * @returns {Promise<Object>} - The result data
 */
export async function submitFlux2ProRequest({
  prompt,
  imageUrls,
  onQueueUpdate,
  logs = true,
  imageSize = 'auto',
  seed = null,
  safetyTolerance = 2,
  enableSafetyChecker = true,
  outputFormat = 'jpeg'
}) {
  if (!apiKey) {
    throw new Error('FAL API key is not configured. Please set VITE_FAL_KEY in your .env file.');
  }

  try {
    const input = {
      prompt,
      image_urls: imageUrls,
      image_size: imageSize,
      safety_tolerance: safetyTolerance,
      enable_safety_checker: enableSafetyChecker,
      output_format: outputFormat
    };

    // Only add seed if provided
    if (seed !== null && seed !== undefined) {
      input.seed = seed;
    }

    const result = await fal.subscribe('fal-ai/flux-2-pro/edit', {
      input,
      logs,
      onQueueUpdate
    });

    console.log('Flux 2 Pro API Result:', result);
    console.log('Result data:', result.data);
    console.log('Result images:', result.data?.images);

    return result.data || result;
  } catch (error) {
    console.error('Error submitting Flux 2 Pro request:', error);
    throw new Error(`Failed to submit request: ${error.message}`);
  }
}

/**
 * Check if API key is configured
 * @returns {boolean}
 */
export function isApiKeyConfigured() {
  return !!apiKey;
}

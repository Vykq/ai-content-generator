import * as fal from './falService';
import * as kie from './kieService';

const PROVIDER_STORAGE_KEY = 'ai_provider';

/**
 * Get current AI provider
 * @returns {'fal' | 'kie'}
 */
export function getCurrentProvider() {
  if (typeof localStorage === 'undefined') return 'fal';
  return localStorage.getItem(PROVIDER_STORAGE_KEY) || 'fal';
}

/**
 * Set current AI provider
 * @param {'fal' | 'kie'} provider
 */
export function setCurrentProvider(provider) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  }
}

/**
 * Get API key for current provider
 * @returns {string}
 */
export function getApiKey() {
  const provider = getCurrentProvider();
  return provider === 'kie' ? kie.getKieApiKey() : fal.getFalApiKey();
}

/**
 * Set API key for current provider
 * @param {string} key
 */
export function setApiKey(key) {
  const provider = getCurrentProvider();
  if (provider === 'kie') {
    kie.setKieApiKey(key);
  } else {
    fal.setFalApiKey(key);
  }
}

/**
 * Check if API key is configured for current provider
 * @returns {boolean}
 */
export function isApiKeyConfigured() {
  const provider = getCurrentProvider();
  return provider === 'kie' ? kie.isKieApiKeyConfigured() : fal.isApiKeyConfigured();
}

/**
 * Submit an image edit request (unified interface)
 * Routes to appropriate provider based on current selection
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} - The result data
 */
export async function submitEditRequest(params) {
  const provider = getCurrentProvider();

  if (provider === 'kie') {
    return await kie.submitEditRequest(params);
  } else {
    return await fal.submitEditRequest(params);
  }
}

/**
 * Upload a single file using the current provider
 * @param {File} file - File to upload
 * @returns {Promise<string>} - URL of uploaded file
 */
export async function uploadFile(file) {
  const provider = getCurrentProvider();

  if (provider === 'kie') {
    return await kie.uploadFile(file);
  } else {
    return await fal.uploadFile(file);
  }
}

/**
 * Upload multiple files using the current provider
 * @param {File[]} files - Array of files to upload
 * @param {Function} onProgress - Progress callback (current, total)
 * @returns {Promise<string[]>} - Array of uploaded file URLs
 */
export async function uploadFiles(files, onProgress) {
  const provider = getCurrentProvider();

  if (provider === 'kie') {
    return await kie.uploadFiles(files, onProgress);
  } else {
    return await fal.uploadFiles(files, onProgress);
  }
}

/**
 * Submit a Nano Banana Pro request using the current provider
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} - The result data
 */
export async function submitNanoBananaRequest(params) {
  const provider = getCurrentProvider();

  if (provider === 'kie') {
    return await kie.submitNanoBananaRequest(params);
  } else {
    return await fal.submitNanoBananaRequest(params);
  }
}

/**
 * Submit a Veo 3.1 video generation request using the current provider
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} - The result data
 */
export async function submitVeo31Request(params) {
  const provider = getCurrentProvider();

  if (provider === 'kie') {
    return await kie.submitVeo31Request(params);
  } else {
    return await fal.submitVeo31Request(params);
  }
}

// Re-export other Fal AI functions for models not yet supported by Kie AI
export {
  submitWanRequest,
  submitWan25Request,
  submitFlux2ProRequest,
  submitGemini3Request,
  submitZImageTurboRequest
} from './falService';

// Re-export Kie AI specific functions
export { submitQwenRequest } from './kieService';

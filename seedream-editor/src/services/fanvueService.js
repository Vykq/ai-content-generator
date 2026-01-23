const FANVUE_API_BASE = 'https://api.fanvue.com';
const FANVUE_AUTH_BASE = 'https://auth.fanvue.com/oauth2';
const STORAGE_KEYS = {
  accessToken: 'fanvue_access_token',
  refreshToken: 'fanvue_refresh_token',
  expiresAt: 'fanvue_expires_at',
  clientId: 'fanvue_client_id',
  clientSecret: 'fanvue_client_secret',
  redirectUri: 'fanvue_redirect_uri'
};

/**
 * Generate a random string for PKCE code verifier
 * @returns {string}
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

/**
 * Generate code challenge from verifier
 * @param {string} verifier
 * @returns {Promise<string>}
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

/**
 * Base64 URL encode
 * @param {Uint8Array} buffer
 * @returns {string}
 */
function base64URLEncode(buffer) {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Get stored FanVue access token
 * @returns {string}
 */
export function getFanVueToken() {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(STORAGE_KEYS.accessToken) || '';
}

/**
 * Set FanVue tokens
 * @param {Object} tokens
 * @param {string} tokens.access_token
 * @param {string} tokens.refresh_token
 * @param {number} tokens.expires_in - Seconds until expiration
 */
export function setFanVueTokens({ access_token, refresh_token, expires_in }) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.accessToken, access_token);
    if (refresh_token) {
      localStorage.setItem(STORAGE_KEYS.refreshToken, refresh_token);
    }
    if (expires_in) {
      const expiresAt = Date.now() + (expires_in * 1000);
      localStorage.setItem(STORAGE_KEYS.expiresAt, expiresAt.toString());
    }
  }
}

/**
 * Clear FanVue tokens
 */
export function clearFanVueTokens() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.refreshToken);
    localStorage.removeItem(STORAGE_KEYS.expiresAt);
  }
}

/**
 * Get stored OAuth client configuration
 * @returns {{clientId: string, clientSecret: string, redirectUri: string}}
 */
export function getOAuthConfig() {
  if (typeof localStorage === 'undefined') {
    return { clientId: '', clientSecret: '', redirectUri: '' };
  }
  return {
    clientId: localStorage.getItem(STORAGE_KEYS.clientId) || '',
    clientSecret: localStorage.getItem(STORAGE_KEYS.clientSecret) || '',
    redirectUri: localStorage.getItem(STORAGE_KEYS.redirectUri) || ''
  };
}

/**
 * Save OAuth client configuration
 * @param {Object} config
 * @param {string} config.clientId
 * @param {string} config.clientSecret
 * @param {string} config.redirectUri
 */
export function saveOAuthConfig({ clientId, clientSecret, redirectUri }) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.clientId, clientId);
    localStorage.setItem(STORAGE_KEYS.clientSecret, clientSecret);
    localStorage.setItem(STORAGE_KEYS.redirectUri, redirectUri);
  }
}

/**
 * Clear OAuth client configuration
 */
export function clearOAuthConfig() {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.clientId);
    localStorage.removeItem(STORAGE_KEYS.clientSecret);
    localStorage.removeItem(STORAGE_KEYS.redirectUri);
  }
}

/**
 * Initiate OAuth 2.0 authorization flow with PKCE
 * @param {Object} config
 * @param {string} config.clientId
 * @param {string} config.redirectUri
 * @returns {Promise<void>}
 */
export async function initiateOAuthFlow({ clientId, redirectUri }) {
  // Generate PKCE parameters
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateCodeVerifier(); // Random state for CSRF protection

  // Store code verifier and state in session storage (temporary)
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('fanvue_code_verifier', codeVerifier);
    sessionStorage.setItem('fanvue_oauth_state', state);
  }

  // Build authorization URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid offline_access offline read:self write:posts write:media',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state
  });

  const authUrl = `${FANVUE_AUTH_BASE}/auth?${params.toString()}`;

  // Redirect to FanVue authorization page
  window.location.href = authUrl;
}

/**
 * Handle OAuth callback and exchange code for tokens
 * @param {string} code - Authorization code from callback
 * @param {string} state - State parameter from callback
 * @param {Object} config
 * @param {string} config.clientId
 * @param {string} config.clientSecret
 * @returns {Promise<Object>} Token response
 */
export async function handleOAuthCallback(code, state, { clientId, clientSecret }) {
  // Verify state to prevent CSRF
  const storedState = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('fanvue_oauth_state')
    : null;

  if (state !== storedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }

  // Get code verifier from session storage
  const codeVerifier = typeof sessionStorage !== 'undefined'
    ? sessionStorage.getItem('fanvue_code_verifier')
    : null;

  if (!codeVerifier) {
    throw new Error('Code verifier not found');
  }

  try {
    const response = await fetch(`${FANVUE_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: codeVerifier,
        redirect_uri: getOAuthConfig().redirectUri
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to exchange token' }));
      throw new Error(error.error_description || error.error || 'Token exchange failed');
    }

    const tokens = await response.json();

    // Save tokens
    setFanVueTokens(tokens);

    // Clear session storage
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('fanvue_code_verifier');
      sessionStorage.removeItem('fanvue_oauth_state');
    }

    return tokens;
  } catch (error) {
    console.error('Error exchanging authorization code:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @returns {Promise<Object>} New tokens
 */
export async function refreshAccessToken() {
  const refreshToken = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.refreshToken)
    : null;

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const { clientId, clientSecret } = getOAuthConfig();

  try {
    const response = await fetch(`${FANVUE_AUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to refresh token' }));
      throw new Error(error.error_description || error.error || 'Token refresh failed');
    }

    const tokens = await response.json();
    setFanVueTokens(tokens);

    return tokens;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearFanVueTokens();
    throw error;
  }
}

/**
 * Check if FanVue is connected
 * @returns {boolean}
 */
export function isFanVueConnected() {
  const token = getFanVueToken();
  const expiresAt = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.expiresAt)
    : null;

  if (!token) return false;

  // Check if token is expired
  if (expiresAt && Date.now() > parseInt(expiresAt)) {
    return false;
  }

  return true;
}

/**
 * Make authenticated API request with automatic token refresh
 * @param {string} endpoint
 * @param {Object} options
 * @returns {Promise<Response>}
 */
async function apiRequest(endpoint, options = {}) {
  let token = getFanVueToken();

  // Check if token is expired
  const expiresAt = typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEYS.expiresAt)
    : null;

  if (expiresAt && Date.now() > parseInt(expiresAt) - 60000) { // Refresh 1 min before expiry
    try {
      await refreshAccessToken();
      token = getFanVueToken();
    } catch (error) {
      throw new Error('Session expired. Please reconnect your FanVue account.');
    }
  }

  if (!token) {
    throw new Error('Not authenticated with FanVue');
  }

  const response = await fetch(`${FANVUE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Fanvue-API-Version': '2025-06-26',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  return response;
}

/**
 * Get current user from FanVue API
 * @returns {Promise<Object>}
 */
export async function getCurrentUser() {
  try {
    const response = await apiRequest('/users/me');

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch user' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching current user:', error);
    throw error;
  }
}

/**
 * Upload media to FanVue
 * @param {File} file - The media file to upload
 * @returns {Promise<string>} - Media UUID
 */
export async function uploadMedia(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    // Use apiRequest without JSON content-type for multipart/form-data
    let token = getFanVueToken();
    const expiresAt = typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEYS.expiresAt)
      : null;

    if (expiresAt && Date.now() > parseInt(expiresAt) - 60000) {
      await refreshAccessToken();
      token = getFanVueToken();
    }

    const response = await fetch(`${FANVUE_API_BASE}/media`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Fanvue-API-Version': '2025-06-26'
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to upload media' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    const result = await response.json();
    return result.uuid;
  } catch (error) {
    console.error('Error uploading media:', error);
    throw new Error(`Failed to upload media: ${error.message}`);
  }
}

/**
 * Create a post on FanVue
 * @param {Object} params - Post parameters
 * @param {string} params.audience - "subscribers" or "followers-and-subscribers"
 * @param {string} params.text - Text content (max 5000 chars)
 * @param {string[]} params.mediaUuids - Array of media UUIDs
 * @param {number} params.price - Price in cents (optional, requires media)
 * @param {string} params.publishAt - ISO 8601 date/time (optional)
 * @param {string} params.expiresAt - ISO 8601 date/time (optional)
 * @returns {Promise<Object>} - Created post
 */
export async function createPost({
  audience,
  text = '',
  mediaUuids = [],
  price = null,
  publishAt = null,
  expiresAt = null
}) {
  try {
    const body = {
      audience,
      text
    };

    if (mediaUuids.length > 0) {
      body.mediaUuids = mediaUuids;
    }

    if (price !== null && price !== undefined) {
      body.price = price;
    }

    if (publishAt) {
      body.publishAt = publishAt;
    }

    if (expiresAt) {
      body.expiresAt = expiresAt;
    }

    const response = await apiRequest('/posts', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to create post' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating post:', error);
    throw error;
  }
}

// Use relative URL - works in both dev (with proxy) and production
// Use relative URL in production, localhost in development
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:2999/api" : "/api");
const TOKEN_KEY = "auth_token";
const USER_KEY = "current_user";

/**
 * Get stored authentication token
 * @returns {string|null}
 */
export function getAuthToken() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Set authentication token
 * @param {string} token
 */
export function setAuthToken(token) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

/**
 * Clear authentication token
 */
export function clearAuthToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

/**
 * Get current user from storage
 * @returns {Object|null}
 */
export function getCurrentUser() {
  if (typeof localStorage === "undefined") return null;
  const userJson = localStorage.getItem(USER_KEY);
  return userJson ? JSON.parse(userJson) : null;
}

/**
 * Set current user in storage
 * @param {Object} user
 */
export function setCurrentUser(user) {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

/**
 * Check if user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Register a new user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>}
 */
export async function register(username, password) {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Registration failed");
  }

  const data = await response.json();

  // Store token and user
  setAuthToken(data.token);
  setCurrentUser(data.user);

  return data.user;
}

/**
 * Login user
 * @param {string} username
 * @param {string} password
 * @returns {Promise<Object>}
 */
export async function login(username, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Login failed");
  }

  const data = await response.json();

  // Store token and user
  setAuthToken(data.token);
  setCurrentUser(data.user);

  return data.user;
}

/**
 * Logout user
 */
export function logout() {
  clearAuthToken();
  // Reload page to reset application state
  window.location.reload();
}

/**
 * Fetch current user info from server
 * @returns {Promise<Object>}
 */
export async function fetchUserInfo() {
  const token = getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
      throw new Error("Session expired");
    }
    throw new Error("Failed to fetch user info");
  }

  const user = await response.json();
  setCurrentUser(user);
  return user;
}

/**
 * Make authenticated API request
 * @param {string} endpoint
 * @param {Object} options
 * @returns {Promise<Response>}
 */
export async function authenticatedFetch(endpoint, options = {}) {
  const token = getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, clear token
  if (response.status === 401 || response.status === 403) {
    clearAuthToken();
  }

  return response;
}

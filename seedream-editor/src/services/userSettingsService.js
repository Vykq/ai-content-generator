import { authenticatedFetch } from './authService';

/**
 * Fetch user settings from server
 * @returns {Promise<Object>}
 */
export async function fetchUserSettings() {
  const response = await authenticatedFetch('/settings');

  if (!response.ok) {
    throw new Error('Failed to fetch settings');
  }

  return await response.json();
}

/**
 * Update user settings on server
 * @param {Object} settings
 * @returns {Promise<Object>}
 */
export async function updateUserSettings(settings) {
  const response = await authenticatedFetch('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update settings');
  }

  return await response.json();
}

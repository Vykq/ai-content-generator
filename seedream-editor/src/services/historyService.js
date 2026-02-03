import { getAuthToken } from './authService';

// Use relative URL in production, localhost in development
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:2999/api' : '/api');

export async function fetchHistory(page = 1, limit = 24) {
  try {
    const response = await fetch(`${API_URL}/history?page=${page}&limit=${limit}`);
    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching history:', error);
    return { items: [], total: 0, page, limit };
  }
}

export async function addHistoryItem(type, timestamp, settings, result) {
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available (optional - still works without auth)
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/history`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type,
        timestamp,
        settings,
        result
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add history item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error adding history item:', error);
    throw error;
  }
}

export async function deleteHistoryItem(id) {
  try {
    const response = await fetch(`${API_URL}/history/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete history item');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting history item:', error);
    throw error;
  }
}

export async function clearHistory() {
  try {
    const response = await fetch(`${API_URL}/history`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to clear history');
    }

    return await response.json();
  } catch (error) {
    console.error('Error clearing history:', error);
    throw error;
  }
}

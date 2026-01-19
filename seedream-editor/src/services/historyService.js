const API_URL = 'http://localhost:3001/api';

export async function fetchHistory() {
  try {
    const response = await fetch(`${API_URL}/history`);
    if (!response.ok) {
      throw new Error('Failed to fetch history');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching history:', error);
    return [];
  }
}

export async function addHistoryItem(type, timestamp, settings, result) {
  try {
    const response = await fetch(`${API_URL}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

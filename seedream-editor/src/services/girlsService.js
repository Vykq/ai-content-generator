const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';

export async function fetchGirls() {
  try {
    const response = await fetch(`${API_URL}/girls`);
    if (!response.ok) {
      throw new Error('Failed to fetch girls');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching girls:', error);
    return [];
  }
}

export async function getGirl(id) {
  try {
    const response = await fetch(`${API_URL}/girls/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch girl');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching girl:', error);
    throw error;
  }
}

export async function createGirl(name, handle, imageUrl, defaultPrompt) {
  try {
    const response = await fetch(`${API_URL}/girls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        handle,
        image_url: imageUrl,
        default_prompt: defaultPrompt
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create girl');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating girl:', error);
    throw error;
  }
}

export async function updateGirl(id, name, handle, imageUrl, defaultPrompt) {
  try {
    const response = await fetch(`${API_URL}/girls/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        handle,
        image_url: imageUrl,
        default_prompt: defaultPrompt
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update girl');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating girl:', error);
    throw error;
  }
}

export async function deleteGirl(id) {
  try {
    const response = await fetch(`${API_URL}/girls/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete girl');
    }

    return await response.json();
  } catch (error) {
    console.error('Error deleting girl:', error);
    throw error;
  }
}

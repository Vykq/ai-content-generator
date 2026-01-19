// Initialize fal client
const { fal } = window;

let imageCount = 1;

// Add new image input
function addImageInput() {
    if (imageCount >= 10) {
        alert('Maximum 10 images allowed');
        return;
    }

    imageCount++;
    const imageInputs = document.getElementById('imageInputs');
    const newRow = document.createElement('div');
    newRow.className = 'image-input-row';
    newRow.innerHTML = `
        <span class="image-label">Figure ${imageCount}:</span>
        <input type="url" class="image-url" placeholder="https://example.com/image${imageCount}.jpg">
        <button type="button" class="btn-remove" onclick="removeImageInput(this)">Remove</button>
    `;
    imageInputs.appendChild(newRow);
}

// Remove image input
function removeImageInput(button) {
    const row = button.parentElement;
    row.remove();

    // Renumber remaining images
    const rows = document.querySelectorAll('.image-input-row');
    imageCount = rows.length;
    rows.forEach((row, index) => {
        const label = row.querySelector('.image-label');
        label.textContent = `Figure ${index + 1}:`;
    });
}

// Show/hide sections
function showSection(sectionId) {
    document.getElementById(sectionId).style.display = 'block';
}

function hideSection(sectionId) {
    document.getElementById(sectionId).style.display = 'none';
}

// Update status
function updateStatus(message, isError = false) {
    const statusContent = document.getElementById('statusContent');
    statusContent.textContent = message;
    statusContent.className = isError ? 'error' : '';
    showSection('statusSection');
}

// Add log entry
function addLog(message) {
    const logsContent = document.getElementById('logsContent');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    const timestamp = new Date().toLocaleTimeString();
    logEntry.textContent = `[${timestamp}] ${message}`;
    logsContent.appendChild(logEntry);
    logsContent.scrollTop = logsContent.scrollHeight;
    showSection('logsSection');
}

// Display result
function displayResult(result) {
    const resultContent = document.getElementById('resultContent');

    let html = '';

    // Display images
    if (result.images && result.images.length > 0) {
        result.images.forEach((image, index) => {
            html += `
                <div>
                    <h3>Image ${index + 1}</h3>
                    <img src="${image.url}" alt="Generated image ${index + 1}" class="result-image">
                    <div class="result-info">
                        <p><strong>URL:</strong> <a href="${image.url}" target="_blank">${image.url}</a></p>
                        ${image.width ? `<p><strong>Width:</strong> ${image.width}px</p>` : ''}
                        ${image.height ? `<p><strong>Height:</strong> ${image.height}px</p>` : ''}
                        ${image.content_type ? `<p><strong>Content Type:</strong> ${image.content_type}</p>` : ''}
                    </div>
                </div>
            `;
        });
    }

    // Display other metadata
    if (result.seed !== undefined) {
        html += `<div class="result-info"><p><strong>Seed:</strong> ${result.seed}</p></div>`;
    }

    if (result.has_nsfw_concepts !== undefined) {
        html += `<div class="result-info"><p><strong>NSFW Detected:</strong> ${result.has_nsfw_concepts.join(', ') || 'None'}</p></div>`;
    }

    if (result.prompt) {
        html += `<div class="result-info"><p><strong>Prompt:</strong> ${result.prompt}</p></div>`;
    }

    resultContent.innerHTML = html;
    showSection('resultSection');
}

// Main submit function
async function submitRequest() {
    // Reset sections
    hideSection('statusSection');
    hideSection('logsSection');
    hideSection('resultSection');

    // Get API key
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        updateStatus('Please enter your FAL API key', true);
        return;
    }

    // Configure fal client
    fal.config({
        credentials: apiKey
    });

    // Get prompt
    const prompt = document.getElementById('prompt').value.trim();
    if (!prompt) {
        updateStatus('Please enter an editing prompt', true);
        return;
    }

    // Get image URLs
    const imageInputs = document.querySelectorAll('.image-url');
    const imageUrls = [];
    for (const input of imageInputs) {
        const url = input.value.trim();
        if (url) {
            imageUrls.push(url);
        }
    }

    if (imageUrls.length === 0) {
        updateStatus('Please add at least one reference image', true);
        return;
    }

    // Get options
    const enableLogs = document.getElementById('enableLogs').checked;

    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    try {
        updateStatus('Submitting request to fal.ai...');

        if (enableLogs) {
            showSection('logsSection');
            document.getElementById('logsContent').innerHTML = '';
            addLog('Starting image edit request...');
        }

        // Submit request
        const result = await fal.subscribe('fal-ai/bytedance/seedream/v4.5/edit', {
            input: {
                prompt: prompt,
                image_urls: imageUrls
            },
            logs: enableLogs,
            onQueueUpdate: (update) => {
                if (enableLogs) {
                    updateStatus(`Status: ${update.status}`);

                    if (update.status === 'IN_PROGRESS' && update.logs) {
                        update.logs.forEach(log => {
                            addLog(log.message);
                        });
                    }

                    if (update.status === 'IN_QUEUE') {
                        const position = update.position || 'unknown';
                        addLog(`Position in queue: ${position}`);
                    }
                }
            }
        });

        if (enableLogs) {
            addLog('Request completed successfully!');
        }

        updateStatus('Image edit completed successfully!');

        // Display result
        displayResult(result.data);

        // Log request ID
        if (result.requestId) {
            console.log('Request ID:', result.requestId);
            if (enableLogs) {
                addLog(`Request ID: ${result.requestId}`);
            }
        }

    } catch (error) {
        console.error('Error:', error);
        updateStatus(`Error: ${error.message}`, true);

        if (enableLogs) {
            addLog(`ERROR: ${error.message}`);
        }
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Generate Edited Image';
    }
}

// Load saved API key from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('falApiKey');
    if (savedKey) {
        document.getElementById('apiKey').value = savedKey;
    }

    // Save API key to localStorage when changed
    document.getElementById('apiKey').addEventListener('change', (e) => {
        const apiKey = e.target.value.trim();
        if (apiKey) {
            localStorage.setItem('falApiKey', apiKey);
        } else {
            localStorage.removeItem('falApiKey');
        }
    });
});

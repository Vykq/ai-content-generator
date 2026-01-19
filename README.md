# SeeD Dream v4.5 Image Editor

A web application for editing images using ByteDance's SeeD Dream v4.5 API via fal.ai.

## Features

- AI-powered image editing with natural language prompts
- Support for up to 10 reference images per edit
- Real-time progress logs and status updates
- Clean, modern interface
- Secure API key storage in browser localStorage

## Prerequisites

- A fal.ai API key (get one from [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys))
- A modern web browser
- A local web server (or simply open the HTML file directly)

## Setup

1. Clone or download this project
2. No installation required - it's a static web app!

## Usage

### Method 1: Open Directly

Simply open `index.html` in your web browser.

### Method 2: Use a Local Server (Recommended)

Using Python:
```bash
python -m http.server 8000
```

Using Node.js (with http-server):
```bash
npx http-server -p 8000
```

Then navigate to `http://localhost:8000` in your browser.

### Using the Application

1. **Enter your API Key**: Paste your fal.ai API key in the configuration section. The key will be saved in your browser for future use.

2. **Write your editing prompt**: Describe the edit you want to make. Reference images as "Figure 1", "Figure 2", etc.

   Example prompt:
   ```
   Replace the product in Figure 1 with that in Figure 2.
   For the title, copy the text in Figure 3 to the top of the screen.
   ```

3. **Add reference images**:
   - Paste URLs of the images you want to reference
   - Click "+ Add Image" to add more images (up to 10)
   - Click "Remove" to delete unwanted images

4. **Enable logs** (optional): Check the box to see real-time progress updates

5. **Click "Generate Edited Image"**: The app will submit your request and display the result

## API Details

### Endpoint
```
fal-ai/bytedance/seedream/v4.5/edit
```

### Authentication
The app uses the fal.ai API key for authentication, passed via the `fal.config()` method.

### Parameters
- **prompt** (required): Text description of the editing task
- **image_urls** (required): Array of reference image URLs (1-10 images)
- **logs** (optional): Enable progress logging

### Pricing
- $0.04 per image
- Commercial use allowed

## Example Use Cases

1. **Product Replacement**: Replace one product with another in a scene
2. **Text Addition**: Add text from one image to another
3. **Style Transfer**: Apply styling from reference images
4. **Background Changes**: Replace or modify backgrounds
5. **Multi-Image Composition**: Combine elements from multiple images

## Security Notes

- Your API key is stored in browser localStorage for convenience
- Never share your API key publicly
- The key is only sent to fal.ai servers (via HTTPS)
- You can clear the saved key by deleting it from the input field

## Troubleshooting

### "Please enter your FAL API key"
Make sure you've pasted a valid API key from fal.ai.

### "Please add at least one reference image"
Add at least one valid image URL in the reference images section.

### CORS Errors
If opening the file directly causes CORS issues, use a local web server instead.

### Request Fails
- Check that your API key is valid
- Verify that all image URLs are accessible
- Ensure your prompt references the correct figure numbers

## Resources

- [fal.ai Documentation](https://docs.fal.ai/)
- [SeeD Dream v4.5 Developer Guide](https://fal.ai/learn/devs/seedream-v4-5-developer-guide)
- [SeeD Dream v4.5 Prompt Guide](https://fal.ai/learn/devs/seedream-v4-5-prompt-guide)
- [API Authentication](https://docs.fal.ai/reference/platform-apis/authentication)

## License

This is a demonstration application. Please refer to fal.ai's terms of service for API usage terms.

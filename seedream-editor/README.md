# AI Image Editor

A web application for editing images using fal.ai's SeeD Dream v4.5 and Nano Banana Pro APIs.

## Features

- **Five AI Models**:
  - SeeD Dream v4.5 - Advanced image editing with reference images
  - Nano Banana Pro - Fast image generation with multiple aspect ratios
  - Veo 3.1 - Reference-to-video generation with audio
  - Wan v2.6 - Advanced image-to-image generation with prompt expansion
  - Wan 2.5 - Image-to-video generation with motion prompts

- **Girls Management**: Create and manage girl profiles with images, names, and handles

- **Sidebar Navigation**: Easy navigation between Generate and Girls sections

- **Modern UI**: Built with React, Tailwind CSS, and shadcn/ui components

- **Persistent History**: All generations are saved to SQLite database and accessible across sessions

- **State Management**: Settings persist when switching between tabs

- **Click to Restore**: Click any history item to restore its settings and results

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure API Key**:
   Create a `.env` file in the root directory:
   ```env
   VITE_FAL_KEY=your_fal_api_key_here
   ```

3. **Start the application**:

   **Option 1: Start both servers together** (Recommended)
   ```bash
   npm start
   ```

   **Option 2: Start servers separately**
   ```bash
   # Terminal 1 - Backend server
   npm run server

   # Terminal 2 - Frontend dev server
   npm run dev
   ```

4. **Access the application**:
   - Frontend: http://localhost:5173/
   - Backend API: http://localhost:3001/

## Usage

### SeeD Dream v4.5
1. Enter an editing prompt (e.g., "Replace the product in Figure 1 with that in Figure 2")
2. Upload reference images (drag & drop or click to browse)
3. Configure settings:
   - Image Size (square_hd, portrait, landscape, auto 2K/4K, etc.)
   - Enable/disable safety checker
   - Enable/disable progress logs
4. Click "Generate Edited Image"

### Nano Banana Pro
1. Enter an editing prompt
2. Upload reference images
3. Configure settings:
   - Number of images (1-4)
   - Aspect ratio (auto, 21:9, 16:9, 1:1, 9:16, etc.)
   - Resolution (1K, 2K, 4K)
   - Output format (PNG, JPEG, WebP)
   - Enable/disable web search
4. Click "Generate Edited Image"

### Veo 3.1
1. Enter a video generation prompt (max 20,000 characters)
2. Upload reference images (up to 8MB each)
3. Configure settings:
   - Aspect ratio (16:9, 9:16)
   - Duration (8 seconds)
   - Resolution (720p, 1080p, 4K)
   - Enable/disable audio generation
   - Enable/disable auto fix (rewrites prompts failing content policy)
4. Click "Generate Video"

### Wan v2.6
1. Enter a prompt (max 2000 characters, supports Chinese and English)
2. Upload reference images (1-3 required, order matters)
3. Configure settings:
   - Negative prompt (content to avoid, max 500 characters)
   - Image size (square_hd, portrait, landscape presets)
   - Number of images (1-4)
   - Seed (for reproducibility, optional)
   - Enable/disable prompt expansion (LLM optimization, adds 3-4 seconds)
   - Enable/disable safety checker
4. Click "Generate Images"

### Wan 2.5
1. Enter a motion prompt (max 800 characters)
2. Upload a first frame image (360-2000px, max 10MB)
3. Optional: Upload background audio (WAV/MP3, 3-30s, max 15MB)
4. Configure settings:
   - Resolution (480p, 720p, 1080p)
   - Duration (5 or 10 seconds)
   - Negative prompt (content to avoid, max 500 characters)
   - Seed (for reproducibility, optional)
   - Enable/disable prompt expansion (LLM rewriting)
   - Enable/disable safety checker
5. Click "Generate Video"
   - Processing time: 1-3 minutes (longer for 10s videos)

### Girls Management
1. Click "Girls" in the sidebar
2. Click "+ Add New Girl" button
3. Fill in the form:
   - Name: The girl's name
   - Handle: Username/handle (must be unique, e.g., @username)
   - Image: Upload a profile image
4. Click "Create" to save
5. Edit or delete existing girls using the buttons on each card

### History
- All generated images and videos are automatically saved to the database
- View history at the bottom of the page
- Click any history item to restore its settings and switch to the correct tab
- Hover over a history item to see a delete button (×)
- History persists across browser sessions

## API Endpoints

The backend server provides the following endpoints:

### History
- `GET /api/history` - Fetch all history items
- `POST /api/history` - Add a new history item
- `DELETE /api/history/:id` - Delete a specific history item
- `DELETE /api/history` - Clear all history

### Girls
- `GET /api/girls` - Fetch all girls
- `GET /api/girls/:id` - Fetch a specific girl
- `POST /api/girls` - Create a new girl (requires: name, handle, image_url)
- `PUT /api/girls/:id` - Update a girl
- `DELETE /api/girls/:id` - Delete a girl

## Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, SQLite3
- **APIs**: fal.ai (SeeD Dream v4.5, Nano Banana Pro, Veo 3.1, Wan v2.6, Wan 2.5)
- **UI Components**: Radix UI primitives

## Project Structure

```
seedream-editor/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   ├── ImageUpload.jsx
│   │   └── ...
│   ├── services/
│   │   ├── falService.js        # fal.ai API integration
│   │   └── historyService.js    # Database API client
│   ├── App.jsx           # Main application
│   ├── App.css          # Custom styles
│   └── index.css        # Global styles
├── server.js            # Backend API server
├── history.db           # SQLite database (auto-created)
├── .env                 # Environment variables (create this)
└── package.json
```

## Notes

- The database file `history.db` is automatically created on first run
- History includes all settings, prompts, and generated images/videos
- Images and videos are stored as URLs pointing to fal.ai's CDN
- The application uses a responsive grid layout that adapts to screen size
- Video generation may take longer than image generation depending on resolution

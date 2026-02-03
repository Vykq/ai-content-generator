# User Authentication System Guide

## Overview

The Seedream Editor now includes a complete user authentication system that allows multiple users to:
- Register their own accounts
- Login securely with username/password
- Store their own API keys privately
- See all generations in a public gallery with usernames

## Features

### For Users

1. **Account Registration**
   - Minimum 3 characters for username
   - Minimum 6 characters for password
   - Passwords are securely hashed with bcrypt

2. **Secure Login**
   - JWT token-based authentication
   - 30-day session expiration
   - Automatic token refresh

3. **Private Settings**
   - Each user has their own API keys (Fal AI, Kie AI, OpenAI)
   - Provider selection (Fal AI or Kie AI)
   - Default prompts saved per-user
   - Settings stored securely on the server

4. **Public Gallery**
   - All users can view everyone's generations
   - Each generation shows the creator's username
   - Community sharing while maintaining privacy

### For Developers

#### Database Schema

```sql
-- Users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Settings table
CREATE TABLE user_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  fal_api_key TEXT,
  kie_api_key TEXT,
  ai_provider TEXT DEFAULT 'fal',
  openai_api_key TEXT,
  default_json_prompt TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- History table (updated)
CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username TEXT,
  type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  prompt TEXT NOT NULL,
  settings TEXT NOT NULL,
  result TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

#### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
  - Body: `{ username, password }`
  - Returns: `{ token, user: { id, username } }`

- `POST /api/auth/login` - Login
  - Body: `{ username, password }`
  - Returns: `{ token, user: { id, username } }`

- `GET /api/auth/me` - Get current user info
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ id, username, created_at }`

**User Settings:**
- `GET /api/settings` - Get user settings (protected)
  - Headers: `Authorization: Bearer <token>`
  - Returns: `{ fal_api_key, kie_api_key, ai_provider, openai_api_key, default_json_prompt }`

- `PUT /api/settings` - Update user settings (protected)
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ fal_api_key, kie_api_key, ai_provider, openai_api_key, default_json_prompt }`

**History:**
- `GET /api/history` - Get all history (public)
  - Returns: Array of history items with usernames

- `POST /api/history` - Add history item (optional auth)
  - Headers: `Authorization: Bearer <token>` (optional)
  - Body: `{ type, timestamp, settings, result }`
  - If authenticated, username is saved with the generation

## File Structure

```
src/
├── services/
│   ├── authService.js          # Authentication logic (login, register, token management)
│   ├── userSettingsService.js  # User settings API calls
│   ├── kieService.js           # Kie AI API integration
│   ├── providerService.js      # Provider abstraction (Fal AI / Kie AI)
│   ├── falService.js           # Fal AI API integration (existing)
│   ├── historyService.js       # History API calls (updated with auth)
│   └── ...
├── components/
│   ├── AuthView.jsx            # Login/Register UI
│   ├── Sidebar.jsx             # Updated with user info and logout
│   └── ...
└── App.jsx                     # Main app with auth check

server.js                        # Backend with auth endpoints
```

## Security Features

1. **Password Security**
   - bcrypt hashing with 10 rounds
   - Passwords never stored in plain text
   - Never sent to client

2. **JWT Tokens**
   - Signed with secret key
   - 30-day expiration
   - Stored in localStorage
   - Verified on each protected request

3. **API Key Privacy**
   - Stored per-user on server
   - Never exposed to other users
   - Not in localStorage anymore

4. **Session Management**
   - Automatic token validation
   - Clean logout clears all state
   - Invalid tokens handled gracefully

## Usage Instructions

### For End Users

1. **First Time Setup:**
   ```
   1. Open http://localhost:5175
   2. Click "Register"
   3. Enter username (min 3 chars)
   4. Enter password (min 6 chars)
   5. Confirm password
   6. Click "Register"
   ```

2. **Logging In:**
   ```
   1. Open the app
   2. Enter username and password
   3. Click "Login"
   ```

3. **Configuring API Keys:**
   ```
   1. Click Settings (⚙️)
   2. Choose AI Provider (Fal AI or Kie AI)
   3. Enter your API key
   4. Click Save
   ```

4. **Generating Images:**
   - Works exactly as before
   - Your generations will show your username in the gallery

5. **Logging Out:**
   - Click "Logout" button in sidebar
   - You'll be returned to login screen

### For Developers/Admins

1. **Environment Variables:**
   ```bash
   # In production, set a secure JWT secret
   export JWT_SECRET="your-secure-random-string-here"

   # Port configuration
   export PORT=3002  # Backend API port
   ```

2. **Database Location:**
   - `history.db` in the root directory
   - Automatically created on first run
   - Contains users, settings, history, girls tables

3. **Running the App:**
   ```bash
   npm install           # Install dependencies (includes bcryptjs, jsonwebtoken)
   npm start            # Starts both backend (port 3002) and frontend (port 5175)
   ```

4. **Testing:**
   - Create multiple test users
   - Verify each user has separate settings
   - Check gallery shows all users' generations with usernames

## Migration from Old System

If you had existing localStorage data:
- Users will need to register and re-enter their API keys
- Old history items will show as "Anonymous" (no username)
- New generations will be tagged with the logged-in username

## Troubleshooting

**"Access token required" error:**
- User is not logged in
- Token expired
- Solution: Re-login

**"Username already exists" error:**
- Username is taken
- Solution: Choose a different username

**"Invalid username or password" error:**
- Wrong credentials
- Solution: Check spelling, try again

**Settings not loading:**
- Check browser console for errors
- Verify backend is running (port 3002)
- Check JWT token is valid

**Gallery not showing usernames:**
- Old history items don't have usernames (created before auth)
- New generations will show usernames correctly

## Future Enhancements

Potential features to add:
- Password reset functionality
- Email verification
- User profiles with avatars
- Private galleries (toggle visibility)
- Sharing specific generations
- Admin panel for user management
- Rate limiting per user
- Usage statistics per user
- API key encryption at rest
- Two-factor authentication (2FA)

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs (backend console)
3. Verify database exists and has correct schema
4. Ensure JWT_SECRET is consistent across restarts

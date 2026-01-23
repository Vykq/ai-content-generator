# FanVue OAuth 2.0 Integration Setup

This guide explains how to connect your FanVue account to the Seedream Editor using OAuth 2.0 authentication.

## Prerequisites

1. A FanVue creator account
2. Access to FanVue's developer/app management portal

## Setup Steps

### 1. Create a FanVue OAuth App

1. Log in to your FanVue account
2. Navigate to the developer settings or app management section
3. Create a new OAuth application
4. Note down your **Client ID** and **Client Secret**

### 2. Configure Redirect URI

In your FanVue OAuth app settings, add the following redirect URI:

```
http://localhost:5173
```

Or if you're deploying to production, use your production URL:
```
https://yourdomain.com
```

**Important:** The redirect URI must match exactly (including trailing slashes if any).

### 3. Configure OAuth in Seedream Editor

1. Open the Seedream Editor application
2. Navigate to **Settings** (⚙️ in the sidebar)
3. Scroll to the **FanVue Integration** section
4. Click **Setup OAuth**
5. Fill in the form:
   - **Client ID**: Paste your FanVue OAuth Client ID
   - **Client Secret**: Paste your FanVue OAuth Client Secret
   - **Redirect URI**: Enter the same redirect URI you configured in FanVue (e.g., `http://localhost:5173`)
6. Click **Save Configuration**

### 4. Connect Your FanVue Account

1. Click the **Connect FanVue** button
2. You'll be redirected to FanVue's authorization page
3. Review the requested permissions:
   - `openid` - Basic account access
   - `offline_access` - Keep you logged in
   - `read:self` - Read your profile information
   - `write:posts` - Create posts on your behalf
   - `write:media` - Upload media files
4. Click **Authorize** to grant access
5. You'll be redirected back to the Seedream Editor
6. If successful, you'll see "Connected as [your username]"

## Security Features

This implementation uses:

- **OAuth 2.0 Authorization Code Flow** - Industry standard for web applications
- **PKCE (Proof Key for Code Exchange)** - Required by FanVue to prevent authorization code interception
- **State Parameter** - CSRF protection
- **Automatic Token Refresh** - Tokens are automatically refreshed when they expire
- **Secure Storage** - Tokens stored in browser's localStorage

## Using the Integration

Once connected, you'll be able to:

1. **Upload Generated Content**: After generating an image or video, click "Upload to FanVue"
2. **Create Posts**: Fill in the post details:
   - **Audience**: Choose who can see the post (subscribers only or followers + subscribers)
   - **Text**: Post caption (max 5000 characters)
   - **Price**: Optional price in cents for paid content (requires media attachment)
   - **Publish At**: Schedule for future posting (optional)
   - **Expires At**: Set expiration date (optional)
3. **Submit**: Click submit to create the post on FanVue

## Troubleshooting

### "Invalid state parameter" Error
- This usually means the OAuth flow was interrupted. Clear your browser cache and try again.

### "Session expired" Error
- Your access token has expired and refresh failed. Click "Disconnect FanVue" and reconnect.

### "Redirect URI mismatch" Error
- The redirect URI in your settings doesn't match what's configured in your FanVue OAuth app. Make sure they match exactly.

### Can't find OAuth app settings in FanVue
- Contact FanVue support to request developer access if you don't see OAuth/API settings in your account.

## API Documentation

For more details about FanVue's API:
- API Reference: https://api.fanvue.com/docs/api-reference
- Authentication Guide: https://api.fanvue.com/docs/authentication/overview.mdx
- Quick Start: https://api.fanvue.com/docs/authentication/quick-start.mdx

## Security Note

**Never share your Client Secret publicly.** It should be kept secure and only stored locally in your browser. If compromised, regenerate it in your FanVue OAuth app settings immediately.

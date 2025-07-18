# Server Setup Guide for Mobile Group Quiz

## Overview
This application now uses a server-based approach to share quiz sessions across different mobile devices. The server handles:
- Quiz session creation and management
- Client submission storage
- Real-time analytics sharing
- Cross-device communication

## Server Options

### Option 1: JSONBin.io (Recommended for Testing)
1. Go to [JSONBin.io](https://jsonbin.io/)
2. Create a free account
3. Get your API key from the dashboard
4. Update `js/server.js` with your API key:
   ```javascript
   const API_KEY = 'your_actual_api_key_here';
   ```

### Option 2: Firebase (Production Ready)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Firestore Database
4. Get your Firebase config
5. Replace the server implementation with Firebase

### Option 3: Custom Backend
Create your own backend server with endpoints for:
- POST /session (create session)
- GET /session (get active session)
- PUT /session (update session)
- DELETE /session (end session)

## How It Works

### Owner Flow:
1. Owner logs in → Creates server session
2. Owner loads quiz → Quiz data stored on server
3. Owner starts session → Session becomes active
4. Owner monitors clients → Real-time updates from server

### Client Flow:
1. Client logs in → Checks server for active session
2. Client finds session → Gets quiz data from server
3. Client takes quiz → Submits answers to server
4. Owner sees results → Real-time analytics from server

## Fallback System
If the server is unavailable, the app falls back to localStorage for single-device testing.

## Testing
1. Set up your server (JSONBin.io recommended for quick testing)
2. Update the API key in `js/server.js`
3. Deploy to Netlify
4. Test with multiple devices

## Security Notes
- JSONBin.io is for testing only
- For production, use Firebase or custom backend
- Implement proper authentication
- Add rate limiting
- Secure API endpoints 
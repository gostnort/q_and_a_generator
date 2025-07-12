# Q&A Generator - Netlify Ready

A web-based Q&A quiz generator with owner/client architecture. The owner logs in to select quiz files, and clients can take the quiz once it's activated.

## Features

- **Owner/Client Architecture**: Single login interface with role-based access
- **Dynamic Quiz Generation**: Owner selects from ZIP files in the `/zip` folder
- **Real-time Tracking**: Owner sees client answers and statistics in real-time
- **Secure Session Management**: Automatic logout and session control
- **Netlify Ready**: Configured for easy deployment to Netlify

## How It Works

### For Owners
1. **Login**: Enter your registered email address
2. **Select Quiz**: Choose from available ZIP files in the `/zip` folder
3. **Monitor Results**: View questions with correct answers and client statistics
4. **Logout**: End session and deactivate quiz for all clients

### For Clients
1. **Login**: Enter any identifier when a quiz is active
2. **Take Quiz**: Complete the randomized questions
3. **View Results**: See your score and correct answers
4. **Automatic Logout**: Return to login when owner logs out

## File Structure

```
/
├── index.html          # Single entry point for all users
├── script.js           # Main application logic
├── styles.css          # All styling
├── config.js           # Owner email configuration
├── zip/                # Quiz files directory
│   ├── .gitkeep       # Ensures directory is tracked
│   └── sample*.zip    # Sample quiz file
├── js7z/              # ZIP extraction library
├── _redirects         # Netlify routing configuration
├── netlify.toml       # Netlify build configuration
└── README.md          # This file
```

## Quiz File Format

ZIP files in the `/zip` folder should contain:
- **CSV file**: Questions and answers
  - Row 1: Question text
  - Row 2: Image filename (optional)
  - Row 3+: Answer options (prefix with `` ` `` for correct answers)
- **Image files**: Referenced in the CSV (optional)
- **Password protection**: Supported (optional)

### Example CSV Structure:
```
"What is 2+2?","What color is the sky?","Which is larger?"
"","sky.jpg","elephant.jpg"
"`4","Blue","Elephant"
"3","`Blue","`Elephant"
"5","Green","Mouse"
"6","Red","Cat"
```

## Owner Configuration

Edit `config.js` to add authorized owner emails:

```javascript
const ownerIdentities = [
    'owner@example.com',
    'admin@example.com'
];
```

## Deployment to Netlify

### Method 1: Drag & Drop
1. Zip the entire project folder
2. Go to [Netlify](https://netlify.com)
3. Drag the ZIP file to the deploy area
4. Your site will be live instantly

### Method 2: Git Integration
1. Push code to GitHub repository
2. Connect repository to Netlify
3. Netlify will auto-deploy on every push

### Method 3: Netlify CLI
```bash
npm install -g netlify-cli
netlify deploy --prod
```

## Adding Quiz Files

### Via GitHub (Recommended)
1. Upload ZIP files to the `/zip` folder in your repository
2. Commit and push changes
3. Netlify will automatically redeploy

### Via Netlify Interface
1. Go to your Netlify site dashboard
2. Go to "Site settings" → "Build & deploy" → "Environment variables"
3. Upload files through the file manager (if available)

## Local Development

For local testing, you need a web server due to CORS restrictions:

### Option 1: Python
```bash
python -m http.server 8000
```

### Option 2: Node.js
```bash
npx serve
```

### Option 3: Chrome Development Mode (Windows)
```bash
# Double-click launch_dev_chrome.bat
```

## Session Management

- **Owner Session**: Controls quiz availability for all clients
- **Client Session**: Dependent on active owner session
- **Automatic Cleanup**: Logout clears all session data
- **Real-time Sync**: All clients automatically update when owner changes state

## Security Features

- **Email-based Owner Authentication**: Only registered emails can access owner features
- **Session Isolation**: Each session is independent
- **Automatic Logout**: Prevents unauthorized access
- **Answer Obfuscation**: Shared quizzes don't reveal correct answers easily

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **JavaScript Required**: Full functionality requires JavaScript enabled
- **File API Support**: Required for ZIP file processing

## Troubleshooting

### Quiz Not Loading
- Check if ZIP file exists in `/zip` folder
- Verify ZIP file contains valid CSV
- Check browser console for errors

### Owner Can't Login
- Verify email is listed in `config.js`
- Check for typos in email address
- Clear browser cache and try again

### Clients Can't Access Quiz
- Ensure owner is logged in and has selected a quiz
- Check if quiz file loaded successfully
- Verify client is using correct URL

## Technical Details

- **ZIP Processing**: Uses js7z library for client-side extraction
- **Session Storage**: localStorage for session management
- **Real-time Updates**: Storage events for cross-tab communication
- **Responsive Design**: Works on desktop and mobile devices
- **Print Support**: Built-in print functionality for quizzes

---

## Development Notes

This application is designed for simplicity and ease of deployment. The architecture uses client-side storage for session management, making it suitable for static hosting platforms like Netlify without requiring a backend server.

For production use with many concurrent users, consider implementing a proper backend with WebSocket support for real-time features.
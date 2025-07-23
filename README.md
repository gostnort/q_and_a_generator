# Q&A Generator - Real-Time Quiz Platform

A modern web-based quiz platform with real-time monitoring, multi-format archive support, and Firebase backend. Features owner dashboard for quiz management and client interface for interactive quiz participation.

## ✨ Features

### 🎯 **Real-Time Quiz Platform**
- **Owner Dashboard**: Upload, manage, and monitor quizzes in real-time
- **Client Interface**: Interactive quiz participation with immediate feedback
- **Live Monitoring**: Real-time tracking of participant answers and statistics
- **Session Management**: Start/stop quiz sessions with participant tracking

### 📱 **Mobile-First Design**
- **100% Mobile Optimized**: Designed specifically for mobile devices
- **Touch-Friendly Interface**: Large buttons and intuitive navigation
- **Responsive Layout**: Works perfectly on all screen sizes
- **Progressive Web App**: Fast loading and offline-capable

### 🚀 **Advanced Features**
- **Multi-Format Support**: Upload ZIP, 7Z, TAR.GZ, and GZ archives
- **Image Sharing**: Efficient shared image storage system
- **Real-Time Sync**: Firebase-powered real-time data synchronization
- **Smart Randomization**: Questions and options shuffled for fair assessment
- **Cascade Deletion**: Comprehensive data cleanup and consistency

## How It Works

### For Owners
1. **Login**: Enter your credentials (configured in `data/owners.json`)
2. **Upload Quiz**: Create new quizzes using archive upload
3. **Manage Quizzes**: View, select, and delete existing quizzes
4. **Start Session**: Launch quiz sessions for client participation
5. **Monitor Live**: Watch real-time participant statistics and answers
6. **End Session**: Stop sessions and optionally preserve data

### For Clients
1. **Login**: Enter your name to join active sessions
2. **Take Quiz**: Answer questions with images and multiple choice options
3. **Real-Time Submission**: Answers submitted immediately upon selection
4. **Instant Feedback**: See results with correct answers highlighted
5. **Session Awareness**: Automatic detection of active quiz sessions

## Project Structure

```
/
├── index.html              # Main application entry point
├── styles.css              # Mobile-first responsive styling
├── js/                     # JavaScript modules
│   ├── firebase_service.js # Firebase backend integration
│   ├── quiz_upload.js      # Quiz upload and processing
│   ├── owner_service.js    # Owner authentication and management
│   ├── owner.js            # Owner dashboard functionality
│   ├── client.js           # Client quiz interface
│   └── common.js           # Shared utilities
├── data/
│   └── owners.json         # Owner configuration and permissions
├── js7z/                   # Archive extraction library
│   ├── js7z.js            # JS7z main library
│   └── js7z.wasm          # WebAssembly binary
├── netlify.toml            # Netlify deployment configuration
├── 404.html                # Custom 404 error page
└── README.md               # This file
```

## Quiz Package Format

Upload quiz packages as compressed archives containing:

### Required Files:
- **quiz.csv**: Questions and answers in CSV format
- **images/**: Folder containing image files (optional)

### CSV Structure:
```csv
"What is 2+2?","What color is the sky?","Which is larger?"
"calc.jpg","sky.jpg","elephant.jpg"
"`4","Blue","Elephant"
"3","`Blue","`Elephant"
"5","Green","Mouse"
"6","Red","Cat"
```

**Format Rules:**
- **Column-based**: Each column represents one question
- **Row 1**: Question text
- **Row 2**: Image filename (optional, leave empty if no image)
- **Row 3+**: Answer options
- **Correct Answers**: Prefix with backtick `` ` `` (e.g., `` `4 ``)
- **Question Types**: Single correct = radio, multiple correct = checkbox

### Supported Archive Formats:
- **ZIP** (.zip)
- **7-Zip** (.7z)
- **Gzip** (.gz)
- **Tar Gzip** (.tar.gz, .tgz)

## Configuration

### Owner Management
Edit `data/owners.json` to configure authorized owners:

```json
{
  "owners": [
    {
      "username": "admin@example.com",
      "displayName": "Admin User",
      "role": "admin",
      "permissions": ["create_quiz", "manage_sessions", "view_analytics", "delete_quiz", "manage_owners"],
      "isActive": true
    }
  ],
  "settings": {
    "allowNewOwnerRegistration": false,
    "defaultPermissions": ["create_quiz", "manage_sessions"],
    "sessionTimeout": 3600000,
    "maxQuizzesPerOwner": 50
  }
}
```

### Firebase Configuration
Firebase configuration is embedded in the application code:
- **Firestore**: Real-time database for quizzes and sessions
- **Storage**: Shared image storage system
- **Security Rules**: Configured for read/write access

## Technical Architecture

### Firebase Backend
- **Firestore Collections**:
  - `quizzes`: Quiz data and questions
  - `sessions`: Active quiz sessions
  - `shared_images`: Efficient image storage
  - `users/{userName}/answers`: User-specific answer collections

### Real-Time Features
- **Live Monitoring**: Owner sees participant answers in real-time
- **Session Management**: Automatic session detection and updates
- **Participant Tracking**: Real-time client count and participation stats
- **Data Synchronization**: Firebase onSnapshot for live updates

### Archive Processing
- **JS7z Integration**: WebAssembly-based archive extraction
- **Multi-Format Support**: Handles ZIP, 7Z, GZ, TAR.GZ formats
- **Client-Side Processing**: No server-side dependencies required
- **Progress Tracking**: Real-time upload and processing feedback

### Security Features
- **Owner Authentication**: JSON-based owner management system
- **Permission System**: Granular role-based access control
- **Content Security Policy**: Strict CSP headers for security
- **Firebase Security Rules**: Database-level access control

## Deployment

### Netlify Deployment
1. Connect your GitHub repository to Netlify
2. Configure build settings:
   - **Build command**: None (static site)
   - **Publish directory**: `.` (root)
3. Deploy automatically on git push

### Environment Setup
- **No environment variables needed**: Firebase config is embedded
- **Static hosting compatible**: Runs entirely client-side
- **CDN optimized**: Fast global content delivery

## Browser Compatibility

- **Modern Browsers**: Chrome 80+, Safari 13+, Firefox 75+, Edge 80+
- **Mobile Support**: iOS Safari 13+, Chrome Mobile 80+
- **WebAssembly Required**: For archive extraction functionality
- **JavaScript Required**: Full functionality requires modern JavaScript

## Troubleshooting

### Quiz Upload Issues
- Verify archive contains `quiz.csv` file
- Check CSV format matches specification
- Ensure image files are web-compatible (JPG, PNG)
- Check browser console for detailed error messages

### Firebase Connection Issues
- Verify Firebase configuration is correct
- Check browser network tab for connection errors
- Ensure Firestore security rules allow access
- Clear browser cache and reload

### Archive Extraction Errors
- Ensure WebAssembly is supported in browser
- Try different archive format if one fails
- Check that JS7z library files are accessible
- Verify archive is not corrupted

### Real-Time Sync Problems
- Check Firebase project status
- Verify internet connection stability
- Refresh page to re-establish connection
- Check browser console for WebSocket errors

## Performance Optimization

- **Shared Image Storage**: Eliminates duplicate image uploads
- **Efficient Data Structure**: Optimized Firestore document organization
- **Real-Time Subscriptions**: Minimal data transfer with onSnapshot
- **Mobile-First Loading**: Optimized for mobile network conditions

## Development

### Local Development
1. Clone the repository
2. Serve files using a local web server (due to CORS restrictions)
3. Access via `http://localhost:PORT` (not file:// protocol)

### Adding Features
- **Owner Functions**: Extend `js/owner.js`
- **Client Functions**: Extend `js/client.js`
- **Firebase Operations**: Modify `js/firebase_service.js`
- **UI Styling**: Update `styles.css` (mobile-first approach)

---

**Version**: v2.0 | **Firebase Backend** | **Real-Time Platform** | **Mobile-First** | **Multi-Format Support** | **License**: MIT

**Live Demo**: [https://gostnort-review.netlify.app/](https://gostnort-review.netlify.app/)
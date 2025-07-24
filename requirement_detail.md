# Q&A Generator - Project Documentation

## Project Overview
A web-based quiz sharing platform built with Netlify (frontend hosting) and Firebase (backend services). Allows owners to upload quiz packages (archives with CSV + images) and enables real-time client participation with live monitoring.

### Key Features
- Multi-format archive support (ZIP, 7Z, GZ, TAR.GZ) using JS7z WebAssembly
- Shared image storage system to prevent duplication
- Real-time monitoring of client answers
- Role-based access control (admin owners vs clients)
- Cascade deletion for data integrity
- Mobile-optimized UI

### Technology Stack
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (SPA)
- **Backend**: Firebase Firestore (NoSQL database), Firebase Storage
- **Hosting**: Netlify with custom redirects and CSP headers
- **Archive Processing**: JS7z WebAssembly library
- **Authentication**: JSON-based owner management

---

## File Structure & Purposes

### Root Files
- `index.html` - Main SPA entry point, Firebase initialization, UI containers
- `styles.css` - Mobile-first CSS styling
- `netlify.toml` - Deployment config, redirects, CSP headers
- `404.html` - Error page for invalid routes
- `README.md` - Project documentation and setup guide

### JavaScript Files (`js/` directory)

#### `js/owner.js` - Owner Interface Logic
**Purpose**: Handles owner dashboard, quiz management, session control, and real-time monitoring

**Key Functions**:
- `initializeOwnerDashboard()` → `void` - Initializes owner interface
- `showUploadModal()` → `void` - Shows quiz upload modal
- `closeUploadModal()` → `void` - Hides upload modal and clears progress
- `uploadQuizPackage()` → `Promise<void>` - Main upload handler with JS7z extraction
- `loadQuizList()` → `Promise<void>` - Loads and displays quiz list from Firestore
- `selectQuiz(quizId: string)` → `Promise<void>` - Creates session and starts monitoring
- `deleteQuiz(quizId: string)` → `Promise<void>` - Cascade deletes quiz, sessions, answers
- `endSession(deleteAnswers: boolean = false)` → `Promise<void>` - Ends active session
- `cleanupSessionData(sessionId: string)` → `Promise<void>` - Deletes session answers only
- `startRealTimeMonitoring()` → `void` - Begins real-time answer monitoring
- `refreshMonitoring()` → `Promise<void>` - Manual refresh of monitoring data
- `displayRealTimeResults(data: Object)` → `void` - Updates UI with answer statistics
- `checkActiveSession()` → `Promise<void>` - Checks for existing active sessions
- `displayOwnerStats()` → `void` - Shows client participation statistics
- `loadOwnerManagement()` → `Promise<void>` - Loads owner list and permissions

#### `js/client.js` - Client Interface Logic
**Purpose**: Manages client quiz participation, answer submission, and UI rendering

**Key Functions**:
- `initializeClientInterface()` → `Promise<void>` - Initializes client interface
- `loadActiveQuiz()` → `Promise<void>` - Loads active session and quiz data
- `displayQuiz(session: Object)` → `void` - Renders quiz questions with images
- `updateAnswer(questionId: string, selectedOption: string, isMultiple: boolean)` → `void` - Updates answer state and submits to Firebase
- `submitQuiz()` → `void` - Calculates results and shows completion message
- `show404Page()` → `void` - Displays no active quiz message

#### `js/firebase_service.js` - Firebase Data Layer
**Purpose**: Centralized Firebase operations, abstracts Firestore interactions

**Key Functions**:
- `getAllQuizzes()` → `Promise<Array<Quiz>>` - Gets all quizzes with questions subcollection
- `getQuizWithImages(quizId: string)` → `Promise<Quiz>` - Gets quiz with resolved image data
- `createSession(quizId: string, quizName: string, questions: Array)` → `Promise<Session>` - Creates active session
- `getActiveSession()` → `Promise<Session|null>` - Gets current active session
- `endSession(sessionId: string, deleteAnswers: boolean)` → `Promise<void>` - Ends session, optionally deletes answers
- `deleteQuiz(quizId: string)` → `Promise<void>` - Cascade deletes quiz and related data
- `submitAnswer(sessionId: string, questionId: string, answers: Array<string>, userName: string)` → `Promise<string>` - Saves user answer
- `getRealTimeAnswers(sessionId: string)` → `Promise<Object>` - Gets aggregated answer statistics
- `onAnswersUpdate(sessionId: string, callback: Function)` → `Function` - Real-time answer listener

**Data Structures**:
```javascript
// Quiz Object
{
  id: string,
  name: string,
  createdAt: Date,
  questions: Array<Question>
}

// Question Object  
{
  id: string,
  text: string,
  imageId: string|null,
  imageData: {base64: string, originalName: string}|null,
  options: Array<{text: string, correct: boolean}>
}

// Session Object
{
  id: string,
  quizId: string,
  quizName: string,
  startTime: Date,
  isActive: boolean,
  questions: Array<Question>
}
```

#### `js/quiz_upload.js` - Quiz Upload Processing
**Purpose**: Handles CSV parsing, image processing, and structured Firebase upload

**Key Functions**:
- `parseQuizCSV(csvBuffer: Uint8Array)` → `Array<Question>` - Parses CSV into question objects
- `uploadImages(images: Array<{name: string, data: Uint8Array}>, onProgress: Function)` → `Promise<Map<string, string>>` - Uploads images to shared_images collection
- `replaceImageReferences(questions: Array, imageMap: Map)` → `Array<Question>` - Replaces image filenames with Firestore IDs
- `uploadQuizWithImageIds(quizName: string, questions: Array, onProgress: Function)` → `Promise<string>` - Creates quiz document and questions subcollection
- `uploadQuizPackage({quizName: string, quizCsv: Uint8Array, images: Array, onProgress: Function})` → `Promise<string>` - Main upload orchestrator

**CSV Format**:
```
Row 1: Question texts (comma-separated)
Row 2: Image filenames (comma-separated, optional)
Row 3+: Answer options (prefix with ` for correct answers)
```

#### `js/owner_service.js` - Owner Authentication & Management
**Purpose**: Manages owner permissions, authentication, and owner data

**Key Functions**:
- `loadOwners()` → `Promise<void>` - Loads owners.json configuration
- `isOwner(username: string)` → `boolean` - Checks if user is authorized owner
- `getOwnerInfo(username: string)` → `Object|null` - Gets owner details and permissions
- `getOwnerStats()` → `Object` - Returns owner statistics for dashboard
- `validateOwnerData(ownerData: Object)` → `boolean` - Validates owner configuration

**Owner Configuration** (`data/owners.json`):
```javascript
{
  "owners": [
    {
      "username": "admin",
      "displayName": "Administrator", 
      "email": "admin@example.com",
      "role": "admin",
      "permissions": ["manage_quizzes", "manage_sessions", "manage_owners"]
    }
  ],
  "settings": {
    "allowSelfRegistration": false,
    "defaultRole": "admin"
  }
}
```

#### `js/common.js` - Shared Utilities
**Purpose**: Common functions used across the application

**Key Functions**:
- `shuffleArray(array: Array)` → `Array` - Fisher-Yates shuffle algorithm
- `isValidOwner(username: string)` → `boolean` - Validates owner using owner_service
- `currentUser: string` - Global variable for current logged-in user

---

## Firebase Data Structure

### Collections

#### `quizzes/` Collection
```javascript
// Document: /quizzes/{quizId}
{
  quizName: string,
  createdAt: Timestamp
}

// Subcollection: /quizzes/{quizId}/questions/{questionId}
{
  text: string,
  imageId: string|null,  // Reference to shared_images
  options: Array<{text: string, correct: boolean}>
}
```

#### `shared_images/` Collection
```javascript
// Document: /shared_images/{imageId}
{
  originalName: string,
  base64: string,  // Base64 encoded image data
  uploadedAt: Timestamp
}
```

#### `sessions/` Collection  
```javascript
// Document: /sessions/{sessionId}
{
  quizId: string,
  quizName: string,
  startTime: Timestamp,
  isActive: boolean,
  questions: Array<Question>  // Denormalized for performance
}
```

#### `users/{userName}/answers/` Subcollection
```javascript
// Document: /users/{userName}/answers/{answerId}
{
  sessionId: string,
  questionId: string,
  answers: Array<string>,  // Selected option texts
  userName: string,
  timestamp: Timestamp
}
```

---

## Key Workflows

### Quiz Upload Workflow
1. **Archive Extraction**: JS7z extracts ZIP/7Z/GZ/TAR.GZ files
2. **CSV Parsing**: Parse quiz.csv into structured question data
3. **Image Upload**: Upload images to shared_images collection (chunked base64)
4. **Reference Mapping**: Replace image filenames with Firestore IDs
5. **Quiz Creation**: Create quiz document with questions subcollection

### Session Management Workflow
1. **Session Creation**: Owner selects quiz → creates active session
2. **Client Participation**: Clients load active session and quiz data
3. **Real-time Monitoring**: Owner sees live answer statistics
4. **Session End**: Owner ends session with optional answer cleanup

### Answer Submission Workflow
1. **Client Selection**: Client selects answer(s) for question
2. **Immediate Submission**: Answer auto-submitted to user's answers subcollection
3. **Real-time Aggregation**: Server aggregates answers across all users
4. **Live Updates**: Owner dashboard updates via Firestore listeners

---

## Error Handling & Edge Cases

### Stack Overflow Prevention
- **Large Image Processing**: Chunked base64 conversion (8KB chunks) for files >10KB
- **JS7z Timeout**: 30-second timeout for archive extraction
- **Memory Management**: Process images individually, not in batch

### Data Integrity
- **Cascade Deletion**: Deleting quiz removes sessions and user answers
- **Orphan Prevention**: Image references validated before quiz creation
- **Session Cleanup**: Optional answer deletion when ending sessions

### User Experience
- **Progress Feedback**: Detailed progress messages during upload
- **Error Recovery**: Clear error messages with recovery suggestions
- **Mobile Optimization**: Touch-friendly UI, responsive design

---

## Configuration Files

### `netlify.toml`
```toml
# Redirects
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security Headers
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://firestore.googleapis.com https://firebase.googleapis.com; frame-ancestors 'none'"
```

### Firebase Configuration (in `index.html`)
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyCT4VCPw8QoBrQ3H5VhLDMG7kudyEx_H_w",
  authDomain: "q-and-a-generator.firebaseapp.com", 
  projectId: "q-and-a-generator",
  storageBucket: "q-and-a-generator.firebasestorage.app",
  messagingSenderId: "1009574042925",
  appId: "1:1009574042925:web:a9c885ba6a6aec3ac087a4"
};
```

---

## Development Notes

### File Naming Convention
- Use underscores instead of dashes in JavaScript filenames (e.g., `owner_service.js` not `owner-service.js`)
- Prevents JavaScript module parsing issues

### Memory Preferences
- Avoid try/catch blocks except for external resources or string processing
- Handle git operations manually (no auto-commit/push)
- Mobile-first UI design approach

### Performance Optimizations
- Shared image storage prevents duplication
- Denormalized session data reduces client queries
- Real-time listeners use collectionGroup for efficiency
- Chunked processing for large files

---

## Future Enhancement Areas

1. **Authentication**: Replace JSON-based auth with Firebase Auth
2. **Image Optimization**: Add image compression/resizing
3. **Analytics**: Track quiz performance and user engagement  
4. **Offline Support**: Add service worker for offline quiz taking
5. **Bulk Operations**: Support multiple quiz uploads
6. **Export Features**: Export results to CSV/PDF
7. **Question Types**: Support for drag-drop, fill-in-blank questions

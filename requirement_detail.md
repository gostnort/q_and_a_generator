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

## Project File Structure

```
q_and_a_generator/
├── index.html                 # Main SPA entry point (12KB, 320 lines)
├── styles.css                 # Mobile-first CSS styling (27KB, 1547 lines)  
├── netlify.toml               # Deployment config, redirects, CSP headers (1.1KB, 38 lines)
├── 404.html                   # Error page for invalid routes (11KB, 397 lines)
├── README.md                  # Project documentation and setup guide (8.4KB, 227 lines)
├── requirement_detail.md      # This comprehensive documentation file (12KB, 322 lines)
├── LICENSE                    # MIT License file (1.1KB, 22 lines)
├── review.ico                 # Favicon for the application (33KB, 145 lines)
├── sample_quiz.zip           # Sample quiz package for testing (381KB)
│
├── js/                       # JavaScript application files
│   ├── owner.js              # Owner interface logic (20KB, 596 lines)
https://gostnort-review.netlify.app/│   ├── client.js             # Client interface logic (5.3KB, 152 lines)
│   ├── firebase_service.js   # Firebase data layer abstraction (15KB, 375 lines)
│   ├── quiz_upload.js        # Quiz upload processing (7.1KB, 179 lines)
│   ├── owner_service.js      # Owner authentication & management (6.6KB, 219 lines)
│   └── common.js             # Shared utility functions (1.1KB, 35 lines)
│
├── data/                     # Configuration and data files
│   └── owners.json           # Owner authentication configuration (557B, 19 lines)
│
├── js7z/                     # JS7z WebAssembly library for archive extraction
│   ├── js7z.js               # JavaScript wrapper for 7z functionality (100KB, 22 lines)
│   └── js7z.wasm             # WebAssembly binary for archive processing (1.4MB)
│
├── sample_quiz/              # Sample quiz data for testing and reference
│   ├── quiz.csv              # Sample quiz questions in CSV format (596B, 9 lines)
│   ├── pic (1).png           # Sample image 1 (87KB, 274 lines)
│   ├── pic (2).png           # Sample image 2 (149KB, 310 lines)
│   └── pic (3).png           # Sample image 3 (159KB, 450 lines)
│
└── .git/                     # Git version control directory
```

## File Structure & Purposes

### Root Files
- `index.html` - Main SPA entry point, Firebase initialization, UI containers
- `styles.css` - Mobile-first CSS styling with responsive design
- `netlify.toml` - Deployment config, redirects, CSP headers
- `404.html` - Error page for invalid routes and no active sessions
- `README.md` - Project documentation and setup guide
- `requirement_detail.md` - Comprehensive technical documentation (this file)
- `LICENSE` - MIT License for open source distribution
- `review.ico` - Application favicon
- `sample_quiz.zip` - Pre-packaged sample quiz for testing uploads

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
- `displayQuiz(session: Object)` → `void` - Renders quiz questions with images and proper input controls
- `updateAnswer(questionId: string, selectedOption: string, isMultiple: boolean)` → `void` - Updates answer state and submits to Firebase
- `submitQuiz()` → `void` - Calculates results and shows completion message
- `show404Page()` → `void` - Displays no active quiz message

**Input Control Behavior**:
- **Single-choice questions**: Displays radio buttons (only one option can be selected)
- **Multi-choice questions**: Displays checkboxes (multiple options can be selected)
- **Automatic detection**: Determines input type based on number of correct answers in question.options
- **Unique naming**: Radio buttons share the same name for mutual exclusion, checkboxes have unique names

**Client Interface UI Requirements**:
- **Title Display**: Shows quiz name without "Quiz" prefix in header
- **Score Display**: Shows score beside logout button after quiz submission
- **Score Format**: `correctCount/totalQuestions (percentage%)`
- **Score Styling**: Green background for passed (≥60%), red for failed (<60%)
- **Header Layout**: `[Quiz Name] [Username] [Score] [Logout Button]`

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

### Data Files (`data/` directory)

#### `data/owners.json` - Owner Configuration
**Purpose**: Stores authorized owner accounts and system settings
**Size**: 557 bytes, 19 lines
**Format**: JSON configuration file with owners array and settings object

### Library Files (`js7z/` directory)

#### `js7z/js7z.js` - Archive Processing Library
**Purpose**: JavaScript wrapper for 7z WebAssembly functionality
**Size**: 100KB, 22 lines
**Capabilities**: Extracts ZIP, 7Z, GZ, TAR.GZ, and other archive formats

#### `js7z/js7z.wasm` - WebAssembly Binary
**Purpose**: Compiled 7z extraction engine for client-side archive processing
**Size**: 1.4MB WebAssembly binary
**Performance**: High-speed archive extraction without server dependency

### Sample Data (`sample_quiz/` directory)

#### `sample_quiz/quiz.csv` - Sample Quiz Data
**Purpose**: Example CSV format for quiz questions and answers
**Size**: 596 bytes, 9 lines
**Structure**: Questions (row 1), images (row 2), options (rows 3+)

#### `sample_quiz/pic (1-3).png` - Sample Images
**Purpose**: Example images referenced in the sample quiz
**Sizes**: 87KB, 149KB, 159KB respectively
**Usage**: Demonstrates image integration in quiz questions

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

## Known Issues & Debugging

### Current Issues
1. **Firebase Collection Group Queries**: May encounter permission errors in Firestore console
   - **Error**: "The query requires a COLLECTION_GROUP_ASC index for collection 'answers'"
   - **Impact**: Real-time monitoring may not work until Firestore indexes are created
   - **Solution**: Firebase automatically creates indexes when queries are first executed

2. **Missing Input Controls**: Client interface may show options without radio buttons/checkboxes
   - **Symptoms**: Options display as plain text without selection controls
   - **Debug**: Check browser console for HTML generation logs and input element creation
   - **Cause**: Usually JavaScript execution issues, CSS styling problems, or script loading order
   - **Investigation**: Added detailed logging of input element creation and DOM manipulation

### Debugging Tools
- **Client Interface**: Added console.log statements in `displayQuiz()` function
- **Input Control Detection**: Logs show whether questions are detected as single/multi-choice
- **HTML Generation**: Final HTML output is logged for verification

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

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
├── index.html                 # Main SPA entry point
├── styles.css                 # Mobile-first CSS styling 
├── netlify.toml               # Deployment config, redirects, CSP headers 
├── 404.html                   # Error page for invalid routes 
├── README.md                  # Project documentation and setup guide 
├── requirement_detail.md      # This comprehensive documentation file 
├── LICENSE                    # MIT License file 
├── review.ico                 # Favicon for the application
├── sample_quiz.zip           # Sample quiz package for testing
│
├── js/                       # JavaScript application files
│   ├── owner.js              # Owner interface logic while input the owner identity on https://gostnort-review.netlify.app/
│   ├── client.js             # Client interface logic wile input a name without records on https://gostnort-review.netlify.app/
│   ├── firebase_service.js   # Firebase data layer abstraction 
│   ├── quiz_upload.js        # Quiz upload processing 
│   ├── owner_service.js      # Owner authentication & management 
│   └── common.js             # Shared utility functions
│
├── data/                     # Configuration and data files
│   └── owners.json           # Owner authentication configuration
├── js7z/                     # JS7z WebAssembly library for archive extraction
│   ├── js7z.js               # JavaScript wrapper for 7z functionality 
│   └── js7z.wasm             # WebAssembly binary for archive processing 
│
├── sample_quiz/              # Sample quiz data for testing and reference
│   ├── quiz.csv              # Sample quiz questions in CSV format 
│   ├── pic (1).png           # Sample image 1 
│   ├── pic (2).png           # Sample image 2 
│   └── pic (3).png           # Sample image 3 
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
- `initializeOwnerDashboard()` → `void` - Initialize dashboard and load data
- `uploadQuizPackage()` → `Promise<void>` - Handle quiz archive upload with JS7z extraction
- `selectQuiz(quizId: string)` → `void` - Start session with selected quiz
- `deleteQuiz(quizId: string)` → `Promise<void>` - Delete quiz with cascade cleanup
- `endSession()` → `Promise<void>` - End active session with optional answer cleanup  
- `refreshMonitoring()` → `Promise<void>` - Refresh real-time answer statistics
- `testFirebaseDB()` → `Promise<void>` - Comprehensive Firebase DB connectivity and functionality testing
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

## Firebase DB Testing & Diagnostics

### Firebase Test Button
The owner dashboard includes a comprehensive Firebase DB test button that performs 8 different tests to verify database connectivity and functionality.

#### How to Use
1. Login as an owner
2. Navigate to the owner dashboard
3. Click the blue "Test Firebase DB" button
4. View real-time test results below

#### Test Coverage

**1. Firebase Connection Test**
- Verifies Firebase app, database, and storage initialization
- Checks global Firebase objects availability
- **Pass Criteria**: All Firebase components properly loaded

**2. Firebase Service Test**
- Validates firebaseService methods are available
- Ensures service layer is properly loaded
- **Pass Criteria**: All service methods are accessible

**3. Get All Quizzes Test**
- Tests `getAllQuizzes()` functionality
- Measures query performance and response time
- **Pass Criteria**: Successfully retrieves quiz data with timing
- **Details**: Shows quiz count and question counts

**4. Get Active Session Test**
- Tests `getActiveSession()` functionality
- Checks for active quiz sessions
- **Pass Criteria**: Query executes successfully (result can be null)
- **Details**: Shows session details if active session exists

**5. Shared Images Collection Test**
- Tests read access to `shared_images` collection
- Verifies image storage functionality
- **Pass Criteria**: Successfully reads image collection
- **Details**: Shows image count and filenames

**6. Collection Group Query Test**
- Tests collection group queries on `answers` subcollection
- **Critical Test**: Identifies Firebase index requirements
- **Pass Criteria**: Query executes without index errors
- **Expected Behavior**: May fail initially, auto-resolves after index creation
- **Details**: Explains that index errors are normal for new projects

**7. Firestore Write Permissions Test**
- Tests write permissions by creating and deleting test document
- Validates security rules allow necessary operations
- **Pass Criteria**: Successfully creates and deletes test document
- **Details**: Measures write operation performance

**8. Real-time Listeners Test**
- Tests Firebase real-time listener functionality
- Validates onSnapshot operations for live monitoring
- **Pass Criteria**: Listener establishes within 3 seconds
- **Details**: Shows listener response time and session count

#### Test Results Interpretation

**🟢 All Tests Passed (100%)**
- Firebase DB is fully functional
- All operations working correctly
- No action required

**🟡 Most Tests Passed (70-99%)**
- Minor issues detected
- Check specific failed tests
- Common issues: index creation, network timeouts

**🔴 Multiple Failures (<70%)**
- Significant issues detected
- Check Firebase configuration
- Verify network connectivity and security rules

#### Common Expected Issues

**Collection Group Index Errors**
```
Error: The query requires a COLLECTION_GROUP_ASC index for collection 'answers'
```
- **Status**: Normal for new Firebase projects
- **Resolution**: Automatic - Firebase creates indexes on first query execution
- **Action**: No action required, will resolve after index creation

**Network Timeouts**
- **Cause**: Slow internet connection or Firebase service issues
- **Resolution**: Retry test or check network connectivity

**Permission Errors**
- **Cause**: Firebase security rules blocking operations
- **Resolution**: Review and update Firestore security rules

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
- **Firebase DB Test Button**: Comprehensive Firebase testing available on owner dashboard
  - Tests all major Firebase operations (connection, queries, permissions)
  - Identifies collection group index requirements
  - Provides detailed error reporting and performance metrics
  - Real-time test result display with pass/fail status

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

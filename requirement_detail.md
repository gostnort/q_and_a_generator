# Q&A Generator - Project Documentation

## Project Overview
A web-based quiz sharing platform built with Netlify (frontend hosting) and Firebase (backend services). Allows owners to upload quiz packages (archives with CSV + images) and enables real-time client participation with live monitoring.

### Key Features
- Multi-format archive support (ZIP, 7Z, GZ, TAR.GZ) using JS7z WebAssembly
- Shared image storage system to prevent duplication
- Real-time monitoring of client answers
- Role-based access control (admin owners vs clients)
- Database maintenance and cleanup tools
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
├── README.md                  # Chinese documentation for users
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

## Core Application Files

### Root Files
- `index.html` - Main SPA entry point, Firebase initialization, UI containers
- `styles.css` - Mobile-first CSS styling with responsive design
- `netlify.toml` - Deployment config, redirects, CSP headers
- `404.html` - Error page for invalid routes and no active sessions
- `README.md` - Chinese documentation for common users
- `requirement_detail.md` - Comprehensive technical documentation (this file)
- `LICENSE` - MIT License for open source distribution
- `review.ico` - Application favicon
- `sample_quiz.zip` - Pre-packaged sample quiz for testing uploads

### JavaScript Files (`js/` directory)

#### `js/owner.js` - Owner Interface Logic
**Purpose**: Handles owner dashboard, quiz management, session control, real-time monitoring, and database maintenance

**Key Functions**:
- `initializeOwnerDashboard()` → `void` - Initialize dashboard and load data
- `uploadQuizPackage()` → `Promise<void>` - Handle quiz archive upload with JS7z extraction
- `selectQuiz(quizId: string)` → `void` - Start session with selected quiz
- `deleteQuiz(quizId: string)` → `Promise<void>` - Delete quiz with cascade cleanup
- `endSession()` → `Promise<void>` - End active session with optional answer cleanup  
- `refreshMonitoring()` → `Promise<void>` - Refresh real-time answer statistics
- `displayRealTimeResults(data: Object)` → `void` - Updates UI with answer statistics
- `checkActiveSession()` → `Promise<void>` - Checks for existing active sessions
- `displayOwnerStats()` → `void` - Shows client participation statistics
- `loadOwnerManagement()` → `Promise<void>` - Loads owner list and permissions

**Database Maintenance Functions**:
- `loadSessionList()` → `Promise<void>` - Loads all sessions with user answer counts for database maintenance
- `deleteSession(sessionId: string)` → `Promise<void>` - Deletes session and all related user answers using cascade deletion
- `cleanupOrphanedAnswers()` → `Promise<void>` - Removes user answers that have no corresponding session

#### `js/client.js` - Client Interface Logic
**Purpose**: Manages client quiz participation, answer submission, and UI rendering

**Key Functions**:
- `initializeClientInterface()` → `Promise<void>` - Initializes client interface
- `loadActiveQuiz()` → `Promise<void>` - Loads active session and quiz data
- `displayQuiz(session: Object)` → `void` - Renders quiz questions with images and proper input controls using safe DOM manipulation
- `updateAnswer(questionId: string, selectedOption: string, isMultiple: boolean)` → `void` - Updates answer state and submits to Firebase
- `submitQuiz()` → `void` - Calculates results and shows completion message
- `show404Page()` → `void` - Displays no active quiz message

**Input Control Behavior**:
- **Single-choice questions**: Displays radio buttons (only one option can be selected)
- **Multi-choice questions**: Displays checkboxes (multiple options can be selected)
- **Automatic detection**: Determines input type based on number of correct answers in question.options
- **Unique naming**: Radio buttons share the same name for mutual exclusion, checkboxes have unique names

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

#### `js/quiz_upload.js` - Quiz Upload Processing
**Purpose**: Handles CSV parsing, image processing, and structured Firebase upload

**Key Functions**:
- `parseQuizCSV(csvBuffer: Uint8Array)` → `Array<Question>` - Parses CSV into question objects
- `uploadImages(images: Array<{name: string, data: Uint8Array}>, quizId: string, onProgress: Function)` → `Promise<Map<string, string>>` - Uploads images to shared_images collection with quiz tracking
- `replaceImageReferences(questions: Array, imageMap: Map)` → `Array<Question>` - Replaces image filenames with Firestore IDs
- `uploadQuizWithImageIds(quizName: string, questions: Array, onProgress: Function)` → `Promise<string>` - Creates quiz document and questions subcollection
- `uploadQuizPackage({quizName: string, quizCsv: Uint8Array, images: Array, onProgress: Function})` → `Promise<string>` - Main upload orchestrator

#### `js/owner_service.js` - Owner Authentication & Management
**Purpose**: Manages owner permissions, authentication, and owner data

**Key Functions**:
- `loadOwners()` → `Promise<void>` - Loads owners.json configuration
- `isOwner(username: string)` → `boolean` - Checks if user is authorized owner
- `getOwnerInfo(username: string)` → `Object|null` - Gets owner details and permissions
- `getOwnerStats()` → `Object` - Returns owner statistics for dashboard
- `validateOwnerData(ownerData: Object)` → `boolean` - Validates owner configuration

#### `js/common.js` - Shared Utilities
**Purpose**: Common functions used across the application

**Key Functions**:
- `shuffleArray(array: Array)` → `Array` - Fisher-Yates shuffle algorithm
- `isValidOwner(username: string)` → `boolean` - Validates owner using owner_service
- `currentUser: string` - Global variable for current logged-in user

---

## Database Maintenance System

### Overview
The platform includes comprehensive database maintenance tools to ensure data integrity and system health. These tools are accessible through the owner dashboard and provide automated cleanup capabilities.

### Maintenance Features

#### 1. Session Management
- **Session Listing**: View all sessions (active and ended) with detailed metadata
- **Session Information**: Display quiz name, session ID, start time, answer count, question count
- **Session Status**: Identify active vs ended sessions
- **Real-time Stats**: Show current participant counts and activity

#### 2. Cascade Deletion System
- **Session Deletion**: Automatically removes all related user answers when deleting sessions
- **Quiz Deletion**: Removes quiz, questions, sessions, answers, and related images
- **Image Cleanup**: Deletes shared images associated with removed quizzes
- **Batch Operations**: Uses Firebase batch writes for transactional deletion

#### 3. Orphaned Data Cleanup
- **Answer Orphan Detection**: Identifies user answers without corresponding active sessions
- **Automated Cleanup**: Batch removes orphaned answers to maintain database efficiency
- **Data Validation**: Cross-references answer sessionIds with active session list
- **Safety Confirmation**: Requires user confirmation before cleanup operations

#### 4. Image Tracking and Management
- **Quiz Association**: All shared images now track their parent quiz via `quizId` field
- **Cascade Image Deletion**: Removing quizzes automatically cleans up associated images
- **Storage Optimization**: Prevents accumulation of unused image files
- **Reference Integrity**: Maintains proper image-to-quiz relationships

#### 5. Data Integrity Monitoring
- **Real-time Validation**: Continuous monitoring of data relationships
- **Consistency Checks**: Automatic validation of session-answer relationships
- **Performance Optimization**: Regular cleanup improves query performance
- **Storage Management**: Efficient use of Firebase storage quotas

### Maintenance Workflows

#### Session Cleanup Workflow
1. **Load Session List**: Retrieve all sessions with answer counts
2. **Review Sessions**: Examine session details and associated data
3. **Select for Deletion**: Choose sessions to remove
4. **Cascade Delete**: Remove session and all related user answers
5. **Verification**: Confirm successful deletion

#### Orphaned Data Cleanup Workflow
1. **Scan Active Sessions**: Get list of all valid session IDs
2. **Query All Answers**: Retrieve all user answers across collections
3. **Identify Orphans**: Find answers without corresponding sessions
4. **Batch Cleanup**: Remove orphaned answers in batches
5. **Report Results**: Display cleanup statistics

#### Quiz Deletion Enhancement Workflow
1. **Quiz Selection**: Choose quiz for deletion
2. **Dependency Check**: Identify related sessions, answers, and images
3. **Cascade Planning**: Plan deletion sequence for data integrity
4. **Batch Execution**: Execute coordinated deletion across collections
5. **Cleanup Verification**: Ensure complete removal of all related data

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
  quizId: string,  // Reference to parent quiz for cascade deletion
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
3. **Quiz Creation**: Create quiz document first to get quizId
4. **Image Upload**: Upload images to shared_images collection with quizId tracking (chunked base64)
5. **Reference Mapping**: Replace image filenames with Firestore IDs
6. **Questions Upload**: Create questions subcollection with image references

### Session Management Workflow
1. **Session Creation**: Owner selects quiz → creates active session
2. **Client Participation**: Clients load active session and quiz data
3. **Real-time Monitoring**: Owner sees live answer statistics
4. **Session End**: Owner ends session with optional answer cleanup

### Database Maintenance Workflow
1. **Session Listing**: Load all sessions with answer counts and metadata
2. **Session Deletion**: Delete session and cascade delete all related user answers
3. **Orphaned Cleanup**: Identify and remove answers without corresponding sessions
4. **Quiz Deletion**: Delete quiz, questions, sessions, answers, and related images
5. **Image Tracking**: Shared images track parent quiz for proper cleanup

### Answer Submission Workflow
1. **Client Selection**: Client selects answer(s) for question
2. **Immediate Submission**: Answer auto-submitted to user's answers subcollection
3. **Real-time Aggregation**: Server aggregates answers across all users
4. **Live Updates**: Owner dashboard updates via Firestore listeners

---

## Configuration Files

### Owner Configuration (`data/owners.json`)
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

### CSV Format Specification
```
Row 1: Question texts (comma-separated)
Row 2: Image filenames (comma-separated, optional)
Row 3+: Answer options (prefix with ` for correct answers)
```

### Netlify Configuration (`netlify.toml`)
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

### Firebase Configuration (embedded in `index.html`)
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

## Performance Optimizations

### Memory Management
- **Chunked Processing**: Large image files processed in 8KB chunks
- **Individual Processing**: Images processed one at a time to prevent stack overflow
- **Timeout Protection**: 30-second timeout for archive extraction operations

### Data Efficiency
- **Shared Image Storage**: Prevents duplicate image uploads across quizzes
- **Denormalized Session Data**: Reduces client queries for better performance
- **Collection Group Queries**: Efficient cross-collection answer aggregation
- **Real-time Listeners**: Minimal data transfer with Firebase onSnapshot

### Storage Optimization
- **Cascade Deletion**: Automatic cleanup prevents database bloat
- **Orphan Removal**: Regular cleanup of unused data maintains efficiency
- **Image Tracking**: Proper image-quiz relationships enable effective cleanup
- **Batch Operations**: Transactional operations ensure data consistency

---

## Error Handling

### Upload Error Management
- **Archive Validation**: Verify archive integrity before processing
- **CSV Format Validation**: Check CSV structure and content
- **Image Processing**: Handle corrupted or oversized images gracefully
- **Progress Feedback**: Detailed error reporting during upload process

### Database Error Handling
- **Connection Failures**: Graceful handling of Firebase connectivity issues
- **Permission Errors**: Clear messaging for access control violations
- **Index Creation**: Automatic handling of Firebase index creation delays
- **Batch Operation Failures**: Rollback capabilities for failed batch operations

### Client Interface Error Management
- **Session Availability**: Handle cases where no active session exists
- **Answer Submission**: Retry mechanisms for failed answer submissions
- **Real-time Sync**: Reconnection handling for interrupted connections
- **Input Validation**: Prevent invalid answer submissions

---

## Development Guidelines

### File Naming Conventions
- Use underscores instead of dashes in JavaScript filenames
- Prevents JavaScript module parsing issues
- Consistent naming across all project files

### Code Organization
- **Modular Structure**: Separate concerns into dedicated files
- **Service Layer**: Centralized Firebase operations in firebase_service.js
- **Error Boundaries**: Consistent error handling patterns
- **Mobile-First**: UI optimized for mobile devices primarily

### Performance Considerations
- **Minimize DOM Manipulation**: Use efficient DOM update patterns
- **Batch Firebase Operations**: Group related database operations
- **Optimize Real-time Listeners**: Efficient query patterns for live updates
- **Memory Management**: Proper cleanup of listeners and resources

---

## Future Enhancement Opportunities

### Authentication System
- **Firebase Auth Integration**: Replace JSON-based authentication
- **OAuth Providers**: Support for Google, GitHub, Microsoft logins
- **Role Management**: Enhanced permission system with fine-grained controls
- **User Registration**: Self-service owner registration system

### Advanced Features
- **Question Types**: Support for drag-drop, fill-in-blank, matching questions
- **Analytics Dashboard**: Detailed quiz performance and engagement metrics
- **Export Capabilities**: CSV/PDF export of results and statistics
- **Bulk Operations**: Multiple quiz upload and management tools

### Performance Enhancements
- **Image Optimization**: Automatic image compression and resizing
- **Offline Support**: Service worker implementation for offline quiz taking
- **Caching Strategy**: Intelligent caching for improved load times
- **Progressive Loading**: Lazy loading of quiz content and images

### User Experience
- **Collaborative Features**: Multiple owner collaboration on quizzes
- **Theming System**: Customizable UI themes and branding
- **Accessibility**: Enhanced screen reader and keyboard navigation support
- **Internationalization**: Multi-language support for global deployment

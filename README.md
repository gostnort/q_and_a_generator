# Q&A Generator - Multi-Client Edition

A web-based Q&A quiz generator with owner/client architecture and role-based question randomization. Features clean mobile-first UI and simple CSV-based quiz management.

## ✨ Features

### 🎯 **Role-Based Experience**
- **Owner Interface**: See questions and options in original order for monitoring
- **Client Interface**: Get randomized questions and shuffled options for unique experience
- **Role Detection**: Automatic role assignment based on configured owner emails
- **Enhanced Analytics**: Real-time tracking of client answer selections

### 📱 **Mobile-First Design**
- **100% Mobile Optimized**: Designed specifically for cellphone use
- **Touch-Friendly Interface**: Large buttons and touch targets
- **Responsive Layout**: Single-column design that works perfectly on small screens
- **Single Page Application**: All functionality in one page for better performance

### 🎲 **Smart Randomization**
- **Client Randomization**: Questions and answer options shuffled for each client
- **Owner Monitoring**: Original sequence preserved for quiz administrators
- **Fair Assessment**: Each client gets a unique but equivalent quiz experience
- **Real-time Analytics**: Live tracking of option selection counts

## How It Works

### For Owners
1. **Login**: Enter your name (must match owner email pattern)
2. **Dashboard**: Access owner dashboard with quiz selection
3. **Select Quiz**: Choose from available quizzes in the dropdown
4. **Monitor**: View questions in original order with correct answers highlighted
5. **Analytics**: See real-time client answer counts for each question
6. **Logout**: Return to login page when finished

### For Clients
1. **Login**: Enter your name (shown on host page)
2. **Quiz Interface**: Access quiz when owner starts session
3. **Take Quiz**: Complete randomized questions with shuffled options
4. **Submit**: Get immediate feedback with correct answers highlighted
5. **Results**: View score and performance summary

## File Structure

```
/
├── index.html          # Single page application (login + owner + client)
├── collections/        # Quiz collections and configuration
│   ├── config.js       # Owner email and quiz configuration
│   └── sample/         # Individual quiz folders
│       ├── quiz.csv    # Quiz questions and answers
│       └── *.png       # Optional images
├── js/                 # JavaScript modules
│   ├── common.js       # Shared utilities and analytics
│   ├── owner.js        # Owner-specific logic
│   └── client.js       # Client-specific logic
├── styles.css          # Mobile-first responsive styling
├── _redirects          # Netlify routing configuration
├── netlify.toml        # Netlify build configuration
└── README.md           # This file
```

## Quiz File Format

Each quiz is a folder in `/collections/` containing:
- **quiz.csv**: Questions and answers in CSV format
- **Images**: Optional image files referenced in the CSV

### CSV Structure:
```csv
"What is 2+2?","What color is the sky?","Which is larger?"
"","sky.jpg","elephant.jpg"
"`4","Blue","Elephant"
"3","`Blue","`Elephant"
"5","Green","Mouse"
"6","Red","Cat"
```

**Format Rules:**
- **Row 1**: Question text
- **Row 2**: Image filename (optional, leave empty if no image)
- **Row 3+**: Answer options
- **Correct Answers**: Prefix with backtick `` ` `` (e.g., `` `4 ``)
- **Multiple Choice**: One correct answer = radio buttons
- **Multiple Select**: Multiple correct answers = checkboxes

## Configuration

### Owner Setup
Edit `collections/config.js` to add authorized owner emails:

```javascript
const ownerIdentities = [
    'owner@example.com',
    'teacher@school.edu'
];

const testFolders = ['sample', 'quiz2', 'quiz3'];
```

### Adding New Quizzes
1. Create a new folder in `/collections/` (e.g., `/collections/myquiz/`)
2. Add `quiz.csv` with your questions
3. Add any image files referenced in the CSV
4. Update `testFolders` array in `collections/config.js`

## Technical Features

- **Single Page Application**: All functionality in one page for better performance
- **Enhanced Analytics**: Real-time tracking of client answer selections
- **Pure Client-Side**: No backend required, runs entirely in browser
- **Mobile-Optimized**: 100% mobile-first design for cellphone use
- **Role-Based Interface**: Dynamic interface switching based on user role
- **Shared Utilities**: Common JavaScript modules for efficiency
- **CSV Processing**: Simple text-based quiz format
- **Image Support**: Optional images for questions
- **Touch-Friendly**: Large buttons and easy navigation
- **Instant Feedback**: Immediate results with answer highlighting
- **404 Protection**: Non-owners see 404 when no active session

## Browser Compatibility

- **Modern Mobile Browsers**: Chrome, Safari, Firefox on iOS/Android
- **Desktop Support**: Also works on desktop browsers
- **JavaScript Required**: Full functionality requires JavaScript enabled

## Troubleshooting

### Quiz Not Loading
- Check if quiz folder exists in `/collections/`
- Verify `quiz.csv` file is present and properly formatted
- Check browser console for errors
- Ensure quiz is listed in `testFolders` array

### Owner Can't Login
- Verify email pattern matches in `collections/config.js` `ownerIdentities`
- Check for typos in name/email
- Clear browser cache and try again

### Images Not Displaying
- Verify image files are in the same folder as `quiz.csv`
- Check image filenames match exactly (case-sensitive)
- Ensure images are web-compatible formats (jpg, png, gif)

## Architecture Notes

### Single Page Application
- **Unified Interface**: Login, owner dashboard, and client quiz in one page
- **Dynamic Switching**: JavaScript handles interface transitions
- **State Management**: LocalStorage for session persistence
- **Enhanced Analytics**: Real-time option selection tracking

### Mobile-First Design
- **Touch Targets**: All buttons sized for easy finger tapping
- **Single Column**: Vertical layout optimized for portrait orientation
- **Responsive Text**: Font sizes optimized for small screens
- **Minimal UI**: Clean, distraction-free interface

### Enhanced Analytics
- **Real-time Tracking**: Live updates of client answer selections
- **Option Counts**: Display format "X of A; Y of B; Z of C"
- **Question Performance**: Success rates and response counts
- **Owner Visibility**: Correct answers always visible regardless of randomization

### Static Hosting Compatible
- **No Backend**: Runs entirely in browser
- **Netlify Optimized**: Built specifically for Netlify deployment
- **Fast Loading**: Minimal dependencies and optimized assets

---

**Version**: v0.3 | **Single Page App** | **Enhanced Analytics** | **Mobile-First** | **Netlify Ready** | **License**: MIT
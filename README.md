# Q&A Generator - Multi-Client Edition

A web-based Q&A quiz generator with owner/client architecture and role-based question randomization. Features clean mobile-first UI and simple CSV-based quiz management.

## ✨ Features

### 🎯 **Role-Based Experience**
- **Owner Interface**: See questions and options in original order for monitoring
- **Client Interface**: Get randomized questions and shuffled options for unique experience
- **Role Detection**: Automatic role assignment based on configured owner emails

### 📱 **Mobile-First Design**
- **100% Mobile Optimized**: Designed specifically for cellphone use
- **Touch-Friendly Interface**: Large buttons and touch targets
- **Responsive Layout**: Single-column design that works perfectly on small screens

### 🎲 **Smart Randomization**
- **Client Randomization**: Questions and answer options shuffled for each client
- **Owner Monitoring**: Original sequence preserved for quiz administrators
- **Fair Assessment**: Each client gets a unique but equivalent quiz experience

## How It Works

### For Owners
1. **Login**: Enter your registered email address on the main page
2. **Dashboard**: Automatically redirected to dedicated owner dashboard
3. **Select Quiz**: Choose from available quizzes in the dropdown
4. **Monitor**: View questions in original order with correct answers highlighted
5. **Logout**: Return to login page when finished

### For Clients
1. **Login**: Enter any username on the main page
2. **Quiz Interface**: Automatically redirected to dedicated client interface
3. **Select Quiz**: Choose from available quizzes
4. **Take Quiz**: Complete randomized questions with shuffled options
5. **Submit**: Get immediate feedback with correct answers highlighted
6. **Results**: View score and performance summary

## File Structure

```
/
├── index.html          # Login page (main entry point)
├── pages/              # Application pages
│   ├── owner.html      # Owner dashboard
│   ├── client.html     # Client quiz interface
│   └── 404.html        # Error page
├── js/                 # JavaScript modules
│   ├── common.js       # Shared utilities
│   ├── owner.js        # Owner-specific logic
│   └── client.js       # Client-specific logic
├── styles.css          # Mobile-first responsive styling
├── config.js           # Owner email and quiz configuration
├── tests/              # Quiz directory
│   └── sample/         # Individual quiz folders
│       ├── quiz.csv    # Quiz questions and answers
│       └── *.jpg       # Optional images
├── _redirects          # Netlify routing configuration
├── netlify.toml        # Netlify build configuration
└── README.md           # This file
```

## Quiz File Format

Each quiz is a folder in `/tests/` containing:
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
Edit `config.js` to add authorized owner emails:

```javascript
const ownerIdentities = [
    'owner@example.com',
    'teacher@school.edu'
];

const testFolders = ['sample', 'quiz2', 'quiz3'];
```

### Adding New Quizzes
1. Create a new folder in `/tests/` (e.g., `/tests/myquiz/`)
2. Add `quiz.csv` with your questions
3. Add any image files referenced in the CSV
4. Update `testFolders` array in `config.js`

## Technical Features

- **Modular Architecture**: Clean separation between owner and client functionality
- **Pure Client-Side**: No backend required, runs entirely in browser
- **Mobile-Optimized**: 100% mobile-first design for cellphone use
- **Role-Based Routing**: Automatic redirection to appropriate interface
- **Dedicated Pages**: Separate HTML pages for owner dashboard and client quiz
- **Shared Utilities**: Common JavaScript modules for efficiency
- **CSV Processing**: Simple text-based quiz format
- **Image Support**: Optional images for questions
- **Touch-Friendly**: Large buttons and easy navigation
- **Instant Feedback**: Immediate results with answer highlighting

## Browser Compatibility

- **Modern Mobile Browsers**: Chrome, Safari, Firefox on iOS/Android
- **Desktop Support**: Also works on desktop browsers
- **JavaScript Required**: Full functionality requires JavaScript enabled

## Troubleshooting

### Quiz Not Loading
- Check if quiz folder exists in `/tests/`
- Verify `quiz.csv` file is present and properly formatted
- Check browser console for errors
- Ensure quiz is listed in `testFolders` array

### Owner Can't Login
- Verify email is listed in `config.js` `ownerIdentities`
- Check for typos in email address
- Clear browser cache and try again

### Images Not Displaying
- Verify image files are in the same folder as `quiz.csv`
- Check image filenames match exactly (case-sensitive)
- Ensure images are web-compatible formats (jpg, png, gif)

## Architecture Notes

### Mobile-First Design
- **Touch Targets**: All buttons sized for easy finger tapping
- **Single Column**: Vertical layout optimized for portrait orientation
- **Responsive Text**: Font sizes optimized for small screens
- **Minimal UI**: Clean, distraction-free interface

### Modular Architecture
- **Separate Pages**: Dedicated HTML files for each role (owner.html, client.html)
- **Shared Components**: Common utilities in js/common.js for efficiency
- **Role-Specific Logic**: Dedicated JavaScript files (owner.js, client.js)
- **Clean Routing**: Login page redirects to appropriate interface
- **Owner Experience**: Questions in original order with answer highlighting
- **Client Experience**: Randomized questions and shuffled options
- **Fair Assessment**: Each client gets unique but equivalent experience

### Static Hosting Compatible
- **No Backend**: Runs entirely in browser
- **Netlify Optimized**: Built specifically for Netlify deployment
- **Fast Loading**: Minimal dependencies and optimized assets

---

**Version**: v0.2 | **Mobile-First** | **Netlify Ready** | **License**: MIT
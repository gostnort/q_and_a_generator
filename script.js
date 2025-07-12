// Global variables
let csvData = [];
let questions = [];
let selectedZipFile = null;
let imageUrlMap = {};
let currentUser = null;
let isOwner = false;

// Session management
const SESSION_KEY = 'quizSession';
const QUIZ_STATE_KEY = 'quizState';

// Initialize app
window.onload = function() {
    checkSession();
    setInterval(checkSession, 1000); // Check session every second
};

// Check current session state
function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    const quizState = localStorage.getItem(QUIZ_STATE_KEY);
    
    if (session) {
        const sessionData = JSON.parse(session);
        currentUser = sessionData.user;
        isOwner = sessionData.isOwner;
        
        if (isOwner) {
            showOwnerInterface();
        } else if (quizState) {
            showClientInterface();
        } else {
            showLoginInterface();
        }
    } else {
        showLoginInterface();
    }
}

// Show login interface
function showLoginInterface() {
    document.getElementById('loginInterface').style.display = 'block';
    document.getElementById('ownerInterface').style.display = 'none';
    document.getElementById('clientInterface').style.display = 'none';
}

// Show owner interface
function showOwnerInterface() {
    document.getElementById('loginInterface').style.display = 'none';
    document.getElementById('ownerInterface').style.display = 'block';
    document.getElementById('clientInterface').style.display = 'none';
    
    document.getElementById('ownerEmail').textContent = currentUser;
    fetchZipFiles();
}

// Show client interface
function showClientInterface() {
    document.getElementById('loginInterface').style.display = 'none';
    document.getElementById('ownerInterface').style.display = 'none';
    document.getElementById('clientInterface').style.display = 'block';
    
    loadClientQuiz();
}

// Login function
function login() {
    const identity = document.getElementById('ownerIdentity').value.trim();
    if (!identity) {
        alert('Please enter your identity');
        return;
    }
    
    if (isValidOwner(identity)) {
        // Owner login
        const sessionData = {
            user: identity,
            isOwner: true,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        currentUser = identity;
        isOwner = true;
        showOwnerInterface();
    } else {
        // Client login - check if quiz is active
        const quizState = localStorage.getItem(QUIZ_STATE_KEY);
        if (quizState) {
            const sessionData = {
                user: identity,
                isOwner: false,
                timestamp: Date.now()
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
            currentUser = identity;
            isOwner = false;
            showClientInterface();
        } else {
            alert('No active quiz available. Please wait for the owner to start a quiz.');
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem(SESSION_KEY);
    if (isOwner) {
        localStorage.removeItem(QUIZ_STATE_KEY);
        localStorage.removeItem('quizAnswers');
    }
    currentUser = null;
    isOwner = false;
    showLoginInterface();
}

// Fetch available zip files
async function fetchZipFiles() {
    try {
        // Try to fetch directory listing first
        const response = await fetch('/zip/');
        if (response.ok) {
            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');
            const links = Array.from(doc.querySelectorAll('a'));
            const zipFiles = links.map(link => link.getAttribute('href'))
                .filter(href => href && href.endsWith('.zip'));

            const select = document.getElementById('zipFiles');
            select.innerHTML = '<option value="">Select a quiz...</option>';
            zipFiles.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.replace('.zip', '');
                select.appendChild(option);
            });
            return;
        }
    } catch (error) {
        console.error('Error fetching directory listing:', error);
    }
    
    // Fallback - try known files
    const knownFiles = ['sample样板_密码12345.zip'];
    const select = document.getElementById('zipFiles');
    select.innerHTML = '<option value="">Select a quiz...</option>';
    
    for (const file of knownFiles) {
        try {
            const response = await fetch(`/zip/${file}`);
            if (response.ok) {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file.replace('.zip', '');
                select.appendChild(option);
            }
        } catch (error) {
            console.error(`Error checking file ${file}:`, error);
        }
    }
    
    if (select.children.length === 1) {
        select.innerHTML = '<option value="">No quiz files available</option>';
    }
}

// Load quiz (owner function)
async function loadQuiz() {
    const select = document.getElementById('zipFiles');
    const selectedFile = select.value;
    
    if (!selectedFile) {
        alert('Please select a quiz file');
        return;
    }
    
    try {
        const response = await fetch(`/zip/${selectedFile}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        selectedZipFile = await response.blob();
        await loadCSVDataFromZip();
        
        // Set quiz state for clients
        const quizState = {
            zipFile: selectedFile,
            timestamp: Date.now(),
            active: true
        };
        localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(quizState));
        
        document.getElementById('zipName').textContent = selectedFile.replace('.zip', '');
        
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Failed to load quiz. Please check if the file exists.');
    }
}

// Load quiz for clients
async function loadClientQuiz() {
    const quizState = localStorage.getItem(QUIZ_STATE_KEY);
    if (!quizState) {
        showLoginInterface();
        return;
    }
    
    const state = JSON.parse(quizState);
    if (!state.active) {
        showLoginInterface();
        return;
    }
    
    try {
        const response = await fetch(`/zip/${state.zipFile}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        selectedZipFile = await response.blob();
        await loadCSVDataFromZip();
        
        document.getElementById('zipName').textContent = state.zipFile.replace('.zip', '');
        regenerateQuiz();
        
    } catch (error) {
        console.error('Error loading client quiz:', error);
        alert('Failed to load quiz');
    }
}

// JS7z loading check
function ensureJS7zLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof JS7z !== 'undefined') {
            resolve();
            return;
        }
        
        let attempts = 0;
        const maxAttempts = 50;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof JS7z !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('JS7z failed to load'));
            }
        }, 100);
    });
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];
    
    for (let line of lines) {
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        data.push(row);
    }
    
    return data;
}

// Load CSV data from ZIP
async function loadCSVDataFromZip() {
    if (!selectedZipFile) {
        alert('No ZIP file loaded');
        return;
    }
    
    try {
        // Clear previous images
        Object.values(imageUrlMap).forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        imageUrlMap = {};
        
        await ensureJS7zLoaded();
        
        const arrayBuffer = await selectedZipFile.arrayBuffer();
        
        const js7z = await JS7z({
            onExit: (exitCode) => {
                if (exitCode === 0) {
                    try {
                        const files = js7z.FS.readdir('/output');
                        
                        // Load images
                        for (const filename of files) {
                            if (filename === '.' || filename === '..') continue;
                            const lowerFilename = filename.toLowerCase();
                            if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg') || lowerFilename.endsWith('.png')) {
                                try {
                                    const imageData = js7z.FS.readFile('/output/' + filename, {encoding: 'binary'});
                                    let mimeType = 'image/jpeg';
                                    if (lowerFilename.endsWith('.png')) mimeType = 'image/png';
                                    const blob = new Blob([imageData], {type: mimeType});
                                    const url = URL.createObjectURL(blob);
                                    imageUrlMap[filename] = url;
                                } catch (readError) {
                                    console.error('Error reading image:', filename, readError);
                                }
                            }
                        }
                        
                        // Load CSV
                        let csvContent = null;
                        for (const filename of files) {
                            if (filename.toLowerCase().endsWith('.csv')) {
                                try {
                                    csvContent = js7z.FS.readFile('/output/' + filename, {encoding: 'utf8'});
                                    break;
                                } catch (readError) {
                                    console.error('Error reading CSV:', filename, readError);
                                }
                            }
                        }
                        
                        if (!csvContent) {
                            alert('No CSV file found in ZIP');
                            return;
                        }
                        
                        csvData = parseCSV(csvContent);
                        questions = processQuestions();
                        
                        if (isOwner) {
                            renderOwnerQuestions();
                        } else {
                            regenerateQuiz();
                        }
                        
                    } catch (e) {
                        console.error('Error processing files:', e);
                        alert('Error processing ZIP contents');
                    }
                } else {
                    alert('Error extracting ZIP file');
                }
            },
            onAbort: (reason) => {
                console.error('JS7z aborted:', reason);
                alert('ZIP extraction aborted');
            }
        });
        
        js7z.FS.writeFile('/input.zip', new Uint8Array(arrayBuffer));
        js7z.FS.mkdir('/output');
        js7z.callMain(['x', '/input.zip', '-o/output']);
        
    } catch (error) {
        console.error('Error setting up ZIP extraction:', error);
        alert('Error preparing ZIP file');
    }
}

// Process questions from CSV
function processQuestions() {
    if (csvData.length < 3) return [];
    
    const questionsData = [];
    const numColumns = Math.max(...csvData.map(row => row.length));
    
    for (let col = 0; col < numColumns; col++) {
        const questionText = csvData[0][col];
        const imageName = csvData[1][col];
        
        if (!questionText || questionText.trim() === '') continue;
        
        const options = [];
        for (let row = 2; row < csvData.length; row++) {
            const option = csvData[row][col];
            if (option && option.trim() !== '') {
                options.push(option.trim());
            }
        }
        
        if (options.length > 0) {
            let imageUrl = null;
            if (imageName && imageName.trim() !== '') {
                const trimmedImageName = imageName.trim();
                imageUrl = imageUrlMap[trimmedImageName] || null;
                
                if (!imageUrl) {
                    // Try different variations
                    const filenameParts = trimmedImageName.split(/[\/\\]/);
                    const justFilename = filenameParts[filenameParts.length - 1];
                    imageUrl = imageUrlMap[justFilename] || null;
                }
            }
            
            questionsData.push({
                text: questionText.trim(),
                image: imageUrl,
                options: options,
                id: col
            });
        }
    }
    
    return questionsData;
}

// Render questions for owner
function renderOwnerQuestions() {
    const container = document.getElementById('ownerQuestions');
    container.innerHTML = '';
    
    questions.forEach((question, qIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);
        
        let html = `<div class="question-header">${qIndex + 1}. ${question.text}</div>`;
        
        if (question.image) {
            html += `<div class="question-image"><img src="${question.image}" alt="Question image"></div>`;
        }
        
        question.options.forEach((option, optIndex) => {
            const isCorrect = option.startsWith('`');
            const optionText = isCorrect ? option.substring(1) : option;
            html += `
                <div class="option ${isCorrect ? 'correct-answer' : ''}" data-option-index="${optIndex}">
                    <span class="option-text">${optionText}</span>
                    <span class="client-count">(0 clients)</span>
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
    
    updateClientCounts();
}

// Update client answer counts
function updateClientCounts() {
    const answers = JSON.parse(localStorage.getItem('quizAnswers') || '[]');
    const counts = {};
    
    answers.forEach(submission => {
        submission.forEach(answer => {
            if (!counts[answer.questionId]) {
                counts[answer.questionId] = {};
            }
            answer.selectedOptions.forEach(optionIndex => {
                counts[answer.questionId][optionIndex] = (counts[answer.questionId][optionIndex] || 0) + 1;
            });
        });
    });
    
    questions.forEach(question => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        if (questionDiv) {
            question.options.forEach((option, optIndex) => {
                const count = (counts[question.id] && counts[question.id][optIndex]) || 0;
                const countSpan = questionDiv.querySelector(`[data-option-index="${optIndex}"] .client-count`);
                if (countSpan) {
                    countSpan.textContent = `(${count} clients)`;
                }
            });
        }
    });
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Check if question is multi-select
function isMultiSelect(options) {
    return options.filter(opt => opt.startsWith('`')).length > 1;
}

// Regenerate quiz for clients
function regenerateQuiz() {
    const allQuestions = processQuestions();
    questions = shuffleArray(allQuestions);
    
    document.getElementById('scoreLabel').textContent = '';
    renderQuestions();
}

// Render questions for clients
function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    questions.forEach((question, qIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);
        
        const isMulti = isMultiSelect(question.options);
        const inputType = isMulti ? 'checkbox' : 'radio';
        const inputName = `question_${qIndex}`;
        
        let html = `<div class="question-header">${qIndex + 1}. ${question.text}</div>`;
        
        if (question.image) {
            html += `<div class="question-image"><img src="${question.image}" alt="Question image"></div>`;
        }
        
        const shuffledOptions = shuffleArray(question.options.map((opt, idx) => ({text: opt, originalIndex: idx})));
        
        shuffledOptions.forEach((option, optIndex) => {
            const optionId = `${inputName}_${optIndex}`;
            const optionText = option.text.startsWith('`') ? option.text.substring(1) : option.text;
            html += `
                <div class="option" data-original-index="${option.originalIndex}">
                    <input type="${inputType}" id="${optionId}" name="${inputName}" value="${option.originalIndex}">
                    <label for="${optionId}" class="option-text">${optionText}</label>
                    <span class="result-icon"></span>
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

// Submit answers
function submitAnswers() {
    let totalCorrect = 0;
    let totalPossiblePoints = 0;
    let userPoints = 0;
    let unansweredQuestions = [];
    const answers = [];
    
    questions.forEach((question, qIndex) => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        const options = questionDiv.querySelectorAll('.option');
        const inputs = questionDiv.querySelectorAll('input');
        
        const anySelected = Array.from(inputs).some(input => input.checked);
        if (!anySelected) {
            unansweredQuestions.push(qIndex + 1);
        }
        
        const correctOptionsInQuestion = question.options.filter(opt => opt.startsWith('`'));
        totalPossiblePoints += correctOptionsInQuestion.length;
        
        let questionPoints = 0;
        let incorrectSelectionMade = false;
        const selectedOptions = [];
        
        options.forEach((optionDiv, optIndex) => {
            const input = inputs[optIndex];
            const resultIcon = optionDiv.querySelector('.result-icon');
            const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
            const originalOption = question.options[originalIndex];
            const isCorrect = originalOption.startsWith('`');
            
            optionDiv.classList.remove('correct-answer', 'show-correct');
            resultIcon.innerHTML = '';
            
            if (input.checked) {
                selectedOptions.push(originalIndex);
                if (isCorrect) {
                    resultIcon.innerHTML = '✓';
                    resultIcon.classList.add('correct-mark');
                    questionPoints++;
                } else {
                    resultIcon.innerHTML = '✗';
                    resultIcon.classList.add('incorrect-mark');
                    incorrectSelectionMade = true;
                }
            }
        });
        
        answers.push({
            questionId: question.id,
            selectedOptions: selectedOptions
        });
        
        userPoints += questionPoints;
        const missedCorrectSelection = questionPoints < correctOptionsInQuestion.length;
        const questionIsWrong = incorrectSelectionMade || missedCorrectSelection;
        
        if (questionIsWrong) {
            options.forEach((optionDiv) => {
                const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
                const originalOption = question.options[originalIndex];
                if (originalOption.startsWith('`')) {
                    optionDiv.classList.add('correct-answer', 'show-correct');
                }
            });
        }
        
        if (!questionIsWrong) {
            totalCorrect++;
        }
    });
    
    if (unansweredQuestions.length > 0) {
        const questionList = unansweredQuestions.join(', ');
        const message = `Warning: You have not answered question${unansweredQuestions.length > 1 ? 's' : ''} ${questionList}. Do you want to continue?`;
        
        if (!confirm(message)) {
            return;
        }
    }
    
    // Save answers
    const existingAnswers = JSON.parse(localStorage.getItem('quizAnswers') || '[]');
    existingAnswers.push(answers);
    localStorage.setItem('quizAnswers', JSON.stringify(existingAnswers));
    
    const percentage = totalPossiblePoints > 0 ? Math.round((userPoints / totalPossiblePoints) * 100) : 0;
    const passed = percentage >= 90;
    const status = passed ? 'Pass' : 'Fail';
    
    document.getElementById('scoreLabel').textContent = `Score: ${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`;
    document.getElementById('scoreLabel').style.backgroundColor = passed ? '#d4edda' : '#f8d7da';
    document.getElementById('scoreLabel').style.color = passed ? '#155724' : '#721c24';
}

// Print quiz
function printQuiz() {
    window.print();
}

// Share quiz
function shareQuiz() {
    if (questions.length === 0) {
        alert('Please generate a quiz first');
        return;
    }
    
    // Create standalone HTML with embedded quiz
    const quizHtml = generateStandaloneQuiz();
    const blob = new Blob([quizHtml], {type: 'text/html'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz_${Date.now()}.html`;
    a.click();
    
    URL.revokeObjectURL(url);
}

// Generate standalone quiz HTML
function generateStandaloneQuiz() {
    const cssStyles = Array.from(document.styleSheets)
        .filter(sheet => sheet.href === null || sheet.href.startsWith(window.location.origin))
        .map(sheet => {
            try {
                return Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n');
            } catch (e) {
                return '';
            }
        })
        .join('\n');
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shared Quiz</title>
    <style>${cssStyles}</style>
</head>
<body>
    <div class="client-container">
        <div class="header">
            <div class="header-left">
                <h2>Shared Quiz</h2>
            </div>
            <div class="header-right">
                <div class="score-label" id="scoreLabel"></div>
                <button onclick="submitAnswers()">Submit</button>
                <button onclick="window.print()">Print</button>
            </div>
        </div>
        <hr class="header-separator">
        <div id="questionsContainer">${document.getElementById('questionsContainer').innerHTML}</div>
    </div>
    <script>
        // Embedded quiz functionality
        ${getEmbeddedQuizScript()}
    </script>
</body>
</html>`;
}

// Get embedded quiz script
function getEmbeddedQuizScript() {
    return `
        function submitAnswers() {
            // Simple scoring for shared quiz
            const questions = document.querySelectorAll('.question');
            let totalCorrect = 0;
            let totalQuestions = questions.length;
            
            questions.forEach(question => {
                const inputs = question.querySelectorAll('input:checked');
                const correctAnswers = question.querySelectorAll('.option[data-correct="true"]');
                
                if (inputs.length === correctAnswers.length) {
                    let allCorrect = true;
                    inputs.forEach(input => {
                        if (!input.closest('.option').hasAttribute('data-correct')) {
                            allCorrect = false;
                        }
                    });
                    if (allCorrect) totalCorrect++;
                }
            });
            
            const percentage = Math.round((totalCorrect / totalQuestions) * 100);
            const status = percentage >= 90 ? 'Pass' : 'Fail';
            document.getElementById('scoreLabel').textContent = 'Score: ' + percentage + '% - ' + status;
        }
    `;
}

// Listen for storage changes to update owner view
window.addEventListener('storage', (event) => {
    if (event.key === 'quizAnswers' && isOwner) {
        updateClientCounts();
    }
}); 
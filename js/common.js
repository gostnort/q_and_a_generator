// Common utilities shared between owner and client
let csvData = [];
let questions = [];
let settings = {
    passPercentage: 90
};

// Enhanced analytics tracking
let questionAnalytics = {};

// CSV parsing function
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
    if (csvText.length <= 1) {
        return result;
    }
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            const row = [];
            let current = '';
            let inQuotes = false;
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    row.push(current);
                    current = '';
                } else {
                    current += char;
                }
            }
            row.push(current);
            result.push(row);
        }
    }
    return result;
}

// Convert CSV data to questions format
function processQuestions(quizName) {
    // Use window.csvData if available, otherwise fall back to local csvData
    const dataToUse = window.csvData || csvData;
    if (dataToUse.length < 3) return [];
    const questionsData = [];
    const numColumns = Math.max(...dataToUse.map(row => row.length));
    for (let col = 0; col < numColumns; col++) {
        const questionText = dataToUse[0][col];
        const imageName = dataToUse[1][col];
        if (!questionText || questionText.trim() === '') continue;
        const options = [];
        for (let row = 2; row < dataToUse.length; row++) {
            const option = dataToUse[row][col];
            if (option && option.trim() !== '') {
                options.push(option.trim());
            }
        }
        let imageUrl = null;
        if (imageName && imageName.trim() !== '') {
            // Direct path - no subfolder
            imageUrl = `/collections/${quizName}/${encodeURIComponent(imageName.trim())}`;
        }
        questionsData.push({
            text: questionText.trim(),
            image: imageUrl,
            options: options,
            id: col
        });
    }
    return questionsData;
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    let arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Check if question has multiple correct answers (checkbox vs radio)
function isMultiSelect(options) {
    return options.filter(opt => opt.startsWith('`')).length > 1;
}

// Load CSV data from quiz folder
async function loadCSVDataFromQuizFolder(quizName) {
    try {
        // Updated path for collections structure
        const response = await fetch(`/collections/${quizName}/quiz.csv`);
        if (!response.ok) throw new Error('Quiz CSV not found');
        const csvText = await response.text();
        const parsedData = parseCSV(csvText);
        // Set both local and global csvData
        csvData = parsedData;
        window.csvData = parsedData;
        return true;
    } catch (error) {
        console.error('Error loading quiz CSV:', error);
        alert('Failed to load quiz CSV. Make sure there is a quiz.csv file in the quiz folder.');
        return false;
    }
}

// Populate quiz dropdown (requires testFolders from config.js)
async function populateQuizDropdown(selectElementId) {
    if (typeof testFolders === 'undefined' || !Array.isArray(testFolders)) {
        console.error('No testFolders defined in config.js');
        return;
    }
    const select = document.getElementById(selectElementId);
    if (!select) {
        console.error(`Dropdown element with ID '${selectElementId}' not found`);
        return;
    }
    select.innerHTML = '';
    testFolders.forEach(quiz => {
        const option = document.createElement('option');
        option.value = quiz;
        option.textContent = quiz;
        select.appendChild(option);
    });
}

// Utility functions for role checking (requires config.js)
function checkUserRole(username) {
    if (typeof isValidOwner === 'function' && isValidOwner(username)) {
        return 'owner';
    }
    return 'client';
}

// Shared print function
function printQuiz() {
    window.print();
}

// Shared share function
function shareQuiz() {
    const url = window.location.href;
    if (navigator.share) {
        navigator.share({
            title: 'Q&A Quiz',
            url: url
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(url).then(() => {
            alert('Quiz URL copied to clipboard!');
        }).catch(() => {
            alert(`Share this URL: ${url}`);
        });
    }
}

// Enhanced Analytics System
function initializeAnalytics(questions) {
    questionAnalytics = {};
    questions.forEach((question) => {
        questionAnalytics[question.id] = {
            totalResponses: 0,
            optionCounts: {},
            correctAnswer: getCorrectAnswer(question),
            correctCount: 0
        };
        
        // Initialize option counts
        question.options.forEach(option => {
            const cleanOption = option.startsWith('`') ? option.substring(1) : option;
            questionAnalytics[question.id].optionCounts[cleanOption] = 0;
        });
    });
}

function getCorrectAnswer(question) {
    return question.options
        .filter(opt => opt.startsWith('`'))
        .map(opt => opt.substring(1))
        .join(', ');
}

function trackOptionSelection(clientName, questionId, selectedOptions) {
    if (!questionAnalytics[questionId]) {
        console.error('Analytics not initialized for question:', questionId);
        return;
    }
    
    questionAnalytics[questionId].totalResponses++;
    
    selectedOptions.forEach(option => {
        if (questionAnalytics[questionId].optionCounts[option] !== undefined) {
            questionAnalytics[questionId].optionCounts[option]++;
        }
    });
    
    // Check if answer is correct
    const randomizedQuestions = window.randomizedQuestions || [];
    const question = randomizedQuestions.find(q => q.id === questionId);
    if (question && isAnswerCorrect(question, selectedOptions)) {
        questionAnalytics[questionId].correctCount++;
    }
    
    // Update display
    updateAnalyticsDisplay();
}

function isAnswerCorrect(question, selectedOptions) {
    const correctOptions = question.options
        .filter(opt => opt.startsWith('`'))
        .map(opt => opt.substring(1));
    
    if (correctOptions.length !== selectedOptions.length) {
        return false;
    }
    
    return correctOptions.every(option => selectedOptions.includes(option));
}

function updateAnalyticsDisplay() {
    // Update analytics in owner preview
    const previewContent = document.getElementById('previewContent');
    if (!previewContent) return;
    
    // Use randomized questions for analytics display (same sequence as client)
    const randomizedQuestions = window.randomizedQuestions || [];
    randomizedQuestions.forEach((question) => {
        const analytics = questionAnalytics[question.id];
        if (!analytics) return;
        
        const questionElement = previewContent.querySelector(`[data-question-id="${question.id}"]`);
        if (!questionElement) return;
        
        // Update analytics display
        const analyticsElement = questionElement.querySelector('.analytics-display');
        if (analyticsElement) {
            analyticsElement.innerHTML = generateAnalyticsHTML(analytics);
        }
    });
}

function generateAnalyticsHTML(analytics) {
    if (analytics.totalResponses === 0) {
        return '<div class="analytics-display">No responses yet</div>';
    }
    
    let html = '<div class="analytics-display">';
    const optionCounts = Object.entries(analytics.optionCounts);
    const countStrings = optionCounts
        .filter(([option, count]) => count > 0)
        .map(([option, count]) => `${count} of ${option}`)
        .join('; ');
    
    html += `<strong>Responses: ${countStrings}</strong>`;
    html += ` (${analytics.correctCount}/${analytics.totalResponses} correct)`;
    html += '</div>';
    
    return html;
}

// State Management System
const STATE_KEYS = {
    ACTIVE_QUIZ: 'activeQuiz',
    QUIZ_SESSION: 'quizSession',
    CLIENT_SUBMISSIONS: 'clientSubmissions',
    QUESTION_ANALYTICS: 'questionAnalytics'
};

// Quiz Session Management
function setActiveQuiz(quizName) {
    const sessionData = {
        quizName: quizName,
        startTime: new Date().toISOString(),
        sessionId: generateSessionId()
    };
    console.log('setActiveQuiz - creating session data:', sessionData);
    localStorage.setItem(STATE_KEYS.QUIZ_SESSION, JSON.stringify(sessionData));
    localStorage.setItem(STATE_KEYS.ACTIVE_QUIZ, quizName);
    
    // Clear previous submissions and analytics when starting new quiz
    localStorage.removeItem(STATE_KEYS.CLIENT_SUBMISSIONS);
    localStorage.removeItem(STATE_KEYS.QUESTION_ANALYTICS);
    
    console.log('Active quiz set:', quizName);
    console.log('setActiveQuiz - localStorage keys:', Object.keys(localStorage));
}

function getActiveQuiz() {
    return localStorage.getItem(STATE_KEYS.ACTIVE_QUIZ);
}

function getQuizSession() {
    const sessionData = localStorage.getItem(STATE_KEYS.QUIZ_SESSION);
    console.log('getQuizSession - raw sessionData:', sessionData);
    const parsed = sessionData ? JSON.parse(sessionData) : null;
    console.log('getQuizSession - parsed result:', parsed);
    return parsed;
}

function clearQuizSession() {
    console.log('clearQuizSession - clearing all session data');
    localStorage.removeItem(STATE_KEYS.ACTIVE_QUIZ);
    localStorage.removeItem(STATE_KEYS.QUIZ_SESSION);
    localStorage.removeItem(STATE_KEYS.CLIENT_SUBMISSIONS);
    localStorage.removeItem(STATE_KEYS.QUESTION_ANALYTICS);
    console.log('clearQuizSession - localStorage keys after clearing:', Object.keys(localStorage));
}

// Client Submission Management
function saveClientSubmission(clientName, submissionData) {
    const submissions = getClientSubmissions();
    const submission = {
        clientName: clientName,
        submissionTime: new Date().toISOString(),
        answers: submissionData.answers,
        score: submissionData.score,
        percentage: submissionData.percentage,
        passed: submissionData.passed
    };
    
    // Remove existing submission from same client
    const filteredSubmissions = submissions.filter(s => s.clientName !== clientName);
    filteredSubmissions.push(submission);
    
    localStorage.setItem(STATE_KEYS.CLIENT_SUBMISSIONS, JSON.stringify(filteredSubmissions));
    console.log('Client submission saved:', clientName);
}

function getClientSubmissions() {
    const submissions = localStorage.getItem(STATE_KEYS.CLIENT_SUBMISSIONS);
    return submissions ? JSON.parse(submissions) : [];
}

function getClientSubmission(clientName) {
    const submissions = getClientSubmissions();
    return submissions.find(s => s.clientName === clientName) || null;
}

// Save and load analytics
function saveAnalytics() {
    localStorage.setItem(STATE_KEYS.QUESTION_ANALYTICS, JSON.stringify(questionAnalytics));
}

function loadAnalytics() {
    const saved = localStorage.getItem(STATE_KEYS.QUESTION_ANALYTICS);
    if (saved) {
        questionAnalytics = JSON.parse(saved);
    }
}

// Utility functions
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString();
} 
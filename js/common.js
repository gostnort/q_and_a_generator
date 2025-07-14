// Common utilities shared between owner and client
let csvData = [];
let questions = [];
let settings = {
    passPercentage: 90
};

// CSV parsing function
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const result = [];
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
        let imageUrl = null;
        if (imageName && imageName.trim() !== '') {
            imageUrl = `/tests/${quizName}/${encodeURIComponent(imageName.trim())}`;
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
        const folder = `/tests/${quizName}/`;
        const response = await fetch(folder + 'quiz.csv');
        if (!response.ok) throw new Error('Quiz CSV not found');
        const csvText = await response.text();
        csvData = parseCSV(csvText);
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

// State Management System
const STATE_KEYS = {
    ACTIVE_QUIZ: 'activeQuiz',
    QUIZ_SESSION: 'quizSession',
    CLIENT_SUBMISSIONS: 'clientSubmissions'
};

// Quiz Session Management
function setActiveQuiz(quizName) {
    const sessionData = {
        quizName: quizName,
        startTime: new Date().toISOString(),
        sessionId: generateSessionId()
    };
    localStorage.setItem(STATE_KEYS.QUIZ_SESSION, JSON.stringify(sessionData));
    localStorage.setItem(STATE_KEYS.ACTIVE_QUIZ, quizName);
    
    // Clear previous submissions when starting new quiz
    localStorage.removeItem(STATE_KEYS.CLIENT_SUBMISSIONS);
    
    console.log('Active quiz set:', quizName);
}

function getActiveQuiz() {
    return localStorage.getItem(STATE_KEYS.ACTIVE_QUIZ);
}

function getQuizSession() {
    const sessionData = localStorage.getItem(STATE_KEYS.QUIZ_SESSION);
    return sessionData ? JSON.parse(sessionData) : null;
}

function clearQuizSession() {
    localStorage.removeItem(STATE_KEYS.ACTIVE_QUIZ);
    localStorage.removeItem(STATE_KEYS.QUIZ_SESSION);
    localStorage.removeItem(STATE_KEYS.CLIENT_SUBMISSIONS);
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

// Utility functions
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString();
} 
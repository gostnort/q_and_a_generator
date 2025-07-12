// Global variables
let csvData = [];
let questions = [];
let selectedZipFile = null;
let imageUrlMap = {};
let currentUser = null;
let isOwner = false;
let isLoadingQuiz = false;

// Session management
const SESSION_KEY = 'quizSession';
const QUIZ_STATE_KEY = 'quizState';
const ACTIVE_OWNER_KEY = 'activeOwner';
const CLIENT_ANSWERS_KEY = 'clientAnswers';

// Initialize app
window.onload = function() {
    checkSession();
    // Don't start auto-refresh immediately - only after quiz is loaded
};

// Check current session state
function checkSession() {
    // Don't interfere during quiz loading
    if (isLoadingQuiz) {
        return;
    }
    
    const session = localStorage.getItem(SESSION_KEY);
    const quizState = localStorage.getItem(QUIZ_STATE_KEY);
    const activeOwner = localStorage.getItem(ACTIVE_OWNER_KEY);
    
    if (session) {
        const sessionData = JSON.parse(session);
        currentUser = sessionData.user;
        
        // Check if this user is still the active owner
        if (sessionData.isOwner && currentUser === activeOwner) {
            isOwner = true;
            showOwnerInterface();
        } else if (quizState) {
            // User is a client (including former owners)
            isOwner = false;
            showClientInterface();
        } else {
            // No active quiz, back to login
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
    
    // Reset quiz selection container visibility
    document.querySelector('.owner-controls').style.display = 'block';
    
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
    
    const activeOwner = localStorage.getItem(ACTIVE_OWNER_KEY);
    
    if (isValidOwner(identity) && !activeOwner) {
        // Owner login - become the active owner
        const sessionData = {
            user: identity,
            isOwner: true,
            timestamp: Date.now()
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
        localStorage.setItem(ACTIVE_OWNER_KEY, identity);
        currentUser = identity;
        isOwner = true;
        showOwnerInterface();
    } else {
        // Client login (including other owners when someone is already active owner)
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
            if (activeOwner) {
                alert(`Quiz not started yet. ${activeOwner} is the active owner.`);
            } else {
                alert('No active quiz available. Please wait for an owner to start a quiz.');
            }
        }
    }
}

// Logout function
function logout() {
    localStorage.removeItem(SESSION_KEY);
    if (isOwner) {
        // Owner logout - clear ALL data for fresh start
        localStorage.removeItem(QUIZ_STATE_KEY);
        localStorage.removeItem(ACTIVE_OWNER_KEY);
        localStorage.removeItem(CLIENT_ANSWERS_KEY);
        
        // Clear in-memory data
        csvData = [];
        questions = [];
        selectedZipFile = null;
        
        // Clear image URLs and revoke blob URLs
        Object.values(imageUrlMap).forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        imageUrlMap = {};
    }
    
    // Clear session check interval
    if (window.sessionCheckInterval) {
        clearInterval(window.sessionCheckInterval);
        window.sessionCheckInterval = null;
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
                // Decode URL-encoded characters for display
                const decodedName = decodeURIComponent(file).replace('.zip', '');
                option.textContent = decodedName;
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
                // Decode URL-encoded characters for display
                const decodedName = decodeURIComponent(file).replace('.zip', '');
                option.textContent = decodedName;
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
    console.log('loadQuiz() called');
    isLoadingQuiz = true;
    
    const select = document.getElementById('zipFiles');
    const selectedFile = select.value;
    
    console.log('Selected file:', selectedFile);
    
    if (!selectedFile) {
        alert('Please select a quiz file');
        isLoadingQuiz = false;
        return;
    }
    
    try {
        console.log('Fetching file:', `/zip/${selectedFile}`);
        const response = await fetch(`/zip/${selectedFile}`);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        selectedZipFile = await response.blob();
        console.log('ZIP file loaded, size:', selectedZipFile.size);
        
        await loadCSVDataFromZip();
        
        // Set quiz state for clients with extracted data
        const quizState = {
            zipFile: selectedFile,
            timestamp: Date.now(),
            active: true,
            csvData: csvData,
            imageUrlMap: imageUrlMap
        };
        localStorage.setItem(QUIZ_STATE_KEY, JSON.stringify(quizState));
        console.log('Quiz state set:', quizState);
        
        // Decode URL-encoded characters for display
        const decodedName = decodeURIComponent(selectedFile).replace('.zip', '');
        document.getElementById('zipName').textContent = decodedName;
        
        // Note: UI hiding will be done after quiz processing completes
        
        // Start auto-refresh only after quiz is loaded
        if (!window.sessionCheckInterval) {
            window.sessionCheckInterval = setInterval(checkSession, 5000);
        }
        
        console.log('Quiz loaded successfully');
        
    } catch (error) {
        console.error('Error loading quiz:', error);
        alert('Failed to load quiz. Please check if the file exists.');
    } finally {
        isLoadingQuiz = false;
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
    
    // Use the data that owner already extracted - no password needed!
    if (state.csvData && state.imageUrlMap) {
        csvData = state.csvData;
        imageUrlMap = state.imageUrlMap;
        questions = processQuestions();
        
        // Decode URL-encoded characters for display
        const decodedName = decodeURIComponent(state.zipFile).replace('.zip', '');
        document.getElementById('zipName').textContent = decodedName;
        regenerateQuiz();
    } else {
        // Fallback: if no extracted data, show error
        alert('Quiz data not available. Please wait for owner to reload the quiz.');
        showLoginInterface();
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

// Extract ZIP with password handling - returns true/false (NO dialogs)
async function extractZipWithPassword(arrayBuffer, password = null) {
    return new Promise(async (resolve) => {
        // Temporarily disable window.prompt to prevent JS7z from showing default dialogs
        const originalPrompt = window.prompt;
        window.prompt = () => null;
        
        try {
            const js7z = await JS7z({
                onExit: (exitCode) => {
                    // Restore original prompt
                    window.prompt = originalPrompt;
                    
                    if (exitCode === 0) {
                        // Success - process files
                        const files = js7z.FS.readdir('/output');
                        
                        // Load images
                        for (const filename of files) {
                            if (filename === '.' || filename === '..') continue;
                            const lowerFilename = filename.toLowerCase();
                            if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg') || lowerFilename.endsWith('.png')) {
                                const imageData = js7z.FS.readFile('/output/' + filename, {encoding: 'binary'});
                                let mimeType = 'image/jpeg';
                                if (lowerFilename.endsWith('.png')) mimeType = 'image/png';
                                const blob = new Blob([imageData], {type: mimeType});
                                const url = URL.createObjectURL(blob);
                                imageUrlMap[filename] = url;
                            }
                        }
                        
                        // Load CSV
                        let csvContent = null;
                        for (const filename of files) {
                            if (filename.toLowerCase().endsWith('.csv')) {
                                csvContent = js7z.FS.readFile('/output/' + filename, {encoding: 'utf8'});
                                break;
                            }
                        }
                        
                        if (!csvContent) {
                            console.error('No CSV file found in ZIP');
                            resolve(false);
                            return;
                        }
                        
                        csvData = parseCSV(csvContent);
                        questions = processQuestions();
                        
                        if (isOwner) {
                            renderOwnerQuestions();
                        } else {
                            regenerateQuiz();
                        }
                        
                        resolve(true); // Success
                        
                    } else {
                        // Extraction failed - wrong password or corrupted file
                        resolve(false);
                    }
                },
                onAbort: (reason) => {
                    // Restore original prompt
                    window.prompt = originalPrompt;
                    console.error('JS7z aborted:', reason);
                    resolve(false);
                }
            });
            
            js7z.FS.writeFile('/input.zip', new Uint8Array(arrayBuffer));
            js7z.FS.mkdir('/output');
            
            // Try extraction with or without password
            const extractArgs = ['x', '/input.zip', '-o/output'];
            if (password) {
                extractArgs.push(`-p${password}`);
            }
            js7z.callMain(extractArgs);
            
        } catch (error) {
            // Restore original prompt in case of error
            window.prompt = originalPrompt;
            resolve(false);
        }
    });
}

// Custom password dialog
function showPasswordDialog() {
    return new Promise((resolve) => {
        // Create modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 1000;
            display: flex; align-items: center; justify-content: center;
        `;
        
        // Create dialog
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 20px; border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); min-width: 300px;
        `;
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">Enter Password</h3>
            <input type="password" id="passwordInput" placeholder="Enter password for ZIP file" 
                   style="width: 100%; padding: 8px; margin: 10px 0; box-sizing: border-box;">
            <div style="text-align: right; margin-top: 15px;">
                <button id="cancelBtn" style="margin-right: 10px; padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button id="okBtn" style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">OK</button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        const input = dialog.querySelector('#passwordInput');
        const okBtn = dialog.querySelector('#okBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');
        
        input.focus();
        
        // OK button - return password
        okBtn.onclick = () => {
            const password = input.value.trim();
            document.body.removeChild(modal);
            resolve(password);
        };
        
        // Cancel button - return null
        cancelBtn.onclick = () => {
            document.body.removeChild(modal);
            resolve(null);
        };
        
        // Enter key = OK
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                okBtn.click();
            }
        };
    });
}

// Handle password prompting with proper retry logic
async function handlePasswordExtraction(arrayBuffer) {
    // First try without password
    if (await extractZipWithPassword(arrayBuffer)) {
        return; // Success!
    }
    
    // Keep trying with password until success or user cancels
    while (true) {
        const pw = await showPasswordDialog();
        if (!pw) {
            // User clicked cancel - just return without error
            return;
        }
        
        if (await extractZipWithPassword(arrayBuffer, pw)) {
            return; // Success!
        }
        // Wrong password, try again (continue loop)
    }
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
        
        // Try extraction with password handling
        await handlePasswordExtraction(arrayBuffer);
        
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
    
    // Hide the quiz selection container after successful load
    if (isOwner) {
        document.querySelector('.owner-controls').style.display = 'none';
    }
}

// Update client answer counts
function updateClientCounts() {
    const clientAnswers = JSON.parse(localStorage.getItem(CLIENT_ANSWERS_KEY) || '{}');
    const counts = {};
    const clientNames = [];
    
    // Process answers from all clients
    Object.keys(clientAnswers).forEach(clientName => {
        clientNames.push(clientName);
        const clientSubmissions = clientAnswers[clientName];
        
        // Get the latest submission for this client
        if (clientSubmissions.length > 0) {
            const latestSubmission = clientSubmissions[clientSubmissions.length - 1];
            latestSubmission.answers.forEach(answer => {
                if (!counts[answer.questionId]) {
                    counts[answer.questionId] = {};
                }
                answer.selectedOptions.forEach(optionIndex => {
                    counts[answer.questionId][optionIndex] = (counts[answer.questionId][optionIndex] || 0) + 1;
                });
            });
        }
    });
    
    // Update display
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
    
    // Show client list
    updateClientList(clientNames, clientAnswers);
}

// Update client list display for owner
function updateClientList(clientNames, clientAnswers) {
    if (!isOwner) return;
    
    let clientListDiv = document.getElementById('clientList');
    if (!clientListDiv) {
        clientListDiv = document.createElement('div');
        clientListDiv.id = 'clientList';
        clientListDiv.style.cssText = `
            background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 8px;
            border: 1px solid #dee2e6;
        `;
        
        const ownerQuestions = document.getElementById('ownerQuestions');
        ownerQuestions.parentNode.insertBefore(clientListDiv, ownerQuestions);
    }
    
    if (clientNames.length === 0) {
        clientListDiv.innerHTML = '<h4>Connected Clients</h4><p>No clients have submitted answers yet.</p>';
        return;
    }
    
    let html = '<h4>Connected Clients</h4>';
    clientNames.forEach(clientName => {
        const submissions = clientAnswers[clientName];
        const latestSubmission = submissions[submissions.length - 1];
        const score = latestSubmission.score;
        const timestamp = new Date(latestSubmission.timestamp).toLocaleTimeString();
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #eee;">
                <span><strong>${clientName}</strong></span>
                <span>Score: ${score}% (${timestamp})</span>
            </div>
        `;
    });
    
    clientListDiv.innerHTML = html;
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
    
    // Save answers with client identity
    const clientAnswers = JSON.parse(localStorage.getItem(CLIENT_ANSWERS_KEY) || '{}');
    if (!clientAnswers[currentUser]) {
        clientAnswers[currentUser] = [];
    }
    clientAnswers[currentUser].push({
        answers: answers,
        timestamp: Date.now(),
        score: percentage
    });
    localStorage.setItem(CLIENT_ANSWERS_KEY, JSON.stringify(clientAnswers));
    
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
    if (event.key === CLIENT_ANSWERS_KEY && isOwner) {
        updateClientCounts();
    }
    if (event.key === ACTIVE_OWNER_KEY || event.key === QUIZ_STATE_KEY) {
        // Check if session state changed
        checkSession();
    }
}); 
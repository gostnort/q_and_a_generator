// Owner-specific functionality - Client Monitoring & Session Management
let refreshInterval = null;

// Global error handler
window.addEventListener('error', function(e) {
    console.error('JavaScript Error:', e.error);
    console.error('File:', e.filename, 'Line:', e.lineno);
});

// Initialize owner dashboard
window.initializeOwnerDashboard = function(username) {
    console.log('Initializing owner dashboard for:', username);
    
    try {
        // currentUser is managed by main index.html
        const ownerNameElement = document.getElementById('ownerName');
        if (ownerNameElement) {
            ownerNameElement.textContent = username;
        }
        
        // Populate quiz dropdown
        setTimeout(() => {
            try {
                populateQuizDropdown('tests');
            } catch (error) {
                console.error('Error populating quiz dropdown:', error);
                alert('Error loading quiz list. Please refresh the page.');
            }
        }, 100);
        
        // Keep the button enabled
        setTimeout(() => {
            const loadBtn = document.getElementById('loadQuizBtn');
            if (loadBtn) {
                loadBtn.disabled = false;
                console.log('Load button enabled and ready');
            }
        }, 100);
        
        // Check if there's an active session
        checkActiveSession();
        
        // Load saved analytics if any
        loadAnalytics();
        
        console.log('Owner dashboard initialized successfully');
        
    } catch (error) {
        console.error('Error initializing owner dashboard:', error);
        alert('Error loading owner dashboard. Please refresh the page.');
    }
};

// Check for existing active session
function checkActiveSession() {
    const session = getQuizSession();
    if (session) {
        showActiveSession(session);
        startClientMonitoring();
    }
}

// Load quiz preview when dropdown changes
function loadQuizPreview() {
    try {
        const select = document.getElementById('tests');
        const loadBtn = document.getElementById('loadQuizBtn');
        
        if (!select || !loadBtn) {
            console.error('Required elements not found for quiz preview');
            return;
        }
        
        console.log('loadQuizPreview called, dropdown value:', select.value);
        
        // Always keep button enabled
        loadBtn.disabled = false;
        console.log('Button state updated for quiz:', select.value);
    } catch (error) {
        console.error('Error in loadQuizPreview:', error);
    }
}

// Load quiz and show preview
window.loadQuiz = function loadQuiz() {
    console.log('=== loadQuiz function called ===');
    const select = document.getElementById('tests');
    const selectedQuiz = select.value;
    if (!selectedQuiz) {
        alert('Please select a quiz.');
        return;
    }
    console.log('Loading quiz:', selectedQuiz);
    
    // Use updated path for collections structure
    fetch(`/collections/${selectedQuiz}/quiz.csv`)
        .then(response => response.text())
        .then(csvText => {
            console.log('Raw CSV data:', csvText);
            const parsedCsvData = parseCSV(csvText);
            if (!parsedCsvData || parsedCsvData.length === 0) {
                alert('No questions found in the quiz or failed to parse CSV data.');
                return;
            }
            console.log('Questions parsed:', parsedCsvData.length);
            
            // Set global csvData for processQuestions function
            window.csvData = parsedCsvData;
            
            // Process questions for display (original order first)
            const processedQuestions = processQuestions(selectedQuiz);
            
            // Randomize questions for both owner and client (same sequence)
            const randomizedQuestions = shuffleArray(processedQuestions);
            
            // Store randomized questions globally for client use
            window.randomizedQuestions = randomizedQuestions;
            
            // Show preview with analytics (randomized order)
            showQuizPreview(randomizedQuestions, selectedQuiz);
            
            // Initialize analytics with randomized questions
            initializeAnalytics(randomizedQuestions);
            
            // Auto-start the session immediately
            startQuizSession(selectedQuiz);
        })
        .catch(error => {
            console.error('Error loading quiz:', error.message);
            alert('Error loading quiz. Please check the file path and try again.');
        });
};

// Show quiz preview with analytics
function showQuizPreview(displayQuestions, quizName) {
    console.log('showQuizPreview called with', displayQuestions.length, 'questions');
    
    const previewDiv = document.getElementById('quizPreview');
    const contentDiv = document.getElementById('previewContent');
    
    if (!previewDiv || !contentDiv) {
        console.error('Preview elements not found');
        alert('Preview area not found. Please refresh the page.');
        return;
    }
    
    try {
        let html = '';
        displayQuestions.forEach((question, index) => {
            html += `
                <div class="question" data-question-id="${question.id}">
                    <div class="question-header">${index + 1}. ${question.text}</div>
                    ${question.image ? `<div class="question-image"><img src="${question.image}" alt="Question image"></div>` : ''}
                    <div class="options">
            `;
            
            if (question.options && Array.isArray(question.options)) {
                question.options.forEach(option => {
                    const isCorrect = option.startsWith('`');
                    const cleanOption = isCorrect ? option.substring(1) : option;
                    html += `
                        <div class="option ${isCorrect ? 'correct-answer owner-correct-answer' : ''}">
                            <input type="radio" disabled>
                            <span class="option-text">${cleanOption}</span>
                            ${isCorrect ? '<span class="result-icon correct-mark">✓ Correct</span>' : ''}
                        </div>
                    `;
                });
            }
            
            html += `
                    </div>
                    <div class="analytics-display">No responses yet</div>
                </div>
            `;
        });
        
        contentDiv.innerHTML = html;
        previewDiv.classList.remove('hide');
        console.log('Quiz preview shown successfully');
    } catch (error) {
        console.error('Error showing quiz preview:', error);
        alert('Error displaying quiz preview: ' + error.message);
    }
}

// Start a new quiz session
function startQuizSession(selectedQuiz = null) {
    if (!selectedQuiz) {
        const select = document.getElementById('tests');
        selectedQuiz = select.value;
        if (!selectedQuiz) {
            alert('Please select a quiz.');
            return;
        }
    }
    
    // Set active quiz in shared state
    setActiveQuiz(selectedQuiz);
    
    // Show session info
    const session = getQuizSession();
    showActiveSession(session);
    
    // Start monitoring clients
    startClientMonitoring();
    
    console.log(`Quiz session started! Clients can now access the "${selectedQuiz}" quiz.`);
}

// End current quiz session
function endQuizSession() {
    if (confirm('Are you sure you want to end the current quiz session?')) {
        clearQuizSession();
        hideActiveSession();
        stopClientMonitoring();
        alert('Quiz session ended.');
    }
}

// Show active session info
function showActiveSession(session) {
    const sessionInfo = document.getElementById('sessionInfo');
    const sessionDetails = document.getElementById('sessionDetails');
    const clientMonitoring = document.getElementById('clientMonitoring');
    
    sessionDetails.innerHTML = `
        <div class="session-detail">
            <strong>Quiz:</strong> ${session.quizName}
        </div>
        <div class="session-detail">
            <strong>Started:</strong> ${formatTime(session.startTime)}
        </div>
        <div class="session-detail">
            <strong>Session ID:</strong> ${session.sessionId}
        </div>
    `;
    
    sessionInfo.classList.remove('hide');
    clientMonitoring.classList.remove('hide');
    
    // Hide quiz selector
    document.querySelector('.test-selector').style.opacity = '0.5';
    document.querySelector('.test-selector button').disabled = true;
    document.querySelector('.test-selector select').disabled = true;
}

// Hide active session info
function hideActiveSession() {
    document.getElementById('sessionInfo').classList.add('hide');
    document.getElementById('clientMonitoring').classList.add('hide');
    
    // Show quiz selector
    document.querySelector('.test-selector').style.opacity = '1';
    document.querySelector('.test-selector button').disabled = false;
    document.querySelector('.test-selector select').disabled = false;
}

// Start monitoring client submissions
function startClientMonitoring() {
    refreshSubmissions();
    // Auto-refresh every 5 seconds
    refreshInterval = setInterval(refreshSubmissions, 5000);
}

// Stop monitoring
function stopClientMonitoring() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// Refresh client submissions display
function refreshSubmissions() {
    const submissions = getClientSubmissions();
    displaySubmissions(submissions);
    updateSubmissionCount(submissions.length);
}

// Display client submissions
function displaySubmissions(submissions) {
    const container = document.getElementById('submissionsList');
    
    if (submissions.length === 0) {
        container.innerHTML = '<div class="no-submissions">No client submissions yet. Waiting for clients to complete the quiz...</div>';
        return;
    }
    
    container.innerHTML = '';
    
    submissions.forEach(submission => {
        const submissionDiv = document.createElement('div');
        submissionDiv.className = 'submission-item';
        
        const statusClass = submission.passed ? 'passed' : 'failed';
        const statusText = submission.passed ? 'PASSED' : 'FAILED';
        
        submissionDiv.innerHTML = `
            <div class="submission-header">
                <div class="client-info">
                    <strong>${submission.clientName}</strong>
                    <span class="submission-time">${formatTime(submission.submissionTime)}</span>
                </div>
                <div class="submission-score ${statusClass}">
                    ${submission.percentage}% (${submission.score.correct}/${submission.score.total}) - ${statusText}
                </div>
            </div>
            <div class="submission-details">
                <button onclick="toggleAnswerDetails('${submission.clientName}')" class="toggle-details-btn">
                    View Answers
                </button>
                <div id="answers-${submission.clientName}" class="answer-details hide">
                    ${renderClientAnswers(submission.answers)}
                </div>
            </div>
        `;
        
        container.appendChild(submissionDiv);
    });
}

// Render client answers
function renderClientAnswers(answers) {
    if (!answers || answers.length === 0) {
        return '<div class="no-answers">No answer details available</div>';
    }
    
    let html = '<div class="answers-list">';
    answers.forEach((answer, index) => {
        const correctClass = answer.isCorrect ? 'correct' : 'incorrect';
        const icon = answer.isCorrect ? '✓' : '✗';
        
        html += `
            <div class="answer-item ${correctClass}">
                <div class="answer-header">
                    <span class="question-number">Q${index + 1}</span>
                    <span class="answer-icon">${icon}</span>
                </div>
                <div class="answer-text">${answer.questionText}</div>
                <div class="selected-answer">Selected: ${answer.selectedAnswer || 'No answer'}</div>
                ${answer.correctAnswer ? `<div class="correct-answer">Correct: ${answer.correctAnswer}</div>` : ''}
            </div>
        `;
    });
    html += '</div>';
    
    return html;
}

// Toggle answer details
function toggleAnswerDetails(clientName) {
    const detailsDiv = document.getElementById(`answers-${clientName}`);
    const button = detailsDiv.previousElementSibling;
    
    if (detailsDiv.classList.contains('hide')) {
        detailsDiv.classList.remove('hide');
        button.textContent = 'Hide Answers';
    } else {
        detailsDiv.classList.add('hide');
        button.textContent = 'View Answers';
    }
}

// Update submission count
function updateSubmissionCount(count) {
    const countElement = document.getElementById('submissionCount');
    if (count === 0) {
        countElement.textContent = 'No submissions yet';
    } else {
        countElement.textContent = `${count} submission${count > 1 ? 's' : ''} received`;
    }
}

// Logout function
window.logout = function logout() {
    // Stop monitoring first
    stopClientMonitoring();
    
    // Ask if they want to end the session
    const session = getQuizSession();
    if (session) {
        if (confirm('The client will be kicked out of the quiz. Do you want to end it before logging out?')) {
            clearQuizSession();
        }
    }
    
    // Clear session data
    sessionStorage.removeItem('userName');
    // Redirect to login
    window.location.reload();
}; 
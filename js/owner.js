// Owner-specific functionality - Client Monitoring & Session Management
let currentUsername = '';
let refreshInterval = null;

// Initialize owner interface
window.addEventListener('load', function() {
    console.log('Owner page loaded');
    
    // Get username from URL parameters or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user') || sessionStorage.getItem('username');
    
    if (!username) {
        // Redirect to login if no username
        window.location.href = '/test/';
        return;
    }
    
    // Verify user is actually an owner
    if (checkUserRole(username) !== 'owner') {
        alert('Access denied. Owner credentials required.');
        window.location.href = '/test/';
        return;
    }
    
    currentUsername = username;
    document.getElementById('ownerEmail').textContent = username;
    
    // Populate quiz dropdown
    populateQuizDropdown('tests');
    
    // Check if there's an active session
    checkActiveSession();
});

// Check for existing active session
function checkActiveSession() {
    const session = getQuizSession();
    if (session) {
        showActiveSession(session);
        startClientMonitoring();
    }
}

// Start a new quiz session
function startQuizSession() {
    const select = document.getElementById('tests');
    const selectedQuiz = select.value;
    if (!selectedQuiz) {
        alert('Please select a quiz.');
        return;
    }
    
    // Set active quiz in shared state
    setActiveQuiz(selectedQuiz);
    
    // Show session info
    const session = getQuizSession();
    showActiveSession(session);
    
    // Start monitoring clients
    startClientMonitoring();
    
    alert(`Quiz session started! Clients can now access the "${selectedQuiz}" quiz.`);
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
function logout() {
    // Stop monitoring first
    stopClientMonitoring();
    
    // Ask if they want to end the session
    const session = getQuizSession();
    if (session) {
        if (confirm('You have an active quiz session. Do you want to end it before logging out?')) {
            clearQuizSession();
        }
    }
    
    // Clear session data
    sessionStorage.removeItem('username');
    // Redirect to login
    window.location.href = '/test/';
} 
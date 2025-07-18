// Client-specific functionality - Auto-load assigned quiz and submit to owner monitoring
let currentQuizName = '';
let sessionCheckInterval = null;
let questions = []; // Store client questions (randomized)

// Initialize client interface
window.initializeClientInterface = function(username) {
    console.log('Initializing client interface for:', username);
    
    // currentUser is managed by main index.html
    
    // Start checking for active quiz session
    checkForActiveQuiz();
    startSessionMonitoring();
};

// Check for active quiz session
function checkForActiveQuiz() {
    const activeQuiz = getActiveQuiz();
    const session = getQuizSession();
    
    if (activeQuiz && session) {
        loadAssignedQuiz(activeQuiz);
    } else {
        showWaitingStatus();
    }
}

// Start monitoring for quiz session changes
function startSessionMonitoring() {
    // Check every 3 seconds for new quiz assignments
    sessionCheckInterval = setInterval(checkForActiveQuiz, 3000);
}

// Stop session monitoring
function stopSessionMonitoring() {
    if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
        sessionCheckInterval = null;
    }
}

// Show waiting status
function showWaitingStatus() {
    const statusDiv = document.getElementById('quizStatus');
    const questionsContainer = document.getElementById('questionsContainer');
    const quizName = document.getElementById('quizName');
    
    statusDiv.style.display = 'block';
    questionsContainer.innerHTML = '';
    quizName.textContent = 'Waiting for Quiz...';
    
    // Disable submit button
    document.getElementById('submitBtn').disabled = true;
    
    // Clear score
    const scoreLabel = document.getElementById('scoreLabel');
    if (scoreLabel) scoreLabel.textContent = '';
}

// Load assigned quiz from owner
async function loadAssignedQuiz(quizName) {
    currentQuizName = quizName;
    
    // Hide status, show quiz
    document.getElementById('quizStatus').style.display = 'none';
    document.getElementById('quizName').textContent = quizName;
    
    // Enable submit button
    document.getElementById('submitBtn').disabled = false;
    
    // Check if randomized questions are available from owner
    if (window.randomizedQuestions && window.randomizedQuestions.length > 0) {
        // Use the same randomized questions as owner (no additional shuffling)
        questions = window.randomizedQuestions;
        
        // Clear any previous score
        const scoreLabel = document.getElementById('scoreLabel');
        if (scoreLabel) scoreLabel.textContent = '';
        
        // Render questions (same sequence as owner)
        renderClientQuestions();
        
        console.log(`Quiz "${quizName}" loaded successfully with ${questions.length} questions (same sequence as owner)`);
    } else {
        // Fallback: load CSV data directly (for testing)
        const success = await loadCSVDataFromQuizFolder(quizName);
        if (!success) {
            showError('Failed to load quiz. Please contact the owner.');
            return;
        }
        
        // Process and randomize questions for client
        const allQuestions = processQuestions(quizName);
        questions = shuffleArray(allQuestions); // Randomize question order
        
        // Clear any previous score
        const scoreLabel = document.getElementById('scoreLabel');
        if (scoreLabel) scoreLabel.textContent = '';
        
        // Render randomized questions
        renderClientQuestions();
        
        console.log(`Quiz "${quizName}" loaded successfully with fallback method`);
    }
}

// Show error message
function showError(message) {
    const statusDiv = document.getElementById('quizStatus');
    statusDiv.innerHTML = `<div class="error-message">${message}</div>`;
    statusDiv.style.display = 'block';
}

// Render questions for client (randomized questions and options)
function renderClientQuestions() {
    const container = document.getElementById('questionsContainer');
    if (!container) {
        console.error('questionsContainer not found!');
        return;
    }
    
    container.innerHTML = '';
    
    questions.forEach((question, qIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);
        
        const isMulti = isMultiSelect(question.options);
        const inputType = isMulti ? 'checkbox' : 'radio';
        const inputName = `question_${qIndex}`;
        
        let html = `
            <div class="question-header">
                ${qIndex + 1}. ${question.text}
            </div>
        `;
        
        if (question.image) {
            html += `
                <div class="question-image">
                    <img src="${question.image}" alt="Question image" 
                         onerror="console.error('Failed to load image:', this.src); this.style.display='none'">
                </div>
            `;
        }
        
        // Shuffle options for clients
        let optionObjs = question.options.map((opt, idx) => ({text: opt, originalIndex: idx}));
        const displayOptions = shuffleArray(optionObjs);
        
        displayOptions.forEach((option, optIndex) => {
            const optionId = `${inputName}_${optIndex}`;
            const optionText = option.text.startsWith('`') ? option.text.substring(1) : option.text;
            
            html += `
                <div class="option" data-original-index="${option.originalIndex}">
                    <input type="${inputType}" id="${optionId}" name="${inputName}" value="${optIndex}">
                    <label for="${optionId}" class="option-text">${optionText}</label>
                    <span class="result-icon"></span>
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

// Submit answers and calculate score
function submitAnswers() {
    let totalQuestions = questions.length;
    let totalCorrect = 0;
    let totalPossiblePoints = 0;
    let userPoints = 0;
    let clientAnswers = []; // Track answers for owner monitoring

    questions.forEach((question, qIndex) => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        const options = questionDiv.querySelectorAll('.option');
        const inputs = questionDiv.querySelectorAll('input');
        
        const correctOptionsInQuestion = question.options.filter(opt => opt.startsWith('`'));
        totalPossiblePoints += correctOptionsInQuestion.length;

        let questionPoints = 0;
        let incorrectSelectionMade = false;
        let selectedAnswers = [];
        let correctAnswers = [];

        options.forEach((optionDiv, optIndex) => {
            const input = inputs[optIndex];
            const resultIcon = optionDiv.querySelector('.result-icon');
            const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
            const originalOption = question.options[originalIndex];
            const isCorrect = originalOption.startsWith('`');
            
            // Track correct answers
            if (isCorrect) {
                correctAnswers.push(originalOption.substring(1));
            }
            
            // Clear previous results
            optionDiv.classList.remove('correct-answer', 'show-correct');
            resultIcon.innerHTML = '';
            resultIcon.className = 'result-icon';
            
            if (input.checked) {
                selectedAnswers.push(originalOption.startsWith('`') ? originalOption.substring(1) : originalOption);
                
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
        
        // Save answer details for owner monitoring
        clientAnswers.push({
            questionText: question.text,
            selectedAnswer: selectedAnswers.join(', '),
            correctAnswer: correctAnswers.join(', '),
            isCorrect: !questionIsWrong
        });
        
        // Track analytics for owner (use original question ID)
        if (typeof trackOptionSelection === 'function') {
            trackOptionSelection(currentUser, question.id, selectedAnswers);
        }
    });

    // Calculate percentage based on total possible points
    const percentage = totalPossiblePoints > 0 ? Math.round((userPoints / totalPossiblePoints) * 100) : 0;
    const passed = percentage >= settings.passPercentage;
    const status = passed ? 'Pass' : 'Fail';
    
    // Display results
    const scoreLabel = document.getElementById('scoreLabel');
    if (scoreLabel) {
        scoreLabel.textContent = `${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`;
        scoreLabel.className = `score-label ${passed ? 'passed' : 'failed'}`;
    }
    
    // Disable submit button after submission
    document.getElementById('submitBtn').disabled = true;
    
    // Save submission to owner monitoring
    const submissionData = {
        answers: clientAnswers,
        score: {
            correct: userPoints,
            total: totalPossiblePoints
        },
        percentage: percentage,
        passed: passed
    };
    
    saveClientSubmission(currentUser, submissionData);
    
    // Show completion message
    alert(`Quiz completed! Your score: ${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`);
    
    // Stop monitoring since quiz is complete
    stopSessionMonitoring();
}

// Make submitAnswers globally accessible
window.submitAnswers = submitAnswers; 
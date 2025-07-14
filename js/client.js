// Client-specific functionality
let currentUsername = '';
let currentQuizName = '';

// Initialize client interface
window.addEventListener('load', function() {
    console.log('Client page loaded');
    
    // Get username from URL parameters or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user') || sessionStorage.getItem('username');
    
    if (!username) {
        // Redirect to login if no username
        window.location.href = '../index.html';
        return;
    }
    
    currentUsername = username;
    
    // Populate quiz dropdown
    populateQuizDropdown('tests');
});

// Load quiz for client (shows randomized questions and options)
async function loadQuiz() {
    const select = document.getElementById('tests');
    const selectedQuiz = select.value;
    if (!selectedQuiz) {
        alert('Please select a quiz.');
        return;
    }
    
    currentQuizName = selectedQuiz;
    document.getElementById('zipName').textContent = selectedQuiz;
    
    // Load CSV data
    const success = await loadCSVDataFromQuizFolder(selectedQuiz);
    if (!success) return;
    
    // Process and randomize questions for client
    const allQuestions = processQuestions(selectedQuiz);
    questions = shuffleArray(allQuestions); // Randomize question order
    
    // Clear any previous score
    const scoreLabel = document.getElementById('scoreLabel');
    if (scoreLabel) scoreLabel.textContent = '';
    
    // Render randomized questions
    renderClientQuestions();
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

    questions.forEach((question, qIndex) => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        const options = questionDiv.querySelectorAll('.option');
        const inputs = questionDiv.querySelectorAll('input');
        
        const correctOptionsInQuestion = question.options.filter(opt => opt.startsWith('`'));
        totalPossiblePoints += correctOptionsInQuestion.length;

        let questionPoints = 0;
        let incorrectSelectionMade = false;

        options.forEach((optionDiv, optIndex) => {
            const input = inputs[optIndex];
            const resultIcon = optionDiv.querySelector('.result-icon');
            const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
            const originalOption = question.options[originalIndex];
            const isCorrect = originalOption.startsWith('`');
            
            // Clear previous results
            optionDiv.classList.remove('correct-answer', 'show-correct');
            resultIcon.innerHTML = '';
            resultIcon.className = 'result-icon';
            
            if (input.checked) {
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
    });

    // Calculate percentage based on total possible points
    const percentage = totalPossiblePoints > 0 ? Math.round((userPoints / totalPossiblePoints) * 100) : 0;
    const passed = percentage >= settings.passPercentage;
    const status = passed ? 'Pass' : 'Fail';
    
    const scoreLabel = document.getElementById('scoreLabel');
    scoreLabel.textContent = `Score: ${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`;
    scoreLabel.style.backgroundColor = passed ? '#d4edda' : '#f8d7da';
    scoreLabel.style.color = passed ? '#155724' : '#721c24';
} 
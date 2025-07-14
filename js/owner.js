// Owner-specific functionality
let currentUsername = '';
let currentQuizName = '';

// Initialize owner interface
window.addEventListener('load', function() {
    console.log('Owner page loaded');
    
    // Get username from URL parameters or session storage
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user') || sessionStorage.getItem('username');
    
    if (!username) {
        // Redirect to login if no username
        window.location.href = 'index.html';
        return;
    }
    
    // Verify user is actually an owner
    if (checkUserRole(username) !== 'owner') {
        alert('Access denied. Owner credentials required.');
        window.location.href = 'index.html';
        return;
    }
    
    currentUsername = username;
    document.getElementById('ownerEmail').textContent = username;
    
    // Populate quiz dropdown
    populateQuizDropdown('tests');
});

// Load quiz for owner (shows questions in original order)
async function loadQuiz() {
    const select = document.getElementById('tests');
    const selectedQuiz = select.value;
    if (!selectedQuiz) {
        alert('Please select a quiz.');
        return;
    }
    
    currentQuizName = selectedQuiz;
    
    // Load CSV data
    const success = await loadCSVDataFromQuizFolder(selectedQuiz);
    if (!success) return;
    
    // Process questions (owner sees original order)
    questions = processQuestions(selectedQuiz);
    
    // Render questions in owner interface
    renderOwnerQuestions();
}

// Render questions for owner (original order, no randomization)
function renderOwnerQuestions() {
    const container = document.getElementById('ownerQuestions');
    if (!container) {
        console.error('ownerQuestions container not found!');
        return;
    }
    
    container.innerHTML = '<h3>Quiz Preview (Original Order)</h3>';
    
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
        
        // Show options in original order (no shuffling for owner)
        question.options.forEach((option, optIndex) => {
            const optionId = `${inputName}_${optIndex}`;
            const isCorrect = option.startsWith('`');
            const optionText = isCorrect ? option.substring(1) : option;
            const correctClass = isCorrect ? 'owner-correct-answer' : '';
            
            html += `
                <div class="option ${correctClass}">
                    <input type="${inputType}" id="${optionId}" name="${inputName}" value="${optIndex}" disabled>
                    <label for="${optionId}" class="option-text">${optionText}</label>
                    ${isCorrect ? '<span class="correct-indicator">✓ Correct</span>' : ''}
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

// Logout function
function logout() {
    // Clear session data
    sessionStorage.removeItem('username');
    // Redirect to login
    window.location.href = 'index.html';
} 
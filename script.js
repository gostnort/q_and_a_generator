let csvData = [];
let questions = [];
let isFirstGenerate = true;
let settings = {
    numQuestions: '',
    passPercentage: 90
};

// Fallback embedded CSV data in case no file is found
const embeddedCSVData = `Unable to load CSV data`;

// Fetch quiz list from /tests (simulate by hardcoding for now)
async function populateQuizDropdown() {
    // In a real app, you might fetch a manifest or list subfolders via an API
    // For now, hardcode the available quizzes
    const quizzes = ['sample'];
    const select = document.getElementById('zipFiles');
    select.innerHTML = '';
    quizzes.forEach(quiz => {
        const option = document.createElement('option');
        option.value = quiz;
        option.textContent = quiz;
        select.appendChild(option);
    });
}

// Load CSV data from /tests/{quiz}/test.csv
async function loadCSVDataFromQuizFolder(quizName) {
    try {
        const folder = `/tests/${quizName}/`;
        const response = await fetch(folder + 'test.csv');
        if (!response.ok) throw new Error('Quiz CSV not found');
        const csvText = await response.text();
        csvData = parseCSV(csvText);
        isFirstGenerate = false;
        regenerateQuiz();
    } catch (error) {
        alert('Failed to load quiz CSV. Make sure there is a test.csv file in the test folder.');
        console.error('Error loading quiz CSV:', error);
        csvData = parseCSV(embeddedCSVData);
        isFirstGenerate = false;
        regenerateQuiz();
    }
}

// Parse CSV data (unchanged)
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

// Convert CSV data to questions format (update image path)
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
        let imageUrl = null;
        if (imageName && imageName.trim() !== '') {
            imageUrl = `/tests/${getCurrentQuizName()}/${imageName.trim()}`;
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

function getCurrentQuizName() {
    const select = document.getElementById('zipFiles');
    return select ? select.value : '';
}

function regenerateQuiz() {
    const scoreLabel = document.getElementById('scoreLabel');
    if (scoreLabel) scoreLabel.textContent = '';
    const allQuestions = processQuestions();
    // Defensive: check for numQuestions input
    const numQuestionsInput = document.getElementById('numQuestions');
    if (numQuestionsInput) numQuestionsInput.max = allQuestions.length;
    if (!settings.numQuestions || settings.numQuestions > allQuestions.length) {
        settings.numQuestions = allQuestions.length;
    }
    if (numQuestionsInput) numQuestionsInput.value = settings.numQuestions;
    const shuffledQuestions = shuffleArray(allQuestions);
    questions = shuffledQuestions.slice(0, Math.min(settings.numQuestions, shuffledQuestions.length));
    if (scoreLabel) scoreLabel.textContent = '';
    renderQuestions();
}

function renderQuestions() {
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
            console.log(`Rendering image with src: ${question.image}`);
        }
        
        // Shuffle options
        const shuffledOptions = shuffleArray(question.options.map((opt, idx) => ({text: opt, originalIndex: idx})));
        
        shuffledOptions.forEach((option, optIndex) => {
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
    
    document.getElementById('scoreLabel').textContent = `Score: ${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`;
    document.getElementById('scoreLabel').style.backgroundColor = passed ? '#d4edda' : '#f8d7da';
    document.getElementById('scoreLabel').style.color = passed ? '#155724' : '#721c24';
}

function printQuiz() {
    window.print();
}

// Cleanup function to revoke object URLs
function cleanupImageUrls() {
    // No imageUrlMap to revoke as images are directly fetched
}

function login() {
    const username = document.getElementById('ownerIdentity').value.trim();
    if (!username) {
        alert('Please enter a username.');
        return;
    }
    // Show owner interface, hide login
    document.getElementById('loginInterface').style.display = 'none';
    document.getElementById('ownerInterface').style.display = 'block';
    document.getElementById('ownerEmail').textContent = username;
    populateQuizDropdown();
}

function logout() {
    // Simple logout: reload the page to reset state
    window.location.reload();
}

function loadQuiz() {
    const select = document.getElementById('zipFiles');
    const selectedQuiz = select.value;
    if (!selectedQuiz) {
        alert('Please select a quiz.');
        return;
    }
    document.getElementById('zipName').textContent = selectedQuiz;
    loadCSVDataFromQuizFolder(selectedQuiz);
}

// Initialize
window.addEventListener('load', function() {
    console.log('Page loaded');
    populateQuizDropdown(); // Populate dropdown on load
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    cleanupImageUrls();
}); 

// Client功能
let clientCurrentSession = null;
let clientCurrentAnswers = {};

// 初始化Client Interface
window.initializeClientInterface = async function() {
    await loadActiveQuiz();
};

// 加载活跃Quiz
async function loadActiveQuiz() {
    try {
        const session = await window.firebaseService.getActiveSession();
        if (!session) {
            show404Page();
            return;
        }
        
        clientCurrentSession = session;
        displayQuiz(session);
    } catch (error) {
        console.error('Error loading active quiz:', error);
        show404Page();
    }
}

// 显示Quiz
function displayQuiz(session) {
    document.getElementById('quizTitle').textContent = session.quizName;
    
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    session.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);
        
        let html = `
            <div class="question-header">
                ${index + 1}. ${question.text}
            </div>
        `;
        
        if (question.image) {
            html += `
                <div class="question-image">
                    <img src="${question.image}" alt="Question image" 
                         onerror="this.style.display='none'">
                </div>
            `;
        }
        
        // 显示选项
        question.options.forEach((option, optIndex) => {
            const optionId = `question_${question.id}_option_${optIndex}`;
            html += `
                <div class="option">
                    <input type="radio" id="${optionId}" name="question_${question.id}" 
                           value="${option}" onchange="updateAnswer(${question.id}, '${option}')">
                    <label for="${optionId}" class="option-text">${option}</label>
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

// 更新答案
window.updateAnswer = function(questionId, selectedOption) {
    clientCurrentAnswers[questionId] = [selectedOption];
    
    // 实时提交答案到Firebase
    if (clientCurrentSession) {
        window.firebaseService.submitAnswer(
            clientCurrentSession.id, 
            currentUser, 
            questionId, 
            [selectedOption]
        );
    }
};

// 提交Quiz
window.submitQuiz = function() {
    const totalQuestions = clientCurrentSession.questions.length;
    const answeredQuestions = Object.keys(clientCurrentAnswers).length;
    
    if (answeredQuestions < totalQuestions) {
        alert(`请回答所有问题。已回答 ${answeredQuestions}/${totalQuestions} 题。`);
        return;
    }
    
    // 计算个人结果
    let correctCount = 0;
    clientCurrentSession.questions.forEach(question => {
        const userAnswer = clientCurrentAnswers[question.id];
        const correctOptions = question.options.filter(opt => opt.startsWith('`'));
        
        if (userAnswer && userAnswer.length === correctOptions.length) {
            const isCorrect = correctOptions.every(opt => 
                userAnswer.includes(opt.substring(1))
            );
            if (isCorrect) correctCount++;
        }
    });
    
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // 显示个人结果
    alert(`Quiz完成！\n正确率: ${correctCount}/${totalQuestions} (${percentage}%)`);
    
    // 禁用提交按钮
    document.getElementById('submitBtn').disabled = true;
    document.getElementById('submitBtn').textContent = '已提交';
}; 
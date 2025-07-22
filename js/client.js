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
        
        // 获取包含图片的完整Quiz数据
        const quizWithImages = await window.firebaseService.getQuizWithImages(session.quizId);
        if (quizWithImages) {
            session.questions = quizWithImages.questions;
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
        
        // 显示图片（base64格式）
        if (question.imageData && question.imageData.base64) {
            html += `
                <div class="question-image">
                    <img src="data:image/png;base64,${question.imageData.base64}" 
                         alt="Question image" onerror="this.style.display='none'">
                </div>
            `;
        }
        
        // 检查是否为多选题（多个正确答案）
        const correctCount = question.options.filter(opt => opt.correct).length;
        const isMultipleChoice = correctCount > 1;
        const inputType = isMultipleChoice ? 'checkbox' : 'radio';
        
        // 显示选项
        question.options.forEach((option, optIndex) => {
            const optionId = `question_${question.id}_option_${optIndex}`;
            const inputName = isMultipleChoice ? `question_${question.id}_${optIndex}` : `question_${question.id}`;
            
            html += `
                <div class="option">
                    <input type="${inputType}" id="${optionId}" name="${inputName}" 
                           value="${option.text}" onchange="updateAnswer('${question.id}', '${option.text}', ${isMultipleChoice})">
                    <label for="${optionId}" class="option-text">${option.text}</label>
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

// 更新答案
window.updateAnswer = function(questionId, selectedOption, isMultiple) {
    if (isMultiple) {
        // 多选题处理
        if (!clientCurrentAnswers[questionId]) {
            clientCurrentAnswers[questionId] = [];
        }
        
        const checkbox = document.querySelector(`input[value="${selectedOption}"]`);
        if (checkbox.checked) {
            if (!clientCurrentAnswers[questionId].includes(selectedOption)) {
                clientCurrentAnswers[questionId].push(selectedOption);
            }
        } else {
            clientCurrentAnswers[questionId] = clientCurrentAnswers[questionId].filter(opt => opt !== selectedOption);
        }
    } else {
        // 单选题处理
        clientCurrentAnswers[questionId] = [selectedOption];
    }
    
    // 实时提交答案到Firebase
    if (clientCurrentSession) {
        window.firebaseService.submitAnswer(
            clientCurrentSession.id, 
            currentUser, 
            questionId, 
            clientCurrentAnswers[questionId]
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
        const userAnswers = clientCurrentAnswers[question.id] || [];
        const correctOptions = question.options.filter(opt => opt.correct).map(opt => opt.text);
        
        // 检查答案是否正确（必须完全匹配）
        if (userAnswers.length === correctOptions.length && 
            correctOptions.every(correct => userAnswers.includes(correct))) {
            correctCount++;
        }
    });
    
    const percentage = Math.round((correctCount / totalQuestions) * 100);
    
    // 显示个人结果
    alert(`Quiz完成！\n正确率: ${correctCount}/${totalQuestions} (${percentage}%)`);
    
    // 禁用提交按钮
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '已提交';
    }
}; 
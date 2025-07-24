// Client功能
let clientCurrentSession = null;
let clientCurrentAnswers = {};

// HTML转义辅助函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 安全的属性值转义函数
function escapeAttr(text) {
    return text.replace(/[&<>"']/g, function(match) {
        switch (match) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&#39;';
            default: return match;
        }
    });
}

// 初始化Client Interface
window.initializeClientInterface = async function() {
    await loadActiveQuiz();
};

// 加载活跃的Quiz
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
    console.log('displayQuiz called - session:', session?.quizName, 'questions:', session?.questions?.length);
    
    // Set both the header title and quiz title (remove "Quiz" prefix)
    document.getElementById('clientQuizTitle').textContent = session.quizName;
    document.getElementById('quizTitle').textContent = session.quizName;
    
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    session.questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);
        
        // 创建问题标题
        const questionHeader = document.createElement('div');
        questionHeader.className = 'question-header';
        questionHeader.textContent = `${index + 1}. ${question.text}`;
        questionDiv.appendChild(questionHeader);
        
        // 显示图片（base64格式）
        if (question.imageData && question.imageData.base64) {
            const imageDiv = document.createElement('div');
            imageDiv.className = 'question-image';
            
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${question.imageData.base64}`;
            img.alt = 'Question image';
            img.onerror = function() { this.style.display = 'none'; };
            
            imageDiv.appendChild(img);
            questionDiv.appendChild(imageDiv);
        }
        
        // 检查是否为多选题（多个正确答案）
        const correctCount = question.options.filter(opt => opt.correct).length;
        const isMultipleChoice = correctCount > 1;
        
        // 显示选项 - DOM manipulation version
        question.options.forEach((option, optIndex) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            
            const optionId = `question_${question.id}_option_${optIndex}`;
            const inputName = isMultipleChoice ? `question_${question.id}_option_${optIndex}` : `question_${question.id}`;
            const inputType = isMultipleChoice ? 'checkbox' : 'radio';
            
            // 创建input元素
            const input = document.createElement('input');
            input.type = inputType;
            input.id = optionId;
            input.name = inputName;
            input.value = option.text;
            input.className = 'option-input';
            
            // 添加事件监听器
            input.addEventListener('change', function() {
                updateAnswer(question.id, option.text, isMultipleChoice);
                // 添加视觉反馈
                updateOptionVisualFeedback(questionDiv, input);
            });
            
            // 创建label元素 - 包装整个选项区域
            const label = document.createElement('label');
            label.setAttribute('for', optionId);
            label.className = 'option-label';
            
            // 创建选项文本容器
            const optionText = document.createElement('span');
            optionText.className = 'option-text';
            optionText.textContent = option.text;
            
            // 组装选项：input在前，文本在后
            label.appendChild(input);
            label.appendChild(optionText);
            optionDiv.appendChild(label);
            questionDiv.appendChild(optionDiv);
        });
        
        container.appendChild(questionDiv);
        
        // Log what was actually added
        const addedInputs = questionDiv.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        console.log(`Question ${question.id}: Added ${addedInputs.length} input controls to DOM`);
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
            clientCurrentSession.id,     // sessionId
            questionId,                  // questionId
            clientCurrentAnswers[questionId], // answers数组
            currentUser                  // userName
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
    
    // 显示分数在头部
    const scoreElement = document.getElementById('clientScore');
    if (scoreElement) {
        scoreElement.textContent = `${correctCount}/${totalQuestions} (${percentage}%)`;
        scoreElement.style.display = 'inline';
        scoreElement.className = percentage >= 60 ? 'score-display passed' : 'score-display failed';
    }
    
    // 显示个人结果
    alert(`Quiz完成！\n正确率: ${correctCount}/${totalQuestions} (${percentage}%)`);
    
    // 禁用提交按钮
    const submitBtn = document.querySelector('.submit-btn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '已提交';
    }
}; 

// 更新选项视觉反馈
function updateOptionVisualFeedback(questionDiv, changedInput) {
    // 获取该问题的所有选项
    const allOptions = questionDiv.querySelectorAll('.option');
    
    // 更新所有选项的样式
    allOptions.forEach(optionDiv => {
        const input = optionDiv.querySelector('.option-input');
        const label = optionDiv.querySelector('.option-label');
        
        if (input && label) {
            if (input.checked) {
                label.classList.add('selected');
                optionDiv.classList.add('selected');
            } else {
                label.classList.remove('selected');
                optionDiv.classList.remove('selected');
            }
        }
    });
} 
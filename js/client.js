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
    console.log('🔴 Initializing client interface...');
    document.getElementById('clientStatus').textContent = 'Client: Loading quiz...';
    
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
    console.log('🔴 displayQuiz function called with session:', session);
    console.log('🔴 About to create DOM elements for questions');
    
    // Update debug status
    document.getElementById('clientStatus').textContent = `Client: ✅ Displaying ${session.questions.length} questions`;
    
    // Set both the header title and quiz title (remove "Quiz" prefix)
    document.getElementById('clientQuizTitle').textContent = session.quizName;
    document.getElementById('quizTitle').textContent = session.quizName;
    
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    // Add visible debugging info
    const debugDiv = document.createElement('div');
    debugDiv.style.cssText = 'background: yellow; padding: 10px; border: 2px solid red; margin: 10px 0;';
    debugDiv.innerHTML = `<strong>DEBUG: displayQuiz called with ${session.questions.length} questions</strong>`;
    container.appendChild(debugDiv);
    
    session.questions.forEach((question, index) => {
        console.log(`🔴 Processing question ${index + 1}:`, question);
        
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
        
        console.log(`Question ${question.id}: isMultipleChoice=${isMultipleChoice}, correctCount=${correctCount}, options:`, question.options);
        
        // 显示选项
        question.options.forEach((option, optIndex) => {
            console.log(`🔴 Creating option ${optIndex} for question ${question.id}:`, option);
            
            const optionDiv = document.createElement('div');
            optionDiv.className = 'option';
            
            const optionId = `question_${question.id}_option_${optIndex}`;
            const inputName = isMultipleChoice ? `question_${question.id}_option_${optIndex}` : `question_${question.id}`;
            const inputType = isMultipleChoice ? 'checkbox' : 'radio';
            
            console.log(`🔴 Creating ${inputType} with name: ${inputName}`);
            
            // 创建input元素
            const input = document.createElement('input');
            input.type = inputType;
            input.id = optionId;
            input.name = inputName;
            input.value = option.text;
            
            // 添加事件监听器
            input.addEventListener('change', function() {
                updateAnswer(question.id, option.text, isMultipleChoice);
            });
            
            // 创建label元素
            const label = document.createElement('label');
            label.setAttribute('for', optionId);
            label.className = 'option-text';
            label.textContent = option.text;
            
            // 组装选项
            optionDiv.appendChild(input);
            optionDiv.appendChild(label);
            
            // Add visible debugging for input creation
            const inputDebug = document.createElement('span');
            inputDebug.style.cssText = 'color: red; font-weight: bold; margin-left: 10px;';
            inputDebug.textContent = `[${inputType}]`;
            optionDiv.appendChild(inputDebug);
            
            questionDiv.appendChild(optionDiv);
            
            console.log(`🔴 Created ${inputType} for option: ${option.text}`);
        });
        
        container.appendChild(questionDiv);
        
        // Debug: Check if input elements were actually created
        const inputs = questionDiv.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        console.log(`Created ${inputs.length} input controls for question ${question.id}`);
        inputs.forEach((input, idx) => {
            console.log(`Input ${idx}: type=${input.type}, name=${input.name}, value=${input.value}`);
        });
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
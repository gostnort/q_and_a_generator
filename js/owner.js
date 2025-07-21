// Owner功能
let ownerCurrentSession = null;
let answersUnsubscribe = null;
let refreshInterval = null;

// 初始化Owner Dashboard
window.initializeOwnerDashboard = function() {
    loadQuizList();
    checkActiveSession();
    loadOwnerManagement();
};

// 显示上传模态框
window.showUploadModal = function() {
    document.getElementById('uploadModal').style.display = 'block';
};

// 关闭上传模态框
window.closeUploadModal = function() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('uploadProgress').innerHTML = '';
};

// 上传Quiz包
window.uploadQuizPackage = async function() {
    const archiveFile = document.getElementById('zipFile').files[0];
    const quizName = document.getElementById('quizName').value;
    const progressDiv = document.getElementById('uploadProgress');
    
    if (!archiveFile || !quizName) {
        alert('请选择压缩文件并输入Quiz名称');
        return;
    }
    
    progressDiv.innerHTML = '正在解压...';
    try {
        // 读取文件为ArrayBuffer
        const arrayBuffer = await archiveFile.arrayBuffer();
        // 启动JS7z
        const js7z = await JS7z();
        // 写入虚拟文件系统
        js7z.FS.writeFile('/archive', new Uint8Array(arrayBuffer));
        // 解压到 /out 目录
        await new Promise((resolve, reject) => {
            js7z.onExit = (code) => code === 0 ? resolve() : reject(new Error('解压失败'));
            js7z.callMain(['x', '/archive', '-o/out']);
        });
        // 查找quiz.csv和images文件夹下的所有文件
        const files = js7z.FS.readdir('/out');
        let quizCsv = null;
        let images = [];
        for (const file of files) {
            if (file === '.' || file === '..') continue;
            if (file.toLowerCase() === 'quiz.csv') {
                quizCsv = js7z.FS.readFile('/out/quiz.csv');
            } else if (file.toLowerCase() === 'images') {
                const imageFiles = js7z.FS.readdir('/out/images');
                for (const img of imageFiles) {
                    if (img === '.' || img === '..') continue;
                    const imgData = js7z.FS.readFile(`/out/images/${img}`);
                    images.push({ name: img, data: imgData });
                }
            }
        }
        if (!quizCsv) throw new Error('quiz.csv未找到');
        progressDiv.innerHTML = '正在上传到Firebase...';
        // 调用Firebase上传
        await window.firebaseService.uploadQuizPackage({
            quizName,
            quizCsv,
            images
        });
        progressDiv.innerHTML = '✅ 上传成功！';
        closeUploadModal();
        loadQuizList();
    } catch (error) {
        progressDiv.innerHTML = `❌ 上传失败: ${error.message}`;
    }
};

// 加载Quiz列表
async function loadQuizList() {
    const quizListDiv = document.getElementById('quizList');
    const quizzes = await window.firebaseService.getAllQuizzes();
    
    quizListDiv.innerHTML = '';
    
    quizzes.forEach(quiz => {
        const quizItem = document.createElement('div');
        quizItem.className = 'quiz-item';
        quizItem.innerHTML = `
            <div class="quiz-info">
                <h4>${quiz.name}</h4>
                <p>创建时间: ${new Date(quiz.createdAt).toLocaleString()}</p>
                <p>题目数量: ${quiz.questions.length}</p>
            </div>
            <div class="quiz-actions">
                <button onclick="selectQuiz('${quiz.id}')" class="select-btn">选择</button>
                <button onclick="deleteQuiz('${quiz.id}')" class="delete-btn">删除</button>
            </div>
        `;
        quizListDiv.appendChild(quizItem);
    });
}

// 选择Quiz
window.selectQuiz = async function(quizId) {
    try {
        const quizzes = await window.firebaseService.getAllQuizzes();
        const quiz = quizzes.find(q => q.id === quizId);
        
        if (!quiz) {
            alert('Quiz not found.');
            return;
        }
        
        // 创建session
        ownerCurrentSession = await window.firebaseService.createSession(quizId, quiz.name, quiz.questions);
        
        // 显示session管理
        showSessionManagement(ownerCurrentSession);
        
        // 开始实时监控
        startRealTimeMonitoring();
        
        alert(`Quiz "${quiz.name}" 已启动！Clients现在可以参与测试。`);
        
    } catch (error) {
        console.error('Error selecting quiz:', error);
        alert('Error selecting quiz. Please try again.');
    }
};

// 删除Quiz
window.deleteQuiz = async function(quizId) {
    if (!confirm('确定要删除这个Quiz吗？此操作不可撤销。')) {
        return;
    }
    
    try {
        await window.firebaseService.deleteQuiz(quizId);
        alert('Quiz删除成功！');
        loadQuizList();
    } catch (error) {
        console.error('Error deleting quiz:', error);
        alert('删除失败，请重试。');
    }
};

// 显示Session管理
function showSessionManagement(sessionData) {
    document.getElementById('sessionManagement').style.display = 'block';
    
    const sessionDetails = document.getElementById('sessionDetails');
    sessionDetails.innerHTML = `
        <p><strong>Quiz:</strong> ${sessionData.quizName}</p>
        <p><strong>Session ID:</strong> ${sessionData.id}</p>
        <p><strong>开始时间:</strong> ${new Date(sessionData.startTime).toLocaleString()}</p>
    `;
}

// 结束Session
window.endSession = async function() {
    if (!ownerCurrentSession) return;
    
    if (!confirm('确定要结束当前Session吗？')) {
        return;
    }
    
    try {
        await window.firebaseService.endSession(ownerCurrentSession.id);
        stopRealTimeMonitoring();
        document.getElementById('sessionManagement').style.display = 'none';
        ownerCurrentSession = null;
        alert('Session已结束');
    } catch (error) {
        console.error('Error ending session:', error);
        alert('结束Session失败');
    }
};

// 开始实时监控
function startRealTimeMonitoring() {
    if (!ownerCurrentSession) return;
    
    // 立即获取一次数据
    refreshMonitoring();
    
    // 每15秒刷新一次
    refreshInterval = setInterval(refreshMonitoring, 15000);
    
    // 实时监听答案变化
    answersUnsubscribe = window.firebaseService.onAnswersUpdate(ownerCurrentSession.id, (data) => {
        displayRealTimeResults(data);
    });
}

// 停止实时监控
function stopRealTimeMonitoring() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
    
    if (answersUnsubscribe) {
        answersUnsubscribe();
        answersUnsubscribe = null;
    }
}

// 刷新监控数据
window.refreshMonitoring = async function() {
    if (!ownerCurrentSession) return;
    
    try {
        const answers = await window.firebaseService.getRealTimeAnswers(ownerCurrentSession.id);
        displayRealTimeResults(answers);
        
        // 更新最后刷新时间
        document.getElementById('lastUpdateTime').textContent = 
            `最后更新: ${new Date().toLocaleTimeString()}`;
    } catch (error) {
        console.error('Error refreshing monitoring:', error);
    }
};

// 显示实时结果
function displayRealTimeResults(answers) {
    const resultsDiv = document.getElementById('realTimeResults');
    
    if (!ownerCurrentSession || !ownerCurrentSession.questions) {
        resultsDiv.innerHTML = '<p>没有活跃的Session</p>';
        return;
    }
    
    let html = '<div class="real-time-results">';
    
    ownerCurrentSession.questions.forEach((question, index) => {
        const questionStats = answers[question.id] || { totalResponses: 0, optionCounts: {} };
        
        html += `
            <div class="question-stats">
                <h4>问题 ${index + 1}: ${question.text}</h4>
                <p>总回答数: ${questionStats.totalResponses}</p>
                <div class="option-stats">
        `;
        
        question.options.forEach(option => {
            const count = questionStats.optionCounts[option] || 0;
            const percentage = questionStats.totalResponses > 0 ? 
                Math.round((count / questionStats.totalResponses) * 100) : 0;
            
            html += `
                <div class="option-stat">
                    <span class="option-text">${option}</span>
                    <span class="option-count">${count} (${percentage}%)</span>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
}

// 检查活跃Session
async function checkActiveSession() {
    const session = await window.firebaseService.getActiveSession();
    if (session) {
        ownerCurrentSession = session;
        showSessionManagement(session);
        startRealTimeMonitoring();
    }
}

// 加载Owner管理
function loadOwnerManagement() {
    if (!window.ownerService) return;
    
    const currentOwner = window.ownerService.getCurrentOwner();
    if (!currentOwner || currentOwner.role !== 'admin') {
        return; // Only admins can see owner management
    }
    
    document.getElementById('ownerManagement').style.display = 'block';
    displayOwnerStats();
    displayOwnerList();
}

// 显示Owner统计
function displayOwnerStats() {
    if (!window.ownerService) return;
    
    const stats = window.ownerService.getOwnerStats();
    const statsDiv = document.getElementById('ownerStats');
    
    statsDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">${stats.total}</div>
                <div class="stat-label">总Owner数</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.active}</div>
                <div class="stat-label">活跃Owner</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.admins}</div>
                <div class="stat-label">管理员</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${stats.teachers}</div>
                <div class="stat-label">教师</div>
            </div>
        </div>
    `;
}

// 显示Owner列表
function displayOwnerList() {
    if (!window.ownerService) return;
    
    try {
        const owners = window.ownerService.getAllOwners();
        const listDiv = document.getElementById('ownerList');
        
        let html = '';
        owners.forEach(owner => {
            const isCurrentUser = window.ownerService.getCurrentOwner()?.username === owner.username;
            html += `
                <div class="owner-item ${isCurrentUser ? 'current-user' : ''}">
                    <div class="owner-info">
                        <div class="owner-name">${owner.displayName}</div>
                        <div class="owner-details">
                            <span class="owner-username">@${owner.username}</span>
                            <span class="owner-role">${owner.role}</span>
                            <span class="owner-status ${owner.isActive ? 'active' : 'inactive'}">
                                ${owner.isActive ? '活跃' : '非活跃'}
                            </span>
                        </div>
                        <div class="owner-email">${owner.email}</div>
                    </div>
                    <div class="owner-actions">
                        ${!isCurrentUser && owner.isActive ? 
                            `<button onclick="deactivateOwner('${owner.username}')" class="deactivate-btn">停用</button>` : 
                            ''
                        }
                    </div>
                </div>
            `;
        });
        
        listDiv.innerHTML = html;
    } catch (error) {
        console.error('Error displaying owner list:', error);
    }
}

// 停用Owner
window.deactivateOwner = async function(username) {
    if (!window.ownerService) return;
    
    if (!confirm(`确定要停用Owner "${username}"吗？`)) {
        return;
    }
    
    try {
        await window.ownerService.deactivateOwner(username);
        alert(`Owner "${username}" 已停用`);
        displayOwnerStats();
        displayOwnerList();
    } catch (error) {
        console.error('Error deactivating owner:', error);
        alert(`停用失败: ${error.message}`);
    }
}; 
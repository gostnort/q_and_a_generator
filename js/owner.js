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
    //也是数据库内的名称
    if (!archiveFile || !quizName) {
        alert('请选择压缩文件并输入Quiz名称');
        return;
    }
    // 检查JS7z是否加载
    if (typeof JS7z === 'undefined') {
        progressDiv.innerHTML = '❌ JS7z库未加载，请刷新页面重试';
        return;
    }
    progressDiv.innerHTML = '正在解压...';
    try {
        // 读取文件为ArrayBuffer
        const arrayBuffer = await archiveFile.arrayBuffer();
        // 初始化JS7z
        const js7z = await JS7z();
        // 写入虚拟文件系统
        js7z.FS.writeFile('/archive', new Uint8Array(arrayBuffer));
        // 解压到/out目录
        await new Promise((resolve, reject) => {
            js7z.onExit = (code) => code === 0 ? resolve() : reject(new Error('解压失败'));
            js7z.callMain(['x', '/archive', '-o/out']);
        });
        // 读取/out目录下的文件
        const files = js7z.FS.readdir('/out');
        let quizCsv = null;
        let images = [];
        for (const file of files) {
            if (file === '.' || file === '..') continue;//忽略.和..
            if (file.toLowerCase() === 'quiz.csv') {//读取quiz.csv
                quizCsv = js7z.FS.readFile('/out/quiz.csv');
            } else if (//读取图片
                file.toLowerCase().endsWith('.png') ||
                file.toLowerCase().endsWith('.jpg') ||
                file.toLowerCase().endsWith('.jpeg')
            ) {
                const imgData = js7z.FS.readFile(`/out/${file}`);
                images.push({ name: file, data: imgData });
            }
            // 其他类型文件暂时忽略
        }
        if (!quizCsv) {
            throw new Error('quiz.csv未找到');
        }
        progressDiv.innerHTML = '正在上传到Firebase...';
        // 使用 quizUpload 工具解析并上传，传递进度回调
        await window.quizUpload.uploadQuizPackage({
            quizName,
            quizCsv,
            images,
            onProgress: (message) => {
                progressDiv.innerHTML = message;
            }
        });
        closeUploadModal();//关闭上传模态框
        loadQuizList();//加载Quiz列表
    } catch (error) {
        progressDiv.innerHTML = `❌ 上传失败: ${error.message}`;
        console.error('Upload error:', error);
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
    if (!confirm('确认删除此Quiz吗？\n\n⚠️ 警告：这将同时删除：\n• Quiz及其所有题目\n• 相关的所有Sessions\n• 所有用户的答题记录\n\n此操作不可撤销！')) {
        return;
    }
    
    try {
        console.log('开始删除Quiz:', quizId);
        
        // 显示删除进度
        const deleteButton = event.target;
        const originalText = deleteButton.textContent;
        deleteButton.textContent = '删除中...';
        deleteButton.disabled = true;
        
        // 调用级联删除
        await window.firebaseService.deleteQuiz(quizId);
        
        alert('Quiz删除成功！');
        loadQuizList(); // 刷新列表
        
    } catch (error) {
        console.error('删除Quiz失败:', error);
        alert(`删除失败: ${error.message}`);
        
        // 恢复按钮状态
        if (event.target) {
            event.target.textContent = originalText;
            event.target.disabled = false;
        }
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

// 结束Session（带选项）
window.endSession = async function() {
    if (!ownerCurrentSession) {
        alert('没有活跃的Session');
        return;
    }
    
    // 询问是否删除答题记录
    const deleteAnswers = confirm(
        '确认结束当前Session吗？\n\n' +
        '选择"确定"：结束Session并保留答题记录（用于后续分析）\n' +
        '选择"取消"：取消操作\n\n' +
        '如需完全清除答题记录，请在结束后使用"清理数据"功能。'
    );
    
    if (!deleteAnswers && !confirm('是否只结束Session但保留答题记录？')) {
        return; // 用户取消操作
    }
    
    try {
        const endButton = document.querySelector('button[onclick="endSession()"]');
        if (endButton) {
            endButton.textContent = '结束中...';
            endButton.disabled = true;
        }
        
        // 结束session，暂时保留答题记录
        await window.firebaseService.endSession(ownerCurrentSession.id, false);
        
        ownerCurrentSession = null;
        
        // 刷新界面
        displayOwnerStats();
        document.getElementById('sessionInfo').innerHTML = '<p>当前没有活跃的Session</p>';
        document.getElementById('realTimeResults').innerHTML = '';
        
        alert('Session已结束！答题记录已保留。');
        
    } catch (error) {
        console.error('结束Session失败:', error);
        alert(`结束Session失败: ${error.message}`);
        
        // 恢复按钮状态
        const endButton = document.querySelector('button[onclick="endSession()"]');
        if (endButton) {
            endButton.textContent = '结束Session';
            endButton.disabled = false;
        }
    }
};

// 清理Session数据（新增功能）
window.cleanupSessionData = async function(sessionId) {
    if (!sessionId) {
        alert('请提供Session ID');
        return;
    }
    
    if (!confirm('确认清理此Session的所有答题记录吗？\n\n⚠️ 此操作将永久删除用户答题数据，不可撤销！')) {
        return;
    }
    
    try {
        // 只删除answers，不影响session记录
        await window.firebaseService.endSession(sessionId, true);
        alert('Session答题记录清理完成！');
        
        // 如果是当前活跃session，刷新监控
        if (ownerCurrentSession && ownerCurrentSession.id === sessionId) {
            refreshMonitoring();
        }
        
    } catch (error) {
        console.error('清理Session数据失败:', error);
        alert(`清理失败: ${error.message}`);
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
    
    // 获取客户端统计信息
    const clientInfo = answers._meta || { totalClients: 0, clientList: [] };
    
    let html = '<div class="real-time-results">';
    
    // 显示客户端统计
    html += `
        <div class="client-stats">
            <h4>客户端参与统计</h4>
            <p>参与人数: ${clientInfo.totalClients} 人</p>
            <div class="client-list">
                <strong>参与客户端:</strong> ${clientInfo.clientList.join(', ') || '暂无'}
            </div>
        </div>
    `;
    
    ownerCurrentSession.questions.forEach((question, index) => {
        const questionStats = answers[question.id] || { totalResponses: 0, optionCounts: {}, clients: [] };
        
        html += `
            <div class="question-stats">
                <h4>问题 ${index + 1}: ${question.text}</h4>
                <p>总回答数: ${questionStats.totalResponses}</p>
                <p>回答人数: ${questionStats.clients ? questionStats.clients.length : 0} 人</p>
                <div class="option-stats">
        `;
        
        question.options.forEach(option => {
            // 适配新的选项结构 - option现在是{text, correct}对象
            const optionText = typeof option === 'string' ? option : option.text;
            const count = questionStats.optionCounts[optionText] || 0;
            const percentage = questionStats.totalResponses > 0 ? 
                Math.round((count / questionStats.totalResponses) * 100) : 0;
            
            // 如果是正确答案，显示标记
            const isCorrect = typeof option === 'object' && option.correct;
            const correctMark = isCorrect ? ' ✓' : '';
            
            html += `
                <div class="option-stat ${isCorrect ? 'correct-option' : ''}">
                    <span class="option-text">${optionText}${correctMark}</span>
                    <span class="option-count">${count} (${percentage}%)</span>
                </div>
            `;
        });
        
        html += '</div></div>';
    });
    
    html += '</div>';
    resultsDiv.innerHTML = html;
    
    // 更新owner统计区域的客户端数字
    updateOwnerStatsWithClients(clientInfo);
}

// 更新owner统计区域显示实时客户端数据
function updateOwnerStatsWithClients(clientInfo) {
    if (!ownerCurrentSession) return;
    
    const statsDiv = document.getElementById('ownerStats');
    statsDiv.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-number">${clientInfo.totalClients}</div>
                <div class="stat-label">参与客户端</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">${clientInfo.clientList.length}</div>
                <div class="stat-label">已答题人数</div>
            </div>
            <div class="stat-item">
                <div class="stat-number">1</div>
                <div class="stat-label">活跃Session</div>
            </div>
        </div>
    `;
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
    
    // 如果有活跃session，显示客户端统计而不是owner统计
    if (ownerCurrentSession) {
        const statsDiv = document.getElementById('ownerStats');
        statsDiv.innerHTML = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-number">0</div>
                    <div class="stat-label">参与客户端</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">0</div>
                    <div class="stat-label">已答题人数</div>
                </div>
                <div class="stat-item">
                    <div class="stat-number">1</div>
                    <div class="stat-label">活跃Session</div>
                </div>
            </div>
        `;
        return;
    }
    
    // 原有的owner统计逻辑（仅在没有活跃session时显示）
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
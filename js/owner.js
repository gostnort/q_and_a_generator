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
        
        // 初始化JS7z - 修复递归调用问题
        let js7z;
        try {
            js7z = await JS7z();
        } catch (initError) {
            throw new Error(`JS7z初始化失败: ${initError.message}`);
        }
        
        // 确保虚拟文件系统目录存在
        try {
            js7z.FS.mkdir('/out');
        } catch (e) {
            // 目录可能已存在，忽略错误
        }
        
        // 写入虚拟文件系统
        js7z.FS.writeFile('/archive', new Uint8Array(arrayBuffer));
        
        // 解压到/out目录 - 修复Promise处理
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('解压超时（30秒）'));
            }, 30000);
            
            js7z.onExit = (code) => {
                clearTimeout(timeout);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`解压失败，退出码: ${code}`));
                }
            };
            
            // 使用try-catch包装callMain调用
            try {
                js7z.callMain(['x', '/archive', '-o/out']);
            } catch (callError) {
                clearTimeout(timeout);
                reject(new Error(`解压调用失败: ${callError.message}`));
            }
        });
        
        // 读取/out目录下的文件
        let files;
        try {
            files = js7z.FS.readdir('/out');
        } catch (readError) {
            throw new Error(`读取解压目录失败: ${readError.message}`);
        }
        
        let quizCsv = null;
        let images = [];
        
        for (const file of files) {
            if (file === '.' || file === '..') continue;//忽略.和..
            
            try {
                if (file.toLowerCase() === 'quiz.csv') {//读取quiz.csv
                    quizCsv = js7z.FS.readFile('/out/quiz.csv');
                    console.log('CSV文件读取成功，大小:', quizCsv.length, '字节');
                } else if (//读取图片
                    file.toLowerCase().endsWith('.png') ||
                    file.toLowerCase().endsWith('.jpg') ||
                    file.toLowerCase().endsWith('.jpeg')
                ) {
                    const imgData = js7z.FS.readFile(`/out/${file}`);
                    images.push({ name: file, data: imgData });
                    console.log(`图片文件读取成功: ${file}, 大小:`, imgData.length, '字节');
                }
            } catch (fileError) {
                console.warn(`读取文件 ${file} 失败:`, fileError);
                // 继续处理其他文件
            }
        }
        
        if (!quizCsv) {
            throw new Error('quiz.csv未找到或读取失败');
        }
        progressDiv.innerHTML = '正在上传到Firebase...';
        console.log(`准备上传: Quiz名称=${quizName}, CSV大小=${quizCsv.length}字节, 图片数量=${images.length}`);
        
        // 使用 quizUpload 工具解析并上传，传递进度回调
        await window.quizUpload.uploadQuizPackage({
            quizName,
            quizCsv,
            images,
            onProgress: (message) => {
                progressDiv.innerHTML = message;
                console.log('上传进度:', message);
            }
        });
        
        progressDiv.innerHTML = '✅ 上传完成！';
        console.log('Quiz上传成功完成');
        
        // 延迟关闭模态框，让用户看到成功消息
        setTimeout(() => {
            closeUploadModal();//关闭上传模态框
            loadQuizList();//加载Quiz列表
        }, 1500);
        
    } catch (error) {
        progressDiv.innerHTML = `❌ 上传失败: ${error.message}`;
        console.error('Upload error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        // 如果是JS7z相关错误，提供更多帮助信息
        if (error.message.includes('JS7z') || error.message.includes('call stack')) {
            progressDiv.innerHTML += '<br><small>提示：如果问题持续，请刷新页面重试</small>';
        }
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

// 结束Session（完全删除）
window.endSession = async function() {
    if (!ownerCurrentSession) {
        alert('没有活跃的Session');
        return;
    }
    
    // 确认结束Session
    const confirmEnd = confirm(
        '确认结束当前Session吗？\n\n' +
        '⚠️ 注意：这将会：\n' +
        '• 完全删除Session记录\n' +
        '• 删除所有用户的答题记录\n' +
        '• 客户端将无法继续参与测试\n\n' +
        '此操作不可撤销！'
    );
    
    if (!confirmEnd) {
        return; // 用户取消操作
    }
    
    try {
        const endButton = document.querySelector('button[onclick="endSession()"]');
        if (endButton) {
            endButton.textContent = '结束中...';
            endButton.disabled = true;
        }
        
        // 停止实时监控
        stopRealTimeMonitoring();
        
        // 结束session并完全删除
        await window.firebaseService.endSession(ownerCurrentSession.id, true);
        
        ownerCurrentSession = null;
        
        // 刷新界面
        displayOwnerStats();
        document.getElementById('sessionManagement').style.display = 'none';
        document.getElementById('realTimeResults').innerHTML = '';
        
        alert('Session已结束并完全删除！');
        
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
async function startRealTimeMonitoring() {
    if (!ownerCurrentSession) return;
    
    // 立即获取一次数据
    refreshMonitoring();
    
    // 每10秒刷新一次
    refreshInterval = setInterval(refreshMonitoring, 10000);
    
    // 实时监听答案变化
    try {
        answersUnsubscribe = await window.firebaseService.onAnswersUpdate(ownerCurrentSession.id, (data) => {
            displayRealTimeResults(data);
        });
        console.log('✅ 实时监控启动成功');
    } catch (error) {
        console.error('启动实时监控时出错:', error);
        console.info('继续使用轮询方式监控 (每10秒刷新)');
        answersUnsubscribe = null;
    }
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
        console.error('刷新监控数据时出错:', error);
        document.getElementById('realTimeResults').innerHTML = 
            '<p style="color: red;">获取数据失败: ' + error.message + '</p>';
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
    
    // 检查是否有错误
    if (clientInfo.error) {
        resultsDiv.innerHTML = `
            <div class="real-time-results">
                <div style="color: red; padding: 15px; border: 1px solid #f5c6cb; background: #f8d7da; border-radius: 5px;">
                    <h4>❌ 监控出错</h4>
                    <p>${clientInfo.message}</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="real-time-results">';
    
    // 显示客户端统计
    html += `
        <div class="client-stats">
            <h4>📊 客户端参与统计</h4>
            <p>参与人数: <strong>${clientInfo.totalClients}</strong> 人</p>
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
                        <div class="owner-name">
                            ${owner.displayName}
                            <span class="owner-role">${owner.role.toUpperCase()}</span>
                            <span class="owner-status ${owner.isActive ? 'active' : 'inactive'}">
                                ${owner.isActive ? '活跃' : '非活跃'}
                            </span>
                        </div>
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

// Firebase DB测试函数
window.testFirebaseDB = async function() {
    const testResultsDiv = document.getElementById('firebaseTestResults');
    const testOutputDiv = document.getElementById('testOutput');
    
    // 显示测试结果区域
    testResultsDiv.style.display = 'block';
    testOutputDiv.innerHTML = '<div class="test-loading">🔄 Running Firebase DB Tests...</div>';
    
    const results = [];
    let passCount = 0;
    let warningCount = 0;
    let totalTests = 0;
    
    // 测试辅助函数 - 支持pass, fail, warning三种状态
    const addTestResult = (testName, status, message, details = '') => {
        totalTests++;
        
        let displayStatus, className;
        if (status === 'pass') {
            passCount++;
            displayStatus = '✅ PASS';
            className = 'test-pass';
        } else if (status === 'warning') {
            warningCount++;
            displayStatus = '⚠️ WARNING';
            className = 'test-warning';
        } else {
            displayStatus = '❌ FAIL';
            className = 'test-fail';
        }
        
        results.push(`
            <div class="test-result ${className}">
                <strong>${displayStatus} - ${testName}</strong>
                <p>${message}</p>
                ${details ? `<details><summary>Details</summary><pre>${details}</pre></details>` : ''}
            </div>
        `);
    };
    
    // Simple Firebase connectivity test
    try {
        // Test 1: Firebase Connection
        if (window.db && window.storage && window.firebaseApp) {
            addTestResult('Firebase Connection', 'pass', 'Firebase components are properly initialized');
        } else {
            addTestResult('Firebase Connection', 'fail', 'Firebase components not properly initialized');
        }
        
        // Test 2: Firebase Service
        if (window.firebaseService && typeof window.firebaseService.getAllQuizzes === 'function') {
            addTestResult('Firebase Service', 'pass', 'Firebase service methods are available');
        } else {
            addTestResult('Firebase Service', 'fail', 'Firebase service not properly loaded');
        }
        
        // Test 3: Get Quizzes
        const quizzes = await window.firebaseService.getAllQuizzes();
        addTestResult('Get All Quizzes', 'pass', `Successfully retrieved ${quizzes.length} quizzes`);
        
    } catch (error) {
        addTestResult('Overall Test', 'fail', 'Test execution failed', error.message);
    }
    
    // Display results
    setTimeout(() => {
        const summary = `<div class="test-summary">Tests: ${passCount}/${totalTests} passed${warningCount > 0 ? `, ${warningCount} warnings` : ''}</div>`;
        testOutputDiv.innerHTML = summary + results.join('');
    }, 100);
};

// 数据库维护功能

// 加载所有Sessions列表
window.loadSessionList = async function() {
    try {
        const { collection, getDocs, orderBy, query } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const db = window.db;
        
        const sessionsQuery = query(collection(db, 'sessions'), orderBy('startTime', 'desc'));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        
        const sessionsList = document.getElementById('sessionsList');
        
        if (sessionsSnapshot.empty) {
            sessionsList.innerHTML = '<p>没有找到任何Sessions</p>';
            return;
        }
        
        let html = '<div class="sessions-list-container">';
        html += `<p><strong>找到 ${sessionsSnapshot.docs.length} 个Sessions:</strong></p>`;
        
        for (const doc of sessionsSnapshot.docs) {
            const session = doc.data();
            const sessionId = doc.id;
            
            // 获取该session的用户答案数量
            const { collectionGroup, where, getDocs: getAnswerDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            const answersQuery = query(collectionGroup(db, 'answers'), where('sessionId', '==', sessionId));
            let answerCount = 0;
            
            try {
                const answersSnapshot = await getAnswerDocs(answersQuery);
                answerCount = answersSnapshot.docs.length;
            } catch (error) {
                console.log('Error counting answers for session:', sessionId, error);
            }
            
            html += `
                <div class="session-item" style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 8px; background: white;">
                    <div class="session-info">
                        <h4>${session.quizName} (${session.isActive ? '活跃' : '已结束'})</h4>
                        <p><strong>Session ID:</strong> ${sessionId}</p>
                        <p><strong>Quiz ID:</strong> ${session.quizId}</p>
                        <p><strong>开始时间:</strong> ${session.startTime?.toDate?.()?.toLocaleString() || '未知'}</p>
                        <p><strong>用户答案数量:</strong> ${answerCount}</p>
                        <p><strong>问题数量:</strong> ${session.questions?.length || 0}</p>
                    </div>
                    <div class="session-actions" style="margin-top: 10px;">
                        <button onclick="deleteSession('${sessionId}')" class="delete-btn" style="background-color: #dc3545; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                            🗑️ 删除Session (${answerCount} 答案)
                        </button>
                        ${session.isActive ? 
                            `<button onclick="endSession()" class="end-session-btn" style="background-color: #ffc107; color: #000; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;">
                                结束Session
                            </button>` : ''
                        }
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        sessionsList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading sessions list:', error);
        document.getElementById('sessionsList').innerHTML = `<p style="color: red;">加载Sessions失败: ${error.message}</p>`;
    }
};

// 删除Session及其相关的用户答案
window.deleteSession = async function(sessionId) {
    if (!confirm(`确定要删除这个Session吗？\n\n这将同时删除所有相关的用户答案，此操作不可撤销！`)) {
        return;
    }
    
    try {
        const { doc, deleteDoc, collection, collectionGroup, query, where, getDocs, writeBatch } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const db = window.db;
        
        console.log('开始删除Session:', sessionId);
        
        // 1. 删除所有相关的用户答案
        const answersQuery = query(collectionGroup(db, 'answers'), where('sessionId', '==', sessionId));
        const answersSnapshot = await getDocs(answersQuery);
        
        console.log(`找到 ${answersSnapshot.docs.length} 个相关答案需要删除`);
        
        // 使用批量写入删除所有答案
        if (!answersSnapshot.empty) {
            const batch = writeBatch(db);
            answersSnapshot.docs.forEach((answerDoc) => {
                batch.delete(answerDoc.ref);
            });
            await batch.commit();
            console.log('用户答案删除完成');
        }
        
        // 2. 删除Session文档
        await deleteDoc(doc(db, 'sessions', sessionId));
        console.log('Session删除完成');
        
        alert(`Session删除成功！\n删除了 ${answersSnapshot.docs.length} 个用户答案`);
        
        // 刷新Sessions列表
        loadSessionList();
        
        // 如果删除的是当前活跃Session，清空实时监控
        if (ownerCurrentSession && ownerCurrentSession.id === sessionId) {
            ownerCurrentSession = null;
            document.getElementById('activeSessionInfo').style.display = 'none';
            document.getElementById('realTimeResults').innerHTML = '<p>没有活跃的Session</p>';
        }
        
    } catch (error) {
        console.error('删除Session失败:', error);
        alert(`删除Session失败: ${error.message}`);
    }
};

// 清理孤立的用户答案（没有对应Session的答案）
window.cleanupOrphanedAnswers = async function() {
    if (!confirm('确定要清理孤立的用户答案吗？\n\n这会删除所有没有对应Session的答案，此操作不可撤销！')) {
        return;
    }
    
    try {
        const { collection, collectionGroup, getDocs, doc, deleteDoc, writeBatch } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        const db = window.db;
        
        console.log('开始清理孤立答案...');
        
        // 1. 获取所有Sessions的ID
        const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
        const validSessionIds = new Set(sessionsSnapshot.docs.map(doc => doc.id));
        console.log('有效Session数量:', validSessionIds.size);
        
        // 2. 获取所有用户答案
        const allAnswersSnapshot = await getDocs(collectionGroup(db, 'answers'));
        console.log('总答案数量:', allAnswersSnapshot.docs.length);
        
        // 3. 找到孤立的答案
        const orphanedAnswers = [];
        allAnswersSnapshot.docs.forEach(answerDoc => {
            const answerData = answerDoc.data();
            if (!validSessionIds.has(answerData.sessionId)) {
                orphanedAnswers.push(answerDoc);
            }
        });
        
        console.log('孤立答案数量:', orphanedAnswers.length);
        
        if (orphanedAnswers.length === 0) {
            alert('没有找到孤立的答案，数据库很干净！');
            return;
        }
        
        // 4. 批量删除孤立答案
        const batchSize = 500; // Firestore批量写入限制
        for (let i = 0; i < orphanedAnswers.length; i += batchSize) {
            const batch = writeBatch(db);
            const batchAnswers = orphanedAnswers.slice(i, i + batchSize);
            
            batchAnswers.forEach(answerDoc => {
                batch.delete(answerDoc.ref);
            });
            
            await batch.commit();
            console.log(`删除了第 ${i + 1} 到 ${Math.min(i + batchSize, orphanedAnswers.length)} 个孤立答案`);
        }
        
        alert(`清理完成！删除了 ${orphanedAnswers.length} 个孤立的用户答案`);
        
        // 刷新Sessions列表
        loadSessionList();
        
    } catch (error) {
        console.error('清理孤立答案失败:', error);
        alert(`清理失败: ${error.message}`);
    }
};
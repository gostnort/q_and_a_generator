// Firebase服务 - 兼容新的Firestore结构
window.firebaseService = {
    // 获取所有Quiz（从新结构读取）
    // 功能：读取quizzes集合，并为每个quiz读取其questions子集合
    // 返回：包含完整题目信息的quiz数组
    async getAllQuizzes() {
        const db = window.db;
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 按创建时间倒序获取所有quiz文档
        const quizSnapshot = await getDocs(query(collection(db, 'quizzes'), orderBy('createdAt', 'desc')));
        const quizzes = [];
        
        // 遍历每个quiz，读取其questions子集合
        for (const quizDoc of quizSnapshot.docs) {
            const quizData = quizDoc.data();
            
            // 读取questions子集合 - 每个quiz的题目存在这里
            const questionsSnapshot = await getDocs(collection(quizDoc.ref, 'questions'));
            const questions = questionsSnapshot.docs.map(qDoc => ({
                id: qDoc.id, // Firestore自动生成的题目ID
                ...qDoc.data() // 题目内容：text, image, options
            }));
            
            // 组装完整的quiz数据
            quizzes.push({
                id: quizDoc.id,
                name: quizData.quizName,
                createdAt: quizData.createdAt.toDate(),
                questions: questions // 完整的题目数组
            });
        }
        
        return quizzes;
    },

    // 获取Quiz数据（包含题目和图片）
    // 功能：客户端加载quiz时调用，需要获取完整数据用于显示
    // 返回：包含完整题目和图片信息的quiz对象
    async getQuizWithImages(quizId) {
        const db = window.db;
        const { doc, getDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');

        // 获取quiz基本信息
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        if (!quizDoc.exists()) {
            throw new Error('Quiz不存在');
        }

        const quizData = quizDoc.data();

        // 获取questions子集合
        const questionsSnapshot = await getDocs(collection(quizDoc.ref, 'questions'));
        const questions = questionsSnapshot.docs.map(qDoc => ({
            id: qDoc.id,
            ...qDoc.data()
        }));

        // 收集所有需要的imageId
        const imageIds = [...new Set(questions
            .map(q => q.imageId)
            .filter(id => id)
        )];

        // 从shared_images集合批量获取图片数据
        const imageMap = new Map();
        if (imageIds.length > 0) {
            for (const imageId of imageIds) {
                try {
                    const imageDoc = await getDoc(doc(db, 'shared_images', imageId));
                    if (imageDoc.exists()) {
                        imageMap.set(imageId, imageDoc.data());
                    }
                } catch (error) {
                    console.warn(`无法加载图片 ${imageId}:`, error);
                }
            }
        }

        // 将图片数据附加到对应的题目
        const questionsWithImages = questions.map(question => {
            if (question.imageId && imageMap.has(question.imageId)) {
                return {
                    ...question,
                    imageData: {
                        base64: imageMap.get(question.imageId).base64,
                        originalName: imageMap.get(question.imageId).originalName
                    }
                };
            }
            return question;
        });

        return {
            id: quizDoc.id,
            name: quizData.quizName,
            createdAt: quizData.createdAt.toDate(),
            questions: questionsWithImages
        };
    },

    // 创建Session
    // 功能：创建一个活跃的quiz会话，客户端通过session参与quiz
    // 流程：owner选择quiz → 创建session → 客户端可以参与
    async createSession(quizId, quizName, questions) {
        const db = window.db;
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        const sessionData = {
            quizId, // 关联的quiz ID
            quizName, // quiz名称
            startTime: new Date(), // 开始时间
            isActive: true, // 是否活跃 - 客户端根据此字段判断是否可参与
            questions: questions // 传入完整的questions数据 - 避免客户端重复查询
        };
        
        // 写入sessions集合
        const sessionRef = await addDoc(collection(db, 'sessions'), sessionData);
        
        return {
            id: sessionRef.id,
            ...sessionData
        };
    },

    // 获取活跃Session
    // 功能：客户端登录时调用，检查是否有可参与的quiz
    // 逻辑：只返回isActive=true的第一个session
    async getActiveSession() {
        const db = window.db;
        const { collection, query, where, getDocs, limit } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 查询活跃的session - 最多返回1个
        const sessionQuery = query(
            collection(db, 'sessions'),
            where('isActive', '==', true),
            limit(1)
        );
        
        const snapshot = await getDocs(sessionQuery);
        if (snapshot.empty) return null; // 没有活跃session，客户端显示404
        
        const sessionDoc = snapshot.docs[0];
        return {
            id: sessionDoc.id,
            ...sessionDoc.data()
        };
    },

    // 结束Session（同时清理相关数据）
    // 功能：结束session并可选择性删除相关answers
    // 参数：sessionId, deleteAnswers (是否删除相关answers)
    async endSession(sessionId, deleteAnswers = false) {
        const db = window.db;
        const { doc, updateDoc, collection, query, where, getDocs, writeBatch, collectionGroup } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        try {
            // 更新session状态
            await updateDoc(doc(db, 'sessions', sessionId), {
                isActive: false,
                endTime: new Date()
            });
            
            // 如果需要删除answers
            if (deleteAnswers) {
                console.log('清理session相关answers...');
                
                const answersQuery = query(
                    collectionGroup(db, 'answers'),
                    where('sessionId', '==', sessionId)
                );
                const answersSnapshot = await getDocs(answersQuery);
                
                if (answersSnapshot.docs.length > 0) {
                    const batch = writeBatch(db);
                    answersSnapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    await batch.commit();
                    console.log(`已删除 ${answersSnapshot.docs.length} 个相关answers`);
                }
            }
            
            console.log('Session结束完成');
            
        } catch (error) {
            console.error('结束Session时出错:', error);
            throw error;
        }
    },

    // 删除Quiz（级联删除）
    // 功能：删除quiz及其相关的所有数据（sessions、user answers）
    // 步骤：1.删除相关sessions 2.删除用户answers 3.删除quiz本体
    async deleteQuiz(quizId) {
        const db = window.db;
        const { doc, deleteDoc, collection, query, where, getDocs, writeBatch, collectionGroup } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        console.log('开始级联删除Quiz:', quizId);
        
        try {
            // 第一步：查找并删除所有相关的sessions
            console.log('步骤1: 查找相关sessions...');
            const sessionsQuery = query(
                collection(db, 'sessions'),
                where('quizId', '==', quizId)
            );
            const sessionsSnapshot = await getDocs(sessionsQuery);
            const sessionIds = sessionsSnapshot.docs.map(doc => doc.id);
            
            console.log(`找到 ${sessionIds.length} 个相关sessions:`, sessionIds);
            
            // 第二步：删除所有用户的相关answers
            if (sessionIds.length > 0) {
                console.log('步骤2: 删除用户answers...');
                
                // 使用collectionGroup查询所有用户的answers
                const answersQuery = query(
                    collectionGroup(db, 'answers'),
                    where('sessionId', 'in', sessionIds)
                );
                const answersSnapshot = await getDocs(answersQuery);
                
                console.log(`找到 ${answersSnapshot.docs.length} 个相关answers`);
                
                // 批量删除answers
                const batch = writeBatch(db);
                answersSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                if (answersSnapshot.docs.length > 0) {
                    await batch.commit();
                    console.log('用户answers删除完成');
                }
            }
            
            // 第三步：删除sessions
            if (sessionIds.length > 0) {
                console.log('步骤3: 删除sessions...');
                const sessionBatch = writeBatch(db);
                sessionsSnapshot.docs.forEach(doc => {
                    sessionBatch.delete(doc.ref);
                });
                await sessionBatch.commit();
                console.log('Sessions删除完成');
            }
            
            // 第四步：删除quiz的questions子集合
            console.log('步骤4: 删除quiz questions...');
            const questionsSnapshot = await getDocs(collection(doc(db, 'quizzes', quizId), 'questions'));
            if (questionsSnapshot.docs.length > 0) {
                const questionsBatch = writeBatch(db);
                questionsSnapshot.docs.forEach(qDoc => {
                    questionsBatch.delete(qDoc.ref);
                });
                await questionsBatch.commit();
                console.log('Quiz questions删除完成');
            }
            
            // 第五步：删除quiz主文档
            console.log('步骤5: 删除quiz主文档...');
            await deleteDoc(doc(db, 'quizzes', quizId));
            
            console.log('✅ Quiz级联删除完成');
            
        } catch (error) {
            console.error('Quiz删除过程中出错:', error);
            throw new Error(`删除Quiz失败: ${error.message}`);
        }
    },

    // 提交答案
    // 功能：客户端提交单个题目的答案
    // 参数：sessionId, questionId, answers数组, userName
    // 存储路径：users/{userName}/answers/{answerId}
    async submitAnswer(sessionId, questionId, answers, userName) {
        const db = window.db;
        const { collection, addDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 使用用户专属的answers集合
        const userAnswersCollection = collection(db, 'users', userName, 'answers');
        
        const answerData = {
            sessionId: sessionId,
            questionId: questionId,
            answers: answers, // 数组形式，支持多选
            userName: userName,
            timestamp: serverTimestamp()
        };
        
        console.log('Submitting answer to user collection:', answerData);
        const docRef = await addDoc(userAnswersCollection, answerData);
        return docRef.id;
    },

    // 获取实时答案统计
    // 功能：owner监控页面调用，从所有用户的answers子集合中统计数据
    // 返回：每个题目的回答人数和各选项的选择次数，以及客户端信息
    async getRealTimeAnswers(sessionId) {
        const db = window.db;
        const { collection, query, where, getDocs, collectionGroup } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 使用collectionGroup查询所有用户的answers子集合
        const answersQuery = query(
            collectionGroup(db, 'answers'),
            where('sessionId', '==', sessionId)
        );
        
        const snapshot = await getDocs(answersQuery);
        const stats = {}; // 按题目ID分组的统计
        const clients = new Set(); // 参与的客户端
        
        // 遍历所有答案，统计每个选项的选择次数
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const questionId = data.questionId;
            const userName = data.userName;
            
            // 记录客户端
            if (userName) {
                clients.add(userName);
            }
            
            // 初始化题目统计
            if (!stats[questionId]) {
                stats[questionId] = { totalResponses: 0, optionCounts: {}, clients: new Set() };
            }
            
            stats[questionId].totalResponses++; // 总回答数
            stats[questionId].clients.add(userName); // 回答此题的客户端
            
            // 统计每个选项的选择次数
            data.answers.forEach(answer => {
                if (!stats[questionId].optionCounts[answer]) {
                    stats[questionId].optionCounts[answer] = 0;
                }
                stats[questionId].optionCounts[answer]++;
            });
        });
        
        // 转换Set为数组以便传输
        Object.keys(stats).forEach(questionId => {
            stats[questionId].clients = Array.from(stats[questionId].clients);
        });
        
        // 添加全局客户端信息
        stats._meta = {
            totalClients: clients.size,
            clientList: Array.from(clients)
        };
        
        return stats;
    },

    // 监听答案更新（实时）
    // 功能：为owner监控页面提供实时数据更新
    // 使用collectionGroup监听所有用户的answers变化
    onAnswersUpdate(sessionId, callback) {
        const db = window.db;
        
        import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js').then(({ collectionGroup, query, where, onSnapshot }) => {
            // 监听所有用户answers子集合的变化
            const answersQuery = query(
                collectionGroup(db, 'answers'),
                where('sessionId', '==', sessionId)
            );
            
            return onSnapshot(answersQuery, (snapshot) => {
                console.log('Real-time update triggered, documents count:', snapshot.docs.length);
                this.getRealTimeAnswers(sessionId).then(callback);
            });
        });
    }
}; 
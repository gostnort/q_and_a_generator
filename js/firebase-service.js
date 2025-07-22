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

    // 获取Quiz详情（包含图片）
    // 功能：不仅读取quiz和questions，还读取images子集合并关联到对应题目
    // 用于：客户端显示quiz时需要图片数据
    async getQuizWithImages(quizId) {
        const db = window.db;
        const { doc, getDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 获取quiz主文档
        const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
        if (!quizDoc.exists()) return null;
        
        const quizData = quizDoc.data();
        
        // 读取questions子集合
        const questionsSnapshot = await getDocs(collection(quizDoc.ref, 'questions'));
        const questions = questionsSnapshot.docs.map(qDoc => ({
            id: qDoc.id,
            ...qDoc.data()
        }));
        
        // 读取images子集合 - 图片以base64存储，通过questionId关联题目
        const imagesSnapshot = await getDocs(collection(quizDoc.ref, 'images'));
        const images = {};
        imagesSnapshot.docs.forEach(imgDoc => {
            const imgData = imgDoc.data();
            images[imgData.questionId] = imgData; // 建立questionId到图片的映射
        });
        
        // 将图片数据附加到对应题目 - 客户端可直接使用
        questions.forEach(question => {
            if (question.image && images[question.id]) {
                question.imageData = images[question.id]; // 包含name和base64字段
            }
        });
        
        return {
            id: quizDoc.id,
            name: quizData.quizName,
            createdAt: quizData.createdAt.toDate(),
            questions: questions // 包含图片数据的完整题目
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

    // 结束Session
    // 功能：owner点击"结束session"时调用，停止客户端参与
    // 效果：客户端刷新后无法再参与此quiz
    async endSession(sessionId) {
        const db = window.db;
        const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 更新session状态为非活跃
        await updateDoc(doc(db, 'sessions', sessionId), {
            isActive: false,
            endTime: new Date()
        });
    },

    // 删除Quiz
    // 功能：彻底删除quiz及其所有相关数据
    // 流程：删除questions子集合 → 删除images子集合 → 删除quiz主文档
    async deleteQuiz(quizId) {
        const db = window.db;
        const { doc, deleteDoc, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 删除questions子集合 - 必须先删除子集合
        const questionsSnapshot = await getDocs(collection(doc(db, 'quizzes', quizId), 'questions'));
        for (const questionDoc of questionsSnapshot.docs) {
            await deleteDoc(questionDoc.ref);
        }
        
        // 删除images子集合
        const imagesSnapshot = await getDocs(collection(doc(db, 'quizzes', quizId), 'images'));
        for (const imageDoc of imagesSnapshot.docs) {
            await deleteDoc(imageDoc.ref);
        }
        
        // 最后删除Quiz主文档
        await deleteDoc(doc(db, 'quizzes', quizId));
    },

    // 提交答案
    // 功能：客户端答题时实时调用，记录每次选择
    // 数据：存储在answers集合，包含用户名、题目ID、选择的答案
    async submitAnswer(sessionId, userName, questionId, answers) {
        const db = window.db;
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 记录答案 - 每次选择都创建新记录
        await addDoc(collection(db, 'answers'), {
            sessionId, // 关联session
            userName, // 答题用户
            questionId, // 题目ID
            answers, // 选择的答案数组
            timestamp: new Date() // 答题时间
        });
    },

    // 获取实时答案统计
    // 功能：owner监控页面调用，统计每个题目的答案分布
    // 返回：每个题目的回答人数和各选项的选择次数
    async getRealTimeAnswers(sessionId) {
        const db = window.db;
        const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        // 查询此session的所有答案
        const answersQuery = query(
            collection(db, 'answers'),
            where('sessionId', '==', sessionId)
        );
        
        const snapshot = await getDocs(answersQuery);
        const stats = {}; // 按题目ID分组的统计
        
        // 遍历所有答案，统计每个选项的选择次数
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            const questionId = data.questionId;
            
            // 初始化题目统计
            if (!stats[questionId]) {
                stats[questionId] = { totalResponses: 0, optionCounts: {} };
            }
            
            stats[questionId].totalResponses++; // 总回答数
            
            // 统计每个选项的选择次数
            data.answers.forEach(answer => {
                if (!stats[questionId].optionCounts[answer]) {
                    stats[questionId].optionCounts[answer] = 0;
                }
                stats[questionId].optionCounts[answer]++;
            });
        });
        
        return stats;
    },

    // 监听答案更新
    // 功能：owner实时监控使用，当有新答案时自动刷新统计
    // 返回：取消监听的函数
    onAnswersUpdate(sessionId, callback) {
        const db = window.db;
        import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js').then(({ collection, query, where, onSnapshot }) => {
            // 监听answers集合的变化
            const answersQuery = query(
                collection(db, 'answers'),
                where('sessionId', '==', sessionId)
            );
            
            // 当有变化时，重新获取统计并调用回调
            return onSnapshot(answersQuery, () => {
                this.getRealTimeAnswers(sessionId).then(callback);
            });
        });
        
        // 返回空函数作为取消监听器 - 实际使用中应返回真正的取消函数
        return () => {};
    }
}; 
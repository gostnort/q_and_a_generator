// Firebase服务类
class FirebaseService {
    constructor() {
        this.db = window.db;
        this.storage = window.storage;
        this.firestore = window.firestore;
        this.storageFunctions = window.storageFunctions;
    }

    // 上传Quiz包
    async uploadQuizPackage(zipFile, quizName) {
        const JSZip = window.JSZip;
        if (!JSZip) {
            throw new Error('JSZip library not loaded');
        }

        const zip = new JSZip();
        const zipContent = await zip.loadAsync(zipFile);
        
        // 提取CSV文件
        const csvFile = zipContent.file('quiz.csv');
        if (!csvFile) {
            throw new Error('ZIP包中未找到quiz.csv文件');
        }
        
        const csvText = await csvFile.async('text');
        
        // 上传图片并获取URL
        const imageUrls = {};
        for (const [filename, file] of Object.entries(zipContent.files)) {
            if (filename.startsWith('images/') && !file.dir) {
                const blob = await file.async('blob');
                const imageUrl = await this.uploadImage(blob, quizName, filename);
                imageUrls[filename] = imageUrl;
            }
        }
        
        // 转换CSV为Quiz数据
        const quizData = this.convertCSVToQuiz(csvText, quizName, imageUrls);
        
        // 保存到Firestore
        const docRef = await this.firestore.addDoc(
            this.firestore.collection(this.db, 'quizzes'), 
            quizData
        );
        
        return { ...quizData, id: docRef.id };
    }

    // 上传图片
    async uploadImage(blob, quizName, filename) {
        const storageRef = this.storageFunctions.ref(this.storage, `quizzes/${quizName}/${filename}`);
        const snapshot = await this.storageFunctions.uploadBytes(storageRef, blob);
        const downloadURL = await this.storageFunctions.getDownloadURL(snapshot.ref);
        return downloadURL;
    }

    // 转换CSV为Quiz数据
    convertCSVToQuiz(csvText, quizName, imageUrls) {
        const lines = csvText.split('\n');
        const questions = [];
        
        const numColumns = Math.max(...lines.map(line => line.split(',').length));
        
        for (let col = 0; col < numColumns; col++) {
            const questionText = lines[0].split(',')[col];
            const imageName = lines[1].split(',')[col];
            
            if (!questionText || questionText.trim() === '') continue;
            
            const options = [];
            for (let row = 2; row < lines.length; row++) {
                const option = lines[row].split(',')[col];
                if (option && option.trim() !== '') {
                    options.push(option.trim());
                }
            }
            
            // 处理图片URL
            let imageUrl = null;
            if (imageName && imageName.trim() !== '') {
                const imagePath = `images/${imageName.trim()}`;
                imageUrl = imageUrls[imagePath] || null;
            }
            
            questions.push({
                text: questionText.trim(),
                image: imageUrl,
                options: options,
                id: col
            });
        }
        
        return {
            name: quizName,
            questions: questions,
            createdAt: new Date().toISOString(),
            version: "1.0"
        };
    }

    // 获取所有Quiz
    async getAllQuizzes() {
        const q = this.firestore.query(
            this.firestore.collection(this.db, 'quizzes'),
            this.firestore.orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await this.firestore.getDocs(q);
        const quizzes = [];
        
        querySnapshot.forEach((doc) => {
            quizzes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return quizzes;
    }

    // 删除Quiz
    async deleteQuiz(quizId) {
        await this.firestore.deleteDoc(this.firestore.doc(this.db, 'quizzes', quizId));
    }

    // 创建Session
    async createSession(quizId, quizName, questions) {
        const sessionData = {
            quizId: quizId,
            quizName: quizName,
            questions: questions,
            startTime: new Date().toISOString(),
            isActive: true,
            lastUpdated: Date.now()
        };

        const docRef = await this.firestore.addDoc(
            this.firestore.collection(this.db, 'sessions'), 
            sessionData
        );

        return { ...sessionData, id: docRef.id };
    }

    // 获取活跃Session
    async getActiveSession() {
        const q = this.firestore.query(
            this.firestore.collection(this.db, 'sessions'),
            this.firestore.where('isActive', '==', true),
            this.firestore.orderBy('lastUpdated', 'desc')
        );

        const querySnapshot = await this.firestore.getDocs(q);
        
        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { ...doc.data(), id: doc.id };
        }
        
        return null;
    }

    // 结束Session
    async endSession(sessionId) {
        const sessionRef = this.firestore.doc(this.db, 'sessions', sessionId);
        await this.firestore.updateDoc(sessionRef, {
            isActive: false,
            lastUpdated: Date.now()
        });
    }

    // 提交答案（实时选择）
    async submitAnswer(sessionId, clientName, questionId, selectedOptions) {
        const answerData = {
            sessionId: sessionId,
            clientName: clientName,
            questionId: questionId,
            selectedOptions: selectedOptions,
            timestamp: new Date().toISOString()
        };

        await this.firestore.addDoc(
            this.firestore.collection(this.db, 'answers'), 
            answerData
        );
    }

    // 获取实时答案统计
    async getRealTimeAnswers(sessionId) {
        const q = this.firestore.query(
            this.firestore.collection(this.db, 'answers'),
            this.firestore.where('sessionId', '==', sessionId)
        );

        const querySnapshot = await this.firestore.getDocs(q);
        const answers = [];
        
        querySnapshot.forEach((doc) => {
            answers.push(doc.data());
        });
        
        return this.aggregateAnswers(answers);
    }

    // 聚合答案统计
    aggregateAnswers(answers) {
        const questionStats = {};
        
        answers.forEach(answer => {
            const { questionId, selectedOptions } = answer;
            
            if (!questionStats[questionId]) {
                questionStats[questionId] = {
                    totalResponses: 0,
                    optionCounts: {}
                };
            }
            
            questionStats[questionId].totalResponses++;
            
            selectedOptions.forEach(option => {
                if (!questionStats[questionId].optionCounts[option]) {
                    questionStats[questionId].optionCounts[option] = 0;
                }
                questionStats[questionId].optionCounts[option]++;
            });
        });
        
        return questionStats;
    }

    // 实时监听答案变化
    onAnswersUpdate(sessionId, callback) {
        const q = this.firestore.query(
            this.firestore.collection(this.db, 'answers'),
            this.firestore.where('sessionId', '==', sessionId)
        );

        return this.firestore.onSnapshot(q, (snapshot) => {
            const answers = [];
            snapshot.forEach((doc) => {
                answers.push(doc.data());
            });
            
            const aggregatedData = this.aggregateAnswers(answers);
            callback(aggregatedData);
        });
    }
}

// 创建全局实例
window.firebaseService = new FirebaseService(); 
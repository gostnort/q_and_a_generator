// Firebase配置 - 开发模式
console.log('Firebase config loading...');

// 检查是否在开发环境
const isDevelopment = window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1' ||
                     window.location.hostname.includes('netlify.app');

if (isDevelopment) {
    console.log('Running in development mode - using mock Firebase service');
    
    // 创建模拟的Firebase服务
    window.firebaseService = {
        getActiveSession: async () => {
            console.log('Mock: getActiveSession called');
            return null; // 没有活跃session
        },
        getAllQuizzes: async () => {
            console.log('Mock: getAllQuizzes called');
            return []; // 空列表
        },
        createSession: async () => {
            console.log('Mock: createSession called');
            return { id: 'mock-session', quizName: 'Mock Quiz' };
        },
        submitAnswer: async () => {
            console.log('Mock: submitAnswer called');
        },
        uploadQuizPackage: async () => {
            console.log('Mock: uploadQuizPackage called');
            throw new Error('Firebase not configured - please set up Firebase first');
        },
        deleteQuiz: async () => {
            console.log('Mock: deleteQuiz called');
        },
        endSession: async () => {
            console.log('Mock: endSession called');
        },
        getRealTimeAnswers: async () => {
            console.log('Mock: getRealTimeAnswers called');
            return {};
        },
        onAnswersUpdate: () => {
            console.log('Mock: onAnswersUpdate called');
            return () => {}; // 返回空的取消函数
        }
    };
    
    console.log('Mock Firebase service initialized');
} else {
    // 生产环境 - 加载真实的Firebase
    console.log('Loading real Firebase...');
    
    // 这里可以添加真实的Firebase配置
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    };
    
    // 动态加载Firebase模块
    Promise.all([
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js'),
        import('https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js')
    ]).then(([firebaseApp, firestore, storage]) => {
        const { initializeApp } = firebaseApp;
        const { getFirestore, collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, deleteDoc } = firestore;
        const { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } = storage;
        
        // 初始化应用
        const app = initializeApp(firebaseConfig);
        const db = getFirestore(app);
        const storageInstance = getStorage(app);
        
        // 导出数据库实例
        window.db = db;
        window.storage = storageInstance;
        window.firestore = { collection, addDoc, getDocs, doc, updateDoc, onSnapshot, query, where, orderBy, deleteDoc };
        window.storageFunctions = { ref, uploadBytes, getDownloadURL, deleteObject };
        
        console.log('Real Firebase initialized');
    }).catch(error => {
        console.error('Failed to load Firebase:', error);
        // 回退到模拟服务
        window.firebaseService = {
            getActiveSession: async () => null,
            getAllQuizzes: async () => [],
            createSession: async () => ({ id: 'mock-session', quizName: 'Mock Quiz' }),
            submitAnswer: async () => {},
            uploadQuizPackage: async () => { throw new Error('Firebase not available'); },
            deleteQuiz: async () => {},
            endSession: async () => {},
            getRealTimeAnswers: async () => ({}),
            onAnswersUpdate: () => () => {}
        };
    });
} 
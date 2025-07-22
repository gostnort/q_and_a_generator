// Quiz上传与解析相关工具
window.quizUpload = {
    // parseQuizCSV - 内部函数：解析CSV为题目结构
    parseQuizCSV(csvBuffer) {
        const csvText = typeof csvBuffer === 'string'
            ? csvBuffer
            : new TextDecoder('utf-8').decode(csvBuffer);
        const lines = csvText.trim().split(/\r?\n/);
        if (lines.length < 3) throw new Error('CSV格式错误，至少需要3行');
        const cells = lines.map(line => line.split(','));
        const numQuestions = cells[0].length;
        const questions = [];
        for (let col = 0; col < numQuestions; col++) {
            const text = cells[0][col]?.trim() || '';
            const image = cells[1][col]?.trim() || '';
            const options = [];
            for (let row = 2; row < cells.length; row++) {
                let opt = cells[row][col]?.trim();
                if (!opt) continue;
                let correct = false;
                if (opt.startsWith('`')) {
                    correct = true;
                    opt = opt.slice(1);
                }
                options.push({ text: opt, correct });
            }
            questions.push({
                text,
                image: image || null,
                options
            });
        }
        return questions;
    },

    // uploadQuizPackage - 主入口函数：完整的上传流程（调用parseQuizCSV）
    async uploadQuizPackage({ quizName, quizCsv, images, onProgress }) {
        // 默认进度回调
        onProgress = onProgress || ((msg) => console.log(msg));
        
        try {
            // Firestore API
            const db = window.db;
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            
            // 1. 解析CSV
            onProgress('正在解析题目数据...');
            const questions = this.parseQuizCSV(quizCsv);
            onProgress(`成功解析 ${questions.length} 个题目`);
            
            // 2. 上传Quiz文档，获取quizId
            onProgress('正在创建Quiz...');
            const quizRef = await addDoc(collection(db, 'quizzes'), {
                quizName,
                createdAt: new Date()
            });
            onProgress(`Quiz "${quizName}" 创建成功`);
            
            // 3. 上传每个题目，获取题目ID，并建立图片名到题目ID的映射
            onProgress('正在上传题目...');
            const imageToQuestionId = {};
            let completedQuestions = 0;
            
            for (const q of questions) {
                const qRef = await addDoc(collection(quizRef, 'questions'), {
                    text: q.text,
                    image: q.image,
                    options: q.options
                });
                if (q.image) {
                    imageToQuestionId[q.image] = qRef.id;
                }
                
                completedQuestions++;
                if (completedQuestions % 5 === 0 || completedQuestions === questions.length) {
                    onProgress(`已上传 ${completedQuestions}/${questions.length} 个题目`);
                }
            }
            
            // 4. 上传图片到images子集合，带上questionId，转base64
            const imagesToUpload = images.filter(img => imageToQuestionId[img.name]);
            if (imagesToUpload.length > 0) {
                onProgress(`正在上传 ${imagesToUpload.length} 张图片...`);
                let completedImages = 0;
                
                for (const img of images) {
                    const questionId = imageToQuestionId[img.name];
                    if (!questionId) continue;
                    
                    // 转base64
                    const base64 = btoa(Array.from(img.data, b => String.fromCharCode(b)).join(''));
                    await addDoc(collection(quizRef, 'images'), {
                        questionId,
                        name: img.name,
                        base64
                    });
                    
                    completedImages++;
                    if (completedImages % 3 === 0 || completedImages === imagesToUpload.length) {
                        onProgress(`已上传 ${completedImages}/${imagesToUpload.length} 张图片`);
                    }
                }
            } else {
                onProgress('没有图片需要上传');
            }
            
            onProgress('✅ Quiz上传完成！');
            return { success: true, quizId: quizRef.id };
        } catch (error) {
            onProgress(`❌ 上传失败: ${error.message}`);
            console.error('Quiz上传错误:', error);
            throw error;
        }
    }
}; 
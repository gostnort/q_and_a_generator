// Quiz上传与解析相关工具
window.quizUpload = {
    // parseQuizCSV - 解析CSV为题目结构（不处理图片，保留原始引用）
    parseQuizCSV(csvBuffer) {
        const decoder = new TextDecoder('utf-8');
        const csvText = decoder.decode(csvBuffer);
        const lines = csvText.split('\n').filter(line => line.trim());
        
        if (lines.length < 3) {
            throw new Error('CSV格式错误：至少需要3行（问题、图片、选项）');
        }
        
        const questions = [];
        const cols = lines[0].split(',').length;
        
        // 解析每一列为一个题目
        for (let col = 0; col < cols; col++) {
            const questionText = lines[0].split(',')[col]?.trim();
            const imageRef = lines[1].split(',')[col]?.trim();
            
            if (!questionText) continue;
            
            const options = [];
            // 从第3行开始是选项
            for (let row = 2; row < lines.length; row++) {
                const optionText = lines[row].split(',')[col]?.trim();
                if (!optionText) continue;
                
                const isCorrect = optionText.startsWith('`');
                const cleanText = isCorrect ? optionText.substring(1) : optionText;
                
                options.push({
                    text: cleanText,
                    correct: isCorrect
                });
            }
            
            if (options.length > 0) {
                questions.push({
                    text: questionText,
                    imageRef: imageRef || null, // 保留原始文件名引用
                    options: options
                });
            }
        }
        
        return questions;
    },

    // uploadImages - 修改为包含quizId
    async uploadImages(images, quizId, onProgress) {
        const db = window.db;
        const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
        
        const imageCollection = collection(db, 'shared_images');
        const imageMap = new Map();
        
        for (let i = 0; i < images.length; i++) {
            const image = images[i];
            onProgress(`正在上传图片 ${i + 1}/${images.length}: ${image.name}`);
            
            // 转换为base64 - 修复大文件的栈溢出问题
            let base64;
            try {
                // 对于大文件，分块处理避免栈溢出
                if (image.data.length > 10000) {
                    let binaryString = '';
                    const chunkSize = 8192; // 8KB chunks
                    for (let j = 0; j < image.data.length; j += chunkSize) {
                        const chunk = image.data.slice(j, j + chunkSize);
                        binaryString += String.fromCharCode(...chunk);
                    }
                    base64 = btoa(binaryString);
                } else {
                    // 小文件直接转换
                    base64 = btoa(String.fromCharCode(...image.data));
                }
                console.log(`图片 ${image.name} 转换为base64成功，原始大小: ${image.data.length}字节`);
            } catch (conversionError) {
                throw new Error(`图片 ${image.name} base64转换失败: ${conversionError.message}`);
            }
            
            // 上传到shared_images集合，包含quizId
            const imageDoc = await addDoc(imageCollection, {
                originalName: image.name,
                base64: base64,
                quizId: quizId,  // 新增：关联到quiz
                uploadedAt: new Date()
            });
            
            // 记录文件名到ID的映射
            imageMap.set(image.name, imageDoc.id);
            console.log(`图片上传成功: ${image.name} -> ${imageDoc.id} (关联到quiz: ${quizId})`);
        }
        
        return imageMap;
    },

    // replaceImageReferences - 第二步：将questions中的图片文件名替换为图片ID
    replaceImageReferences(questions, imageMap) {
        return questions.map(question => {
            if (question.imageRef && imageMap.has(question.imageRef)) {
                return {
                    ...question,
                    imageId: imageMap.get(question.imageRef), // 用图片ID替换
                    imageRef: undefined // 删除原始引用
                };
            }
            return {
                ...question,
                imageRef: undefined // 确保清理原始引用
            };
        });
    },

    // uploadQuizPackage - 主入口函数：完整的四步上传流程
    async uploadQuizPackage({ quizName, quizCsv, images, onProgress }) {
        try {
            onProgress('开始解析CSV...');
            
            // 解析CSV
            const questions = this.parseQuizCSV(quizCsv);
            console.log('解析完成，题目数量:', questions.length);
            
            // 第一步：创建quiz文档，获取quizId
            onProgress('正在创建Quiz文档...');
            const db = window.db;
            const { collection, addDoc } = await import('https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js');
            
            const quizRef = await addDoc(collection(db, 'quizzes'), {
                quizName: quizName,
                createdAt: new Date()
            });
            const quizId = quizRef.id;
            console.log('Quiz文档创建完成，ID:', quizId);

            // 第二步：上传图片，关联到quiz
            const imageMap = await this.uploadImages(images, quizId, onProgress);
            console.log('图片上传完成，映射:', imageMap);
            
            // 第三步：替换题目中的图片引用为ID
            const questionsWithImageIds = this.replaceImageReferences(questions, imageMap);
            console.log('图片引用替换完成');
            
            // 第四步：上传questions到quiz的subcollection
            onProgress('正在上传题目...');
            const questionsCollection = collection(db, 'quizzes', quizId, 'questions');
            
            for (let i = 0; i < questionsWithImageIds.length; i++) {
                const question = questionsWithImageIds[i];
                await addDoc(questionsCollection, {
                    text: question.text,
                    imageId: question.imageId || null,
                    options: question.options
                });
            }
            
            onProgress('✅ 上传完成！');
            console.log('Quiz上传完成，ID:', quizId);
            
            return quizId;
            
        } catch (error) {
            onProgress(`❌ 上传失败: ${error.message}`);
            throw error;
        }
    }
}; 
let csvData = [];
let questions = [];
let selectedZipFile = null;
let settings = {
    password: ''
};

// Fallback embedded CSV data in case no file is found
const embeddedCSVData = `Unable to load CSV data`;

// Check if JS7z is loaded or wait for it to load
function ensureJS7zLoaded() {
    return new Promise((resolve, reject) => {
        // If JS7z is already defined, resolve immediately
        if (typeof JS7z !== 'undefined') {
            console.log('JS7z is already loaded');
            resolve();
            return;
        }

        console.log('Waiting for JS7z to load...');
        
        // Check every 100ms if JS7z is loaded
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof JS7z !== 'undefined') {
                console.log('JS7z loaded after waiting');
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                console.error('Timeout waiting for JS7z to load');
                clearInterval(checkInterval);
                reject(new Error('JS7z failed to load after timeout'));
            }
        }, 100);
    });
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const data = [];
    
    for (let line of lines) {
        const row = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        data.push(row);
    }
    
    return data;
}


// Global object to store image URLs
let imageUrlMap = {};

async function loadQuiz() {
    try {
        // In a real application, you would fetch this from a server endpoint.
        // For now, we'll hardcode the path to the zip file.
        const quizConfig = {
            zipPath: '/zip/sample样板_密码12345.zip'
        };

        const response = await fetch(quizConfig.zipPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        selectedZipFile = await response.blob();
        document.getElementById('zipName').textContent = quizConfig.zipPath.replace('/zip/', '').replace('.zip', '');
        await loadCSVDataFromZip();
    } catch (error) {
        console.error('Error loading quiz configuration:', error);
        alert('Failed to load the quiz. Please try again later.');
    }
}

// Extract CSV data from zip file using JS7z
async function loadCSVDataFromZip() {
    if (!selectedZipFile) {
        alert('No ZIP file loaded.');
        return;
    }

    try {
        Object.values(imageUrlMap).forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        imageUrlMap = {};
        
        await ensureJS7zLoaded();
        
        const arrayBuffer = await selectedZipFile.arrayBuffer();
        
        const js7z = await JS7z({
            onExit: (exitCode) => {
                if (exitCode === 0) {
                    try {
                        const files = js7z.FS.readdir('/output');
                        for (const filename of files) {
                            if (filename === '.' || filename === '..') continue;
                            const lowerFilename = filename.toLowerCase();
                            if (lowerFilename.endsWith('.jpg') || lowerFilename.endsWith('.jpeg') || lowerFilename.endsWith('.png')) {
                                try {
                                    const imageData = js7z.FS.readFile('/output/' + filename, {encoding: 'binary'});
                                    let mimeType = 'image/jpeg';
                                    if (lowerFilename.endsWith('.png')) mimeType = 'image/png';
                                    const blob = new Blob([imageData], {type: mimeType});
                                    const url = URL.createObjectURL(blob);
                                    imageUrlMap[filename] = url;
                                } catch (readError) {
                                    console.error('Error reading image file:', filename, readError);
                                }
                            }
                        }

                        let csvContent = null;
                        for (const filename of files) {
                            if (filename.toLowerCase().endsWith('.csv')) {
                                try {
                                    csvContent = js7z.FS.readFile('/output/' + filename, {encoding: 'utf8'});
                                    break;
                                } catch (readError) {
                                    console.error('Error reading file:', filename, readError);
                                    continue;
                                }
                            }
                        }

                        if (!csvContent) {
                            alert('No CSV file found in the ZIP archive.');
                            return;
                        }
                        
                        csvData = parseCSV(csvContent);
                        regenerateQuiz();
        
                    } catch (e) {
                        alert('Error processing extracted files.');
                        console.error('Error processing extracted files:', e);
                    }
                } else {
                    alert('Error extracting ZIP file. It might be corrupted.');
                }
            },
            onAbort: (reason) => {
                alert('JS7z aborted.');
                console.error('JS7z aborted:', reason);
            },
        });
        
        js7z.FS.writeFile('/input.zip', new Uint8Array(arrayBuffer));
        js7z.FS.mkdir('/output');
        js7z.callMain(['x', '/input.zip', '-o/output']);
        
    } catch (error) {
        console.error('Error setting up ZIP extraction:', error);
        alert('Error preparing ZIP file for extraction.');
    }
}

// Convert CSV data to questions format
function processQuestions() {
    if (csvData.length < 3) return [];
    
    const questionsData = [];
    const numColumns = Math.max(...csvData.map(row => row.length));
    
    for (let col = 0; col < numColumns; col++) {
        const questionText = csvData[0][col];
        const imageName = csvData[1][col];
        
        if (!questionText || questionText.trim() === '') continue;
        
        const options = [];
        for (let row = 2; row < csvData.length; row++) {
            const option = csvData[row][col];
            if (option && option.trim() !== '') {
                options.push(option.trim());
            }
        }
        
        if (options.length > 0) {
            // Process image name - use the full filename from the CSV's second row
            let imageUrl = null;
            if (imageName && imageName.trim() !== '') {
                const trimmedImageName = imageName.trim();
                
                // First try the exact name as provided in the CSV
                imageUrl = imageUrlMap[trimmedImageName] || null;
                
                // If not found, try looking for the filename in different forms
                if (!imageUrl) {
                    console.log(`Looking for image: ${trimmedImageName}`);
                    
                    // Log all available image keys for debugging
                    console.log("Available image keys:", Object.keys(imageUrlMap));
                    
                    // Try with just the filename (without path)
                    const filenameParts = trimmedImageName.split(/[\/\\]/);
                    const justFilename = filenameParts[filenameParts.length - 1];
                    if (justFilename !== trimmedImageName) {
                        imageUrl = imageUrlMap[justFilename] || null;
                        console.log(`Tried just filename: ${justFilename}, found: ${imageUrl !== null}`);
                    }
                    
                    // If still not found, try with common image extensions
                    if (!imageUrl) {
                        const baseNames = [trimmedImageName, justFilename];
                        const extensions = ['.png', '.jpg', '.jpeg', '.gif'];
                        
                        for (const baseName of baseNames) {
                            // Try exact name first (might already have extension)
                            if (imageUrlMap[baseName]) {
                                imageUrl = imageUrlMap[baseName];
                                console.log(`Found image with base name: ${baseName}`);
                                break;
                            }
                            
                            // Try with extensions
                            for (const ext of extensions) {
                                const nameWithExt = baseName.endsWith(ext) ? baseName : baseName + ext;
                                if (imageUrlMap[nameWithExt]) {
                                    imageUrl = imageUrlMap[nameWithExt];
                                    console.log(`Found image with extension: ${nameWithExt}`);
                                    break;
                                }
                            }
                            
                            if (imageUrl) break;
                        }
                    }
                }
                
                // If still not found, use the original name as fallback
                if (!imageUrl) {
                    console.log(`Image not found in ZIP: ${trimmedImageName}, using as direct path`);
                    imageUrl = trimmedImageName;
                }
            }
            
            questionsData.push({
                text: questionText.trim(),
                image: imageUrl,
                options: options,
                id: col
            });
        }
    }
    
    return questionsData;
}

// Shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Check if question is multi-select
function isMultiSelect(options) {
    return options.filter(opt => opt.startsWith('`')).length > 1;
}


function regenerateQuiz() {
    const allQuestions = processQuestions();
    
    // Randomly select questions
    questions = shuffleArray(allQuestions);
    
    // Clear previous results
    document.getElementById('scoreLabel').textContent = '';
    
    renderQuestions();
}

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';
    
    questions.forEach((question, qIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);
        
        const isMulti = isMultiSelect(question.options);
        const inputType = isMulti ? 'checkbox' : 'radio';
        const inputName = `question_${qIndex}`;
        
        let html = `
            <div class="question-header">
                ${qIndex + 1}. ${question.text}
            </div>
        `;
        
        if (question.image) {
            html += `
                <div class="question-image">
                    <img src="${question.image}" alt="Question image" 
                         onerror="console.error('Failed to load image:', this.src); this.style.display='none'">
                </div>
            `;
            console.log(`Rendering image with src: ${question.image}`);
        }
        
        // Shuffle options
        const shuffledOptions = shuffleArray(question.options.map((opt, idx) => ({text: opt, originalIndex: idx})));
        
        shuffledOptions.forEach((option, optIndex) => {
            const optionId = `${inputName}_${optIndex}`;
            const optionText = option.text.startsWith('`') ? option.text.substring(1) : option.text;
            html += `
                <div class="option" data-original-index="${option.originalIndex}">
                    <input type="${inputType}" id="${optionId}" name="${inputName}" value="${optIndex}">
                    <label for="${optionId}" class="option-text">${optionText}</label>
                    <span class="result-icon"></span>
                </div>
            `;
        });
        
        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });
}

function submitAnswers() {
    let totalQuestions = questions.length;
    let totalCorrect = 0;
    let totalPossiblePoints = 0;
    let userPoints = 0;
    let unansweredQuestions = [];
    const answers = [];

    questions.forEach((question, qIndex) => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        const options = questionDiv.querySelectorAll('.option');
        const inputs = questionDiv.querySelectorAll('input');
        
        const anySelected = Array.from(inputs).some(input => input.checked);
        if (!anySelected) {
            unansweredQuestions.push(qIndex + 1);
        }
        
        const correctOptionsInQuestion = question.options.filter(opt => opt.startsWith('`'));
        totalPossiblePoints += correctOptionsInQuestion.length;
        
        let questionPoints = 0;
        let incorrectSelectionMade = false;

        const selectedOptions = [];
        options.forEach((optionDiv, optIndex) => {
            const input = inputs[optIndex];
            const resultIcon = optionDiv.querySelector('.result-icon');
            const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
            const originalOption = question.options[originalIndex];
            const isCorrect = originalOption.startsWith('`');
            
            optionDiv.classList.remove('correct-answer', 'show-correct');
            resultIcon.innerHTML = '';
            resultIcon.className = 'result-icon';
            
            if (input.checked) {
                selectedOptions.push(originalIndex);
                if (isCorrect) {
                    resultIcon.innerHTML = '✓';
                    resultIcon.classList.add('correct-mark');
                    questionPoints++;
                } else {
                    resultIcon.innerHTML = '✗';
                    resultIcon.classList.add('incorrect-mark');
                    incorrectSelectionMade = true;
                }
            }
        });

        answers.push({
            questionId: question.id,
            selectedOptions: selectedOptions
        });
        
        userPoints += questionPoints;
        const missedCorrectSelection = questionPoints < correctOptionsInQuestion.length;
        const questionIsWrong = incorrectSelectionMade || missedCorrectSelection;
        
        if (questionIsWrong) {
            options.forEach((optionDiv) => {
                const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
                const originalOption = question.options[originalIndex];
                if (originalOption.startsWith('`')) {
                    optionDiv.classList.add('correct-answer', 'show-correct');
                }
            });
        }
        
        if (!questionIsWrong) {
                totalCorrect++;
        }
    });

    if (unansweredQuestions.length > 0) {
        const questionList = unansweredQuestions.join(', ');
        const message = `Warning: You have not answered question${unansweredQuestions.length > 1 ? 's' : ''} ${questionList}. Do you want to continue?`;
        
        if (!confirm(message)) {
            return;
        }
    }

    // Save answers to localStorage to simulate WebSocket
    const existingAnswers = JSON.parse(localStorage.getItem('quizAnswers') || '[]');
    existingAnswers.push(answers);
    localStorage.setItem('quizAnswers', JSON.stringify(existingAnswers));

    const percentage = totalPossiblePoints > 0 ? Math.round((userPoints / totalPossiblePoints) * 100) : 0;
    const passed = percentage >= 90; // Hardcoded pass percentage
    const status = passed ? 'Pass' : 'Fail';
    
    document.getElementById('scoreLabel').textContent = `Score: ${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`;
    document.getElementById('scoreLabel').style.backgroundColor = passed ? '#d4edda' : '#f8d7da';
    document.getElementById('scoreLabel').style.color = passed ? '#155724' : '#721c24';
}

function printQuiz() {
    window.print();
}

function shareQuiz() {
    // Check if quiz has been generated
    if (questions.length === 0) {
        alert('Please generate a quiz first');
        return;
    }
    
    // Get the current quiz content
    const questionsContainer = document.getElementById('questionsContainer');
    
    // Get the current CSS styles
    const cssStyles = Array.from(document.styleSheets)
        .filter(sheet => sheet.href === null || sheet.href.startsWith(window.location.origin))
        .map(sheet => {
            try {
                return Array.from(sheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
            } catch (e) {
                console.warn('Cannot access cssRules from stylesheet', e);
                return '';
            }
        })
        .join('\n');
    
    // Create a copy of questions with embedded images
    const embeddedQuestions = questions.map(q => {
        // Create a deep copy of the question
        const questionCopy = { ...q };
        
        // If there's an image, convert it to base64 if it's a blob URL
        if (q.image && q.image.startsWith('blob:')) {
            // We'll replace this with base64 data later
            questionCopy.imageToEmbed = q.image;
        }
        
        // Obfuscate the correct answers by removing the backtick marker
        // but keep track of correct answers with a different method
        questionCopy.options = q.options.map((opt, idx) => {
            // Remove backtick but store correct answer info in a separate array
            return opt.startsWith('`') ? opt.substring(1) : opt;
        });
        
        // Store correct answer indices in a way that's not easily discoverable
        // Use a simple obfuscation technique - convert to base64
        const correctIndices = q.options
            .map((opt, idx) => opt.startsWith('`') ? idx : -1)
            .filter(idx => idx !== -1);
        
        // Store the correct indices in an obfuscated format
        questionCopy._c = btoa(JSON.stringify(correctIndices));
        
        return questionCopy;
    });
    
    // Function to fetch and convert blob URLs to base64
    const convertBlobUrlsToBase64 = async (questions) => {
        const promises = questions.map(async (question, index) => {
            if (question.imageToEmbed && question.imageToEmbed.startsWith('blob:')) {
                try {
                    const response = await fetch(question.imageToEmbed);
                    const blob = await response.blob();
                    return new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            // Replace the image URL with base64 data URL
                            question.image = reader.result;
                            delete question.imageToEmbed;
                            resolve();
                        };
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });
                } catch (error) {
                    console.error('Error converting image to base64:', error);
                    // If conversion fails, keep the original URL
                    question.image = question.imageToEmbed;
                    delete question.imageToEmbed;
                    return Promise.resolve();
                }
            }
            return Promise.resolve();
        });
        
        await Promise.all(promises);
        return questions;
    };
    
    // Show loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.position = 'fixed';
    loadingDiv.style.top = '0';
    loadingDiv.style.left = '0';
    loadingDiv.style.width = '100%';
    loadingDiv.style.height = '100%';
    loadingDiv.style.backgroundColor = 'rgba(0,0,0,0.5)';
    loadingDiv.style.display = 'flex';
    loadingDiv.style.justifyContent = 'center';
    loadingDiv.style.alignItems = 'center';
    loadingDiv.style.zIndex = '9999';
    loadingDiv.innerHTML = '<div style="background-color: white; padding: 20px; border-radius: 5px;">Preparing shared quiz...</div>';
    document.body.appendChild(loadingDiv);
    
    // Convert images and generate the HTML
    convertBlobUrlsToBase64(embeddedQuestions).then(questionsWithBase64 => {
        // Create a standalone HTML document
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Shared Quiz</title>
    <style>
        ${cssStyles}
        
        /* Additional styles for shared quiz */
        .header {
            justify-content: center;
            text-align: center;
        }
        
        .header-right {
            display: flex;
            justify-content: center;
            margin-top: 15px;
        }
        
        .regenerate-btn {
            background-color: #28a745;
            color: white;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <h2>Shared Quiz</h2>
        </div>
        <div class="header-right">
            <div class="score-label" id="scoreLabel"></div>
            <button class="submit-btn" id="submitBtn">Submit</button>
            <button class="regenerate-btn" id="regenerateBtn">Regenerate</button>
            <button class="print-btn" id="printBtn">Print</button>
        </div>
    </div>
    
    <hr class="header-separator">
    
    <div id="questionsContainer"></div>
    
    <script>
        // Standalone quiz functionality - no JS7z dependency
        let questions = ${JSON.stringify(questionsWithBase64)};
        
        // Function to decode correct answers
        function getCorrectIndices(question) {
            try {
                return JSON.parse(atob(question._c));
            } catch (e) {
                console.error('Error decoding correct answers', e);
                return [];
            }
        }
        
        // Shuffle array function
        function shuffleArray(array) {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        }
        
        // Check if question is multi-select
        function isMultiSelect(question) {
            return getCorrectIndices(question).length > 1;
        }
        
        // Regenerate quiz with the same questions but shuffled
        function regenerateQuiz() {
            renderQuestions();
            document.getElementById('scoreLabel').textContent = '';
        }
        
        // Render questions
        function renderQuestions() {
            const container = document.getElementById('questionsContainer');
            container.innerHTML = '';
            
            questions.forEach((question, qIndex) => {
                const questionDiv = document.createElement('div');
                questionDiv.className = 'question';
                questionDiv.setAttribute('data-question-id', qIndex);
                
                const isMulti = isMultiSelect(question);
                const inputType = isMulti ? 'checkbox' : 'radio';
                const inputName = \`question_\${qIndex}\`;
                
                let html = \`
                    <div class="question-header">
                        \${qIndex + 1}. \${question.text}
                    </div>
                \`;
                
                if (question.image) {
                    html += \`
                        <div class="question-image">
                            <img src="\${question.image}" alt="Question image" 
                                 onerror="this.style.display='none'">
                        </div>
                    \`;
                }
                
                // Shuffle options
                const shuffledOptions = shuffleArray(question.options.map((opt, idx) => ({text: opt, originalIndex: idx})));
                
                shuffledOptions.forEach((option, optIndex) => {
                    const optionId = \`\${inputName}_\${optIndex}\`;
                    html += \`
                        <div class="option" data-original-index="\${option.originalIndex}">
                            <input type="\${inputType}" id="\${optionId}" name="\${inputName}" value="\${optIndex}">
                            <label for="\${optionId}" class="option-text">\${option.text}</label>
                            <span class="result-icon"></span>
                        </div>
                    \`;
                });
                
                questionDiv.innerHTML = html;
                container.appendChild(questionDiv);
            });
        }
        
        // Submit answers
        function submitAnswers() {
            let totalQuestions = questions.length;
            let totalCorrect = 0;
            let totalPossiblePoints = 0;
            let userPoints = 0;
            let unansweredQuestions = [];

            questions.forEach((question, qIndex) => {
                const questionDiv = document.querySelector(\`[data-question-id="\${qIndex}"]\`);
                const options = questionDiv.querySelectorAll('.option');
                const inputs = questionDiv.querySelectorAll('input');
                
                // Check if any option is selected for this question
                const anySelected = Array.from(inputs).some(input => input.checked);
                if (!anySelected) {
                    unansweredQuestions.push(qIndex + 1); // Store 1-based question number
                }
                
                const correctIndices = getCorrectIndices(question);
                totalPossiblePoints += correctIndices.length;
                
                let questionPoints = 0;
                let incorrectSelectionMade = false;

                options.forEach((optionDiv, optIndex) => {
                    const input = inputs[optIndex];
                    const resultIcon = optionDiv.querySelector('.result-icon');
                    const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
                    const isCorrect = correctIndices.includes(originalIndex);
                    
                    // Clear previous results
                    optionDiv.classList.remove('correct-answer', 'show-correct');
                    resultIcon.innerHTML = '';
                    resultIcon.className = 'result-icon';
                    
                    if (input.checked) {
                        if (isCorrect) {
                            resultIcon.innerHTML = '✓';
                            resultIcon.classList.add('correct-mark');
                            questionPoints++;
                        } else {
                            resultIcon.innerHTML = '✗';
                            resultIcon.classList.add('incorrect-mark');
                            incorrectSelectionMade = true;
                        }
                    }
                });
                
                userPoints += questionPoints;
                const missedCorrectSelection = questionPoints < correctIndices.length;
                const questionIsWrong = incorrectSelectionMade || missedCorrectSelection;
                
                if (questionIsWrong) {
                    options.forEach((optionDiv) => {
                        const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
                        if (correctIndices.includes(originalIndex)) {
                            optionDiv.classList.add('correct-answer', 'show-correct');
                        }
                    });
                }
                
                if (!questionIsWrong) {
                    totalCorrect++;
                }
            });

            // Check if there are any unanswered questions
            if (unansweredQuestions.length > 0) {
                // Format the list of unanswered questions
                const questionList = unansweredQuestions.join(', ');
                const message = \`Warning: You have not answered question\${unansweredQuestions.length > 1 ? 's' : ''} \${questionList}. Do you want to continue?\`;
                
                // Ask the user if they want to continue without answering all questions
                if (!confirm(message)) {
                    return; // User chose to go back and answer all questions
                }
            }

            // Calculate percentage
            const percentage = totalPossiblePoints > 0 ? Math.round((userPoints / totalPossiblePoints) * 100) : 0;
            const passed = percentage >= 90; // Default pass percentage
            const status = passed ? 'Pass' : 'Fail';
            
            document.getElementById('scoreLabel').textContent = \`Score: \${percentage}% (\${userPoints}/\${totalPossiblePoints}) - \${status}\`;
            document.getElementById('scoreLabel').style.backgroundColor = passed ? '#d4edda' : '#f8d7da';
            document.getElementById('scoreLabel').style.color = passed ? '#155724' : '#721c24';
        }
        
        // Print quiz
        function printQuiz() {
            window.print();
        }
        
        // Initialize
        document.getElementById('submitBtn').addEventListener('click', submitAnswers);
        document.getElementById('regenerateBtn').addEventListener('click', regenerateQuiz);
        document.getElementById('printBtn').addEventListener('click', printQuiz);
        
        // Initial render
        renderQuestions();
    </script>
</body>
</html>
        `;
        
        // Create a blob and download link
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'shared_quiz.html';
        
        // Remove loading indicator
        document.body.removeChild(loadingDiv);
        
        // Trigger download
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        // Clean up the URL object
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }).catch(error => {
        console.error('Error creating shared quiz:', error);
        document.body.removeChild(loadingDiv);
        alert('Error creating shared quiz. Please try again.');
    });
}

// Cleanup function to revoke object URLs
function cleanupImageUrls() {
    Object.values(imageUrlMap).forEach(url => {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    });
    imageUrlMap = {};
}

// Initialize
window.addEventListener('load', function() {
    loadQuiz();
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    cleanupImageUrls();
}); 
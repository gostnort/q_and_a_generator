let csvData = [];
let questions = [];
let isFirstGenerate = true;
let selectedZipFile = null;
let settings = {
    password: '',
    numQuestions: '',
    passPercentage: 90
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

// Handle zip file selection
function handleZipFile(event) {
    const file = event.target.files[0];
    if (file) {
        selectedZipFile = file;
        const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
        document.getElementById('zipName').textContent = fileNameWithoutExt;
        console.log('Zip file selected:', file.name);
        
        // Show settings modal after file selection
        if (isFirstGenerate) {
            showModal();
        }
    }
}

// Load CSV data from test.csv (fallback)
async function loadCSVDataFromFile() {
    try {
        const response = await fetch('test.csv');
        const csvText = await response.text();
        csvData = parseCSV(csvText);
        console.log('CSV Data loaded from test.csv:', csvData);
        return true;
    } catch (error) {
        console.error('Error loading test.csv, using embedded data:', error);
        // Use embedded data as final fallback
        csvData = parseCSV(embeddedCSVData);
        console.log('Using embedded CSV data:', csvData);
        return true;
    }
}

// Global object to store image URLs
let imageUrlMap = {};

// Extract CSV data from zip file using JS7z
async function loadCSVDataFromZip() {
    if (!selectedZipFile) {
        alert('Please select a ZIP file first');
        console.error('No selectedZipFile in loadCSVDataFromZip');
        return;
    }

    try {
        console.log('Starting extraction with selectedZipFile:', selectedZipFile);
        // Clear previous image URLs
        Object.values(imageUrlMap).forEach(url => {
            if (url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        imageUrlMap = {};
        
        // Ensure JS7z is loaded before proceeding
        await ensureJS7zLoaded();
        
        const arrayBuffer = await selectedZipFile.arrayBuffer();
        console.log('ArrayBuffer from selectedZipFile:', arrayBuffer);
        
        const js7z = await JS7z({
            onExit: (exitCode) => {
                console.log('JS7z onExit, exitCode:', exitCode);
                if (exitCode === 0) {
                    try {
                        const files = js7z.FS.readdir('/output');
                        console.log('Extracted files:', files);
        
                        // Process all files - create object URLs for images
                        console.log("Processing extracted files for images...");
                        for (const filename of files) {
                            if (filename === '.' || filename === '..') continue;
                            
                            const lowerFilename = filename.toLowerCase();
                            if (lowerFilename.endsWith('.jpg') || 
                                lowerFilename.endsWith('.jpeg') || 
                                lowerFilename.endsWith('.png') ) {
                                try {
                                    console.log(`Found image file: ${filename}`);
                                    const imageData = js7z.FS.readFile('/output/' + filename, {encoding: 'binary'});
                                    let mimeType = 'image/jpeg';
                                    if (lowerFilename.endsWith('.png')) mimeType = 'image/png';
                                    else if (lowerFilename.endsWith('.gif')) mimeType = 'image/gif';
                                    const blob = new Blob([imageData], {type: mimeType});
                                    const url = URL.createObjectURL(blob);
                                    
                                    imageUrlMap[filename] = url;
                                    imageUrlMap['/output/' + filename] = url;
                                    const filenameNoExt = filename.substring(0, filename.lastIndexOf('.'));
                                    if (filenameNoExt) {
                                        imageUrlMap[filenameNoExt] = url;
                                    }
                                } catch (readError) {
                                    console.error('Error reading image file:', filename, readError);
                                }
                            }
                        }
                        
                        console.log("Finished processing images. Available images:", Object.keys(imageUrlMap));
                        
                        // Look for CSV files
                        let csvContent = null;
                        let csvFileName = '';
                        for (const filename of files) {
                            if (filename.toLowerCase().endsWith('.csv')) {
                                csvFileName = filename;
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
                            alert('No CSV file found in the ZIP archive. Falling back to test.csv');
                            loadCSVDataFromFile().then(() => {
                                isFirstGenerate = false;
                                regenerateQuiz();
                            });
                            return;
                        }
                        
                        csvData = parseCSV(csvContent);
                        console.log('CSV Data loaded from ZIP:', csvData);
                        isFirstGenerate = false;
                        regenerateQuiz();

                    } catch (e) {
                        alert('Error processing extracted files. Falling back to test.csv file.');
                        console.error('Error processing extracted files:', e);
                        loadCSVDataFromFile().then(() => {
                            isFirstGenerate = false;
                            regenerateQuiz();
                        });
                    }
                } else {
                    alert('Error extracting ZIP file: Incorrect password or corrupted archive. Falling back to test.csv file.');
                    console.error('JS7z extraction failed, exitCode:', exitCode);
                    loadCSVDataFromFile().then(() => {
                        isFirstGenerate = false;
                        regenerateQuiz();
                    });
                }
            },
            onAbort: (reason) => {
                alert('JS7z aborted. Falling back to test.csv file.');
                console.error('JS7z aborted:', reason);
                loadCSVDataFromFile().then(() => {
                    isFirstGenerate = false;
                    regenerateQuiz();
                });
            },
        });
        
        // Write ZIP file to virtual filesystems
        js7z.FS.writeFile('/input.zip', new Uint8Array(arrayBuffer));
        js7z.FS.mkdir('/output');
        
        // Extract with password (if provided)
        const extractArgs = ['x', '/input.zip', '-o/output'];
        if (settings.password) {
            extractArgs.push(`-p${settings.password}`);
        }
        
        console.log('Extracting with args:', extractArgs);
        js7z.callMain(extractArgs);
        
    } catch (error) {
        console.error('Error setting up ZIP extraction:', error);
        alert('Error preparing ZIP file for extraction. Falling back to test.csv file.');
        await loadCSVDataFromFile();
        isFirstGenerate = false;
        regenerateQuiz();
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

// Generate quiz
function generateQuiz() {
    // Clear score label
    document.getElementById('scoreLabel').textContent = '';
    
    if (isFirstGenerate || csvData.length === 0) {
        // Open file dialog to select ZIP file
        document.getElementById('zipFileInput').click();
    } else {
        // Just regenerate with existing data
        regenerateQuiz();
    }
}

function showModal() {
    document.getElementById('settingsModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

async function applySettings() {
    settings.password = document.getElementById('zipPassword').value;
    settings.numQuestions = parseInt(document.getElementById('numQuestions').value);
    settings.passPercentage = parseInt(document.getElementById('passPercentage').value);
    
    closeModal();
    
    await loadCSVDataFromZip();
}

function regenerateQuiz() {
    const allQuestions = processQuestions();
    
    const numQuestionsInput = document.getElementById('numQuestions');
    numQuestionsInput.max = allQuestions.length;

    // If numQuestions setting is invalid or not set, default to all questions.
    if (!settings.numQuestions || settings.numQuestions > allQuestions.length) {
        settings.numQuestions = allQuestions.length;
    }
    numQuestionsInput.value = settings.numQuestions;
    
    // Randomly select questions
    const shuffledQuestions = shuffleArray(allQuestions);
    questions = shuffledQuestions.slice(0, Math.min(settings.numQuestions, shuffledQuestions.length));
    
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

    questions.forEach((question, qIndex) => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        const options = questionDiv.querySelectorAll('.option');
        const inputs = questionDiv.querySelectorAll('input');
        
        const correctOptionsInQuestion = question.options.filter(opt => opt.startsWith('`'));
        totalPossiblePoints += correctOptionsInQuestion.length;

        let questionPoints = 0;
        let incorrectSelectionMade = false;

        options.forEach((optionDiv, optIndex) => {
            const input = inputs[optIndex];
            const resultIcon = optionDiv.querySelector('.result-icon');
            const originalIndex = parseInt(optionDiv.getAttribute('data-original-index'));
            const originalOption = question.options[originalIndex];
            const isCorrect = originalOption.startsWith('`');
            
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

    // Calculate percentage based on total possible points
    const percentage = totalPossiblePoints > 0 ? Math.round((userPoints / totalPossiblePoints) * 100) : 0;
    const passed = percentage >= settings.passPercentage;
    const status = passed ? 'Pass' : 'Fail';
    
    document.getElementById('scoreLabel').textContent = `Score: ${percentage}% (${userPoints}/${totalPossiblePoints}) - ${status}`;
    document.getElementById('scoreLabel').style.backgroundColor = passed ? '#d4edda' : '#f8d7da';
    document.getElementById('scoreLabel').style.color = passed ? '#155724' : '#721c24';
}

function printQuiz() {
    window.print();
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

async function populateZipDropdown() {
    try {
        const response = await fetch('zip/manifest.json');
        const files = await response.json();
        const select = document.getElementById('zipFiles');
        select.innerHTML = '';
        files.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Failed to load zip manifest:', e);
    }
}

function login() {
    const username = document.getElementById('ownerIdentity').value.trim();
    if (!username) {
        alert('Please enter a username.');
        return;
    }
    // Show owner interface, hide login
    document.getElementById('loginInterface').style.display = 'none';
    document.getElementById('ownerInterface').style.display = 'block';
    document.getElementById('ownerEmail').textContent = username;
    populateZipDropdown();
}

function logout() {
    // Simple logout: reload the page to reset state
    window.location.reload();
}

function loadQuiz() {
    const select = document.getElementById('zipFiles');
    const selectedFile = select.value;
    if (!selectedFile) {
        alert('Please select a quiz file.');
        return;
    }
    const fetchUrl = '/zip/' + selectedFile;
    console.log('Attempting to fetch zip file from:', fetchUrl);
    fetch(fetchUrl)
        .then(response => {
            console.log('Fetch response status:', response.status);
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.status);
            }
            return response.blob();
        })
        .then(blob => {
            console.log('Fetched blob:', blob);
            selectedZipFile = new File([blob], selectedFile);
            console.log('Created File object:', selectedZipFile);
            document.getElementById('zipName').textContent = selectedFile.replace(/\.[^/.]+$/, "");
            // Always show password modal before extraction
            showModal();
        })
        .catch(err => {
            alert('Failed to load the selected zip file.');
            console.error('Error fetching zip file:', err);
        });
}

// Initialize
window.addEventListener('load', function() {
    console.log('Page loaded');
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    cleanupImageUrls();
}); 

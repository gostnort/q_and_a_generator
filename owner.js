let csvData = [];
let questions = [];
let selectedZipFile = null;
let imageUrlMap = {};

window.onload = async function() {
    await fetchZipFiles();
};

async function fetchZipFiles() {
    // In a real application, you would fetch this list from the server.
    // For this example, we'll assume the zip files are in a /zip directory.
    // This part of the code will need to be adjusted based on how the files are served.
    try {
        const response = await fetch('/zip/');
        const text = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        const links = Array.from(doc.querySelectorAll('a'));
        const zipFiles = links.map(link => link.getAttribute('href')).filter(href => href.endsWith('.zip'));

        const select = document.getElementById('zipFiles');
        select.innerHTML = '';
        zipFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = file;
            option.textContent = file.replace('/zip/', '');
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching zip files:', error);
        // Fallback for when directory listing is not available
        const zipFiles = ['sample样板_密码12345.zip'];
        const select = document.getElementById('zipFiles');
        select.innerHTML = '';
        zipFiles.forEach(file => {
            const option = document.createElement('option');
            option.value = `/zip/${file}`;
            option.textContent = file;
            select.appendChild(option);
        });
    }
}


// Check if JS7z is loaded or wait for it to load
function ensureJS7zLoaded() {
    return new Promise((resolve, reject) => {
        if (typeof JS7z !== 'undefined') {
            resolve();
            return;
        }
        let attempts = 0;
        const maxAttempts = 50;
        const checkInterval = setInterval(() => {
            attempts++;
            if (typeof JS7z !== 'undefined') {
                clearInterval(checkInterval);
                resolve();
            } else if (attempts >= maxAttempts) {
                clearInterval(checkInterval);
                reject(new Error('JS7z failed to load after timeout'));
            }
        }, 100);
    });
}

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

async function loadZipFile() {
    const select = document.getElementById('zipFiles');
    const selectedZipPath = select.value;
    if (!selectedZipPath) {
        alert('Please select a ZIP file.');
        return;
    }

    try {
        const response = await fetch(selectedZipPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        selectedZipFile = await response.blob();
        await loadCSVDataFromZip();
    } catch (error) {
        console.error('Error loading ZIP file from server:', error);
        alert('Failed to load the selected ZIP file. Please ensure it is accessible.');
    }
}

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
                        questions = processQuestions();
                        renderOwnerQuestions();

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
            let imageUrl = null;
            if (imageName && imageName.trim() !== '') {
                const trimmedImageName = imageName.trim();
                imageUrl = imageUrlMap[trimmedImageName] || null;
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

function renderOwnerQuestions() {
    const container = document.getElementById('questionsContainer');
    container.innerHTML = '';

    questions.forEach((question, qIndex) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question';
        questionDiv.setAttribute('data-question-id', question.id);

        let html = `<div class="question-header">${qIndex + 1}. ${question.text}</div>`;

        if (question.image) {
            html += `<div class="question-image"><img src="${question.image}" alt="Question image"></div>`;
        }

        question.options.forEach((option, optIndex) => {
            const isCorrect = option.startsWith('`');
            const optionText = isCorrect ? option.substring(1) : option;
            html += `
                <div class="option ${isCorrect ? 'correct-answer show-correct' : ''}" data-option-index="${optIndex}">
                    <span class="option-text">${optionText}</span>
                    <span class="client-count">(0 clients)</span>
                </div>
            `;
        });

        questionDiv.innerHTML = html;
        container.appendChild(questionDiv);
    });

    updateClientCounts();
}

function updateClientCounts() {
    const answers = JSON.parse(localStorage.getItem('quizAnswers') || '[]');
    const counts = {};

    answers.forEach(submission => {
        submission.forEach(answer => {
            if (!counts[answer.questionId]) {
                counts[answer.questionId] = {};
            }
            answer.selectedOptions.forEach(optionIndex => {
                counts[answer.questionId][optionIndex] = (counts[answer.questionId][optionIndex] || 0) + 1;
            });
        });
    });

    questions.forEach(question => {
        const questionDiv = document.querySelector(`[data-question-id="${question.id}"]`);
        if (questionDiv) {
            question.options.forEach((option, optIndex) => {
                const count = (counts[question.id] && counts[question.id][optIndex]) || 0;
                const countSpan = questionDiv.querySelector(`[data-option-index="${optIndex}"] .client-count`);
                if (countSpan) {
                    countSpan.textContent = `(${count} clients)`;
                }
            });
        }
    });
}

window.addEventListener('storage', (event) => {
    if (event.key === 'quizAnswers') {
        updateClientCounts();
    }
});

// Server Communication Module
// This handles quiz session sharing across different devices

const SERVER_BASE_URL = 'https://api.jsonbin.io/v3/b'; // Using JSONBin.io as a simple server

// Try to get API key from environment variable (Netlify)
let API_KEY = null;

// Function to initialize API key
function initializeApiKey() {
    // Try to get from environment variable (works on Netlify)
    if (typeof process !== 'undefined' && process.env && process.env.JSONBIN_API_KEY) {
        API_KEY = process.env.JSONBIN_API_KEY;
        console.log('API key loaded from environment variable');
        return true;
    }
    
    // Try to get from window object (if set by Netlify)
    if (window.JSONBIN_API_KEY) {
        API_KEY = window.JSONBIN_API_KEY;
        console.log('API key loaded from window object');
        return true;
    }
    
    return false;
}

// Function to set API key securely
function setApiKey(key) {
    API_KEY = key;
    console.log('API key set successfully');
}

// Function to prompt user for API key
function promptForApiKey() {
    const key = prompt('Please enter your JSONBin.io X-Master-Key for server functionality:');
    if (key && key.trim()) {
        setApiKey(key.trim());
        return true;
    }
    return false;
}

// Initialize API key on load
initializeApiKey();

// Session Management with Server
class ServerSessionManager {
    constructor() {
        this.sessionId = null;
        this.pollingInterval = null;
    }

    // Create a new quiz session on server
    async createSession(quizName, randomizedQuestions) {
        try {
            // Check if API key is available
            if (!API_KEY) {
                if (!promptForApiKey()) {
                    throw new Error('API key required for server functionality');
                }
            }

            const sessionData = {
                quizName: quizName,
                startTime: new Date().toISOString(),
                sessionId: this.generateSessionId(),
                randomizedQuestions: randomizedQuestions,
                isActive: true,
                clientSubmissions: [],
                analytics: {},
                lastUpdated: Date.now()
            };

            const response = await fetch(`${SERVER_BASE_URL}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY,
                    'X-Bin-Name': `quiz-session-${sessionData.sessionId}`
                },
                body: JSON.stringify(sessionData)
            });

            if (!response.ok) {
                throw new Error('Failed to create session on server');
            }

            const result = await response.json();
            this.sessionId = sessionData.sessionId;
            console.log('Session created on server:', sessionData.sessionId);
            return sessionData;
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    // Get active session from server
    async getActiveSession() {
        try {
            // Check if API key is available
            if (!API_KEY) {
                if (!promptForApiKey()) {
                    return null; // Fall back to localStorage
                }
            }

            // First, try to find any active session
            const response = await fetch(`${SERVER_BASE_URL}/latest`, {
                headers: {
                    'X-Master-Key': API_KEY
                }
            });

            if (!response.ok) {
                return null;
            }

            const data = await response.json();
            const session = data.record;

            // Check if session is active and recent (within 30 minutes)
            if (session && session.isActive) {
                const sessionAge = Date.now() - session.lastUpdated;
                if (sessionAge < 30 * 60 * 1000) { // 30 minutes
                    this.sessionId = session.sessionId;
                    return session;
                }
            }

            return null;
        } catch (error) {
            console.error('Error getting active session:', error);
            return null;
        }
    }

    // Update session data (for analytics, submissions, etc.)
    async updateSession(updates) {
        if (!this.sessionId) {
            throw new Error('No active session to update');
        }

        try {
            const currentSession = await this.getActiveSession();
            if (!currentSession) {
                throw new Error('Session not found');
            }

            const updatedSession = {
                ...currentSession,
                ...updates,
                lastUpdated: Date.now()
            };

            const response = await fetch(`${SERVER_BASE_URL}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API_KEY
                },
                body: JSON.stringify(updatedSession)
            });

            if (!response.ok) {
                throw new Error('Failed to update session');
            }

            console.log('Session updated on server');
            return updatedSession;
        } catch (error) {
            console.error('Error updating session:', error);
            throw error;
        }
    }

    // Add client submission
    async addClientSubmission(clientName, submissionData) {
        try {
            const currentSession = await this.getActiveSession();
            if (!currentSession) {
                throw new Error('No active session found');
            }

            const submission = {
                clientName: clientName,
                submissionTime: new Date().toISOString(),
                answers: submissionData.answers,
                score: submissionData.score,
                percentage: submissionData.percentage,
                passed: submissionData.passed
            };

            // Remove existing submission from same client
            const filteredSubmissions = currentSession.clientSubmissions.filter(
                s => s.clientName !== clientName
            );
            filteredSubmissions.push(submission);

            await this.updateSession({
                clientSubmissions: filteredSubmissions
            });

            console.log('Client submission added:', clientName);
            return submission;
        } catch (error) {
            console.error('Error adding client submission:', error);
            throw error;
        }
    }

    // Update analytics
    async updateAnalytics(analytics) {
        try {
            await this.updateSession({
                analytics: analytics
            });
            console.log('Analytics updated on server');
        } catch (error) {
            console.error('Error updating analytics:', error);
            throw error;
        }
    }

    // End session
    async endSession() {
        try {
            await this.updateSession({
                isActive: false
            });
            this.sessionId = null;
            console.log('Session ended on server');
        } catch (error) {
            console.error('Error ending session:', error);
            throw error;
        }
    }

    // Start polling for session updates (for owner monitoring)
    startPolling(callback, interval = 5000) {
        this.stopPolling();
        this.pollingInterval = setInterval(async () => {
            try {
                const session = await this.getActiveSession();
                if (callback) {
                    callback(session);
                }
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, interval);
    }

    // Stop polling
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Generate unique session ID
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Global server session manager
window.serverSessionManager = new ServerSessionManager();

// Fallback to localStorage if server is unavailable
class FallbackSessionManager {
    constructor() {
        this.isServerAvailable = false;
    }

    async testServerConnection() {
        try {
            const session = await window.serverSessionManager.getActiveSession();
            this.isServerAvailable = true;
            console.log('Server connection available');
            return true;
        } catch (error) {
            this.isServerAvailable = false;
            console.log('Server unavailable, using localStorage fallback');
            return false;
        }
    }

    // Fallback methods that use localStorage
    async createSession(quizName, randomizedQuestions) {
        if (this.isServerAvailable) {
            return await window.serverSessionManager.createSession(quizName, randomizedQuestions);
        } else {
            // Fallback to localStorage
            const sessionData = {
                quizName: quizName,
                startTime: new Date().toISOString(),
                sessionId: 'local_' + Date.now(),
                randomizedQuestions: randomizedQuestions,
                isActive: true,
                clientSubmissions: [],
                analytics: {},
                lastUpdated: Date.now()
            };
            
            localStorage.setItem('fallback_session', JSON.stringify(sessionData));
            return sessionData;
        }
    }

    async getActiveSession() {
        if (this.isServerAvailable) {
            return await window.serverSessionManager.getActiveSession();
        } else {
            // Fallback to localStorage
            const sessionData = localStorage.getItem('fallback_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const sessionAge = Date.now() - session.lastUpdated;
                if (session.isActive && sessionAge < 30 * 60 * 1000) {
                    return session;
                }
            }
            return null;
        }
    }

    async addClientSubmission(clientName, submissionData) {
        if (this.isServerAvailable) {
            return await window.serverSessionManager.addClientSubmission(clientName, submissionData);
        } else {
            // Fallback to localStorage
            const sessionData = localStorage.getItem('fallback_session');
            if (sessionData) {
                const session = JSON.parse(sessionData);
                const submission = {
                    clientName: clientName,
                    submissionTime: new Date().toISOString(),
                    answers: submissionData.answers,
                    score: submissionData.score,
                    percentage: submissionData.percentage,
                    passed: submissionData.passed
                };

                const filteredSubmissions = session.clientSubmissions.filter(
                    s => s.clientName !== clientName
                );
                filteredSubmissions.push(submission);
                session.clientSubmissions = filteredSubmissions;
                session.lastUpdated = Date.now();

                localStorage.setItem('fallback_session', JSON.stringify(session));
                return submission;
            }
        }
    }

    async endSession() {
        if (this.isServerAvailable) {
            return await window.serverSessionManager.endSession();
        } else {
            // Fallback to localStorage
            localStorage.removeItem('fallback_session');
        }
    }
}

// Global fallback session manager
window.fallbackSessionManager = new FallbackSessionManager();

// Initialize server connection test
window.initializeServerConnection = async function() {
    await window.fallbackSessionManager.testServerConnection();
}; 
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('./js/logger'); // Import the logger

// Define path for local data folder
const dataFolderPath = path.join(__dirname, 'data');
const yuiDataPath = path.join(dataFolderPath, 'yuiData.json');
const settingsPath = path.join(dataFolderPath, 'settings.json');
const logsFolderPath = path.join(dataFolderPath, 'logs'); // Changed to local data folder

// Initialize logger early
// Logs will be stored in the local data/logs directory.
logger.init(path.join(logsFolderPath, 'app.log'));


let GoogleGenAI; // This should be the constructor from @google/genai
try {
    // Assuming @google/genai exports GoogleGenAI directly or as a named export
    const genAiModule = require("@google/genai"); 
    if (genAiModule && typeof genAiModule.GoogleGenAI === 'function') {
        GoogleGenAI = genAiModule.GoogleGenAI;
        logger.info("MAIN", "Successfully loaded GoogleGenAI constructor from '@google/genai'.");
    } else if (genAiModule && typeof genAiModule.default === 'function' && genAiModule.default.name === 'GoogleGenAI') { // Fallback for default export
        GoogleGenAI = genAiModule.default;
        logger.info("MAIN", "Successfully loaded GoogleGenAI constructor (default export) from '@google/genai'.");
    }
    else {
        logger.error("MAIN", "'GoogleGenAI' constructor not found in '@google/genai'. Module content:", genAiModule);
        GoogleGenAI = null;
    }
} catch (e) {
    logger.error("MAIN", "Failed to require '@google/genai'. Error:", e);
    GoogleGenAI = null; 
}

// Ensure data folder exists (logs folder will be created by logger.init if needed)
if (!fs.existsSync(dataFolderPath)) {
    try {
        fs.mkdirSync(dataFolderPath, { recursive: true }); // Ensure data folder itself exists
        logger.info('MAIN', `Created data folder: ${dataFolderPath}`);
    } catch (error) {
        logger.error('MAIN', 'Failed to create data folder:', error);
    }
}

let mainWindow;

function createWindow() {
    // Load saved settings or use defaults
    let currentSettings = loadSettings(); // This function now uses logger internally

    mainWindow = new BrowserWindow({
        width: currentSettings.resolution.width || 1280,
        height: currentSettings.resolution.height || 720,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false // Important for security
        }
    });

    mainWindow.loadFile('index.html');
    logger.info('MAIN', 'Main window loaded index.html');

    // mainWindow.webContents.openDevTools(); // For debugging - uncomment if needed
    // logger.info('MAIN', 'Opened DevTools.'); // Log only if opened

    mainWindow.on('closed', () => {
        logger.info('MAIN', 'Main window closed.');
        mainWindow = null;
    });
}

app.on('ready', () => {
    logger.info('MAIN', 'App ready, creating window.');
    createWindow();
});

app.on('window-all-closed', () => {
    logger.info('MAIN', 'All windows closed.');
    if (process.platform !== 'darwin') {
        logger.info('MAIN', 'Quitting app.');
        app.quit();
    }
});

app.on('activate', () => {
    logger.info('MAIN', 'App activated.');
    if (mainWindow === null) {
        logger.info('MAIN', 'No main window, creating one.');
        createWindow();
    }
});

// IPC Handler for Renderer Logs
ipcMain.handle('log-message', (event, level, message, ...args) => {
    const source = 'RENDERER';
    switch (level.toLowerCase()) {
        case 'info':
            logger.info(source, message, ...args);
            break;
        case 'warn':
            logger.warn(source, message, ...args);
            break;
        case 'error':
            logger.error(source, message, ...args);
            break;
        case 'debug':
            logger.debug(source, message, ...args);
            break;
        default:
            logger.warn(source, `Unknown log level '${level}' received from renderer:`, message, ...args);
    }
    return { success: true }; // Acknowledge the log
});

// IPC Handler to read the log file
ipcMain.handle('read-log-file', async () => {
    try {
        const logFilePath = path.join(logsFolderPath, 'app.log'); // Use the same path as logger.init
        if (fs.existsSync(logFilePath)) {
            const logContent = fs.readFileSync(logFilePath, 'utf-8');
            return { success: true, content: logContent };
        }
        logger.warn('MAIN', 'Log file not found when trying to read for UI.');
        return { success: false, error: 'Log file not found.' };
    } catch (error) {
        logger.error('MAIN', 'Failed to read log file for UI:', error);
        return { success: false, error: error.message };
    }
});

// --- Data Storage IPC Handlers ---
ipcMain.handle('load-yui-data', async () => {
    try {
        if (fs.existsSync(yuiDataPath)) {
            const data = fs.readFileSync(yuiDataPath, 'utf-8');
            logger.info('MAIN', 'Yui data loaded successfully.');
            const parsedData = JSON.parse(data);
            // Ensure new fields have defaults if loading old data
            parsedData.lastProactiveTimestamp = parsedData.lastProactiveTimestamp === undefined ? null : parsedData.lastProactiveTimestamp;
            
            // Initialize new personality traits if they don't exist
            parsedData.shynessLevel = parsedData.shynessLevel === undefined ? 70 : parsedData.shynessLevel;
            parsedData.opennessToTopics = parsedData.opennessToTopics || { personal: 20, hobbies: 40, deepThoughts: 10, futurePlans: 30, vulnerability: 15 };
            parsedData.opennessToTopics.personal = parsedData.opennessToTopics.personal === undefined ? 20 : parsedData.opennessToTopics.personal;
            parsedData.opennessToTopics.hobbies = parsedData.opennessToTopics.hobbies === undefined ? 40 : parsedData.opennessToTopics.hobbies;
            parsedData.opennessToTopics.deepThoughts = parsedData.opennessToTopics.deepThoughts === undefined ? 10 : parsedData.opennessToTopics.deepThoughts;
            parsedData.opennessToTopics.futurePlans = parsedData.opennessToTopics.futurePlans === undefined ? 30 : parsedData.opennessToTopics.futurePlans;
            parsedData.opennessToTopics.vulnerability = parsedData.opennessToTopics.vulnerability === undefined ? 15 : parsedData.opennessToTopics.vulnerability;
            parsedData.sarcasmLevel = parsedData.sarcasmLevel === undefined ? 60 : parsedData.sarcasmLevel;
            parsedData.playfulnessLevel = parsedData.playfulnessLevel === undefined ? 30 : parsedData.playfulnessLevel;
            parsedData.patienceLevel = parsedData.patienceLevel === undefined ? 50 : parsedData.patienceLevel;

            return parsedData;
        }
        logger.info('MAIN', 'No Yui data file found, returning initial default data.');
        // Return full default structure including new personality traits
        return {
            characterName: "Yui",
            userName: "User",
            age: 28,
            occupation: "Guitarist",
            backgroundSummary: "Having a rough childhood, Yui is a solitude type character. She is to herself and enjoys playing guitar and writing music. She is usually tired, and has no family. She finds solace in the intricate melodies she creates and the worn frets of her favorite electric guitar, a vintage model she saved up for years to buy. Rainy days are her favorite, as they provide the perfect melancholic backdrop for her compositions. She has a hidden soft spot for stray cats and secretly feeds a few in her neighborhood.",
            trustLevel: 0,
            affectionLevel: 0,
            friendshipStage: "Stranger",
            shynessLevel: 70,
            opennessToTopics: { personal: 20, hobbies: 40, deepThoughts: 10, futurePlans: 30, vulnerability: 15 },
            sarcasmLevel: 60,
            playfulnessLevel: 30,
            patienceLevel: 50,
            memory: [],
            maxMemoryTurns: 50,
            userPreferences: { food: null, dates: null, games: null, anime: null, color: null },
            keyEvents: [],
            affectionHistory: [],
            trustHistory: [],
            lastInteractionTimestamp: null,
            sentimentHistory: [], // Ensure this is also part of default if not already
            maxSentimentHistory: 20, // Ensure this is also part of default
            lastProactiveTimestamp: null
        };
    } catch (error) {
        logger.error('MAIN', 'Failed to load Yui data:', error);
        // Fallback to initial data in case of parsing error too
        return {
            characterName: "Yui", userName: "User", age: 28, occupation: "Guitarist", backgroundSummary: "...",
            trustLevel: 0, affectionLevel: 0, friendshipStage: "Stranger",
            shynessLevel: 70,
            opennessToTopics: { personal: 20, hobbies: 40, deepThoughts: 10, futurePlans: 30, vulnerability: 15 },
            sarcasmLevel: 60,
            playfulnessLevel: 30,
            patienceLevel: 50,
            memory: [], maxMemoryTurns: 50,
            userPreferences: {}, keyEvents: [], affectionHistory: [], trustHistory: [], lastInteractionTimestamp: null,
            sentimentHistory: [], maxSentimentHistory: 20,
            lastProactiveTimestamp: null
        };
    }
});

ipcMain.handle('save-yui-data', async (event, data) => {
    try {
        fs.writeFileSync(yuiDataPath, JSON.stringify(data, null, 2));
        logger.info('MAIN', 'Yui data saved successfully.');
        return { success: true };
    } catch (error) {
        logger.error('MAIN', 'Failed to save Yui data:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('load-settings', async () => {
    // loadSettings function itself uses logger
    return loadSettings();
});

ipcMain.handle('save-settings', async (event, settings) => {
    try {
        // Ensure resolution values are numbers
        if (settings.resolution) {
            settings.resolution.width = parseInt(settings.resolution.width, 10);
            settings.resolution.height = parseInt(settings.resolution.height, 10);
        }
        
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        logger.info('MAIN', 'Settings saved successfully.');
        
        // Apply resolution change if window exists
        if (mainWindow && settings.resolution) {
            mainWindow.setSize(
                settings.resolution.width, 
                settings.resolution.height, 
                true // true centers the window
            );
            logger.info('MAIN', `Window resized to ${settings.resolution.width}x${settings.resolution.height}`);
        }
        
        return { success: true };
    } catch (error) {
        logger.error('MAIN', 'Failed to save settings:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('reset-all-data', async () => {
    try {
        if (fs.existsSync(yuiDataPath)) fs.unlinkSync(yuiDataPath);
        if (fs.existsSync(settingsPath)) fs.unlinkSync(settingsPath);
        logger.info('MAIN', 'All data reset. Relaunching app.');
        // Relaunch the app
        app.relaunch();
        app.exit();
        return { success: true };
    } catch (error) {
        logger.error('MAIN', 'Failed to reset data:', error);
        return { success: false, error: error.message };
    }
});

// New IPC Handler for Gemini API calls
ipcMain.handle('call-gemini-api', async (event, { apiKey, modelName, contents, generationConfig, safetySettings }) => {
    if (!apiKey) {
        logger.warn('MAIN', 'Gemini API call attempted without API key.');
        return { success: false, error: 'API key is missing.' };
    }
    if (!GoogleGenAI || typeof GoogleGenAI !== 'function') {
        logger.error("MAIN", "GoogleGenAI constructor is not available. API call cannot proceed.");
        return { success: false, error: 'GoogleGenAI library not loaded correctly. Check main process logs.' };
    }
    try {
        const ai = new GoogleGenAI({ apiKey: apiKey }); 

        // Construct the request payload with generationConfig and safetySettings at the top level
        const requestPayload = {
            model: modelName,
            contents: contents,
            generationConfig: generationConfig, // Moved to top level
            safetySettings: safetySettings,     // Moved to top level
        };
        
        logger.debug("MAIN", "Sending request to Gemini API. Model:", modelName, "Payload (contents omitted for brevity):", { generationConfig, safetySettings }); 
        
        const result = await ai.models.generateContent(requestPayload); // 'result' is the direct response from generateContent
        logger.debug("MAIN", "Received response from Gemini API (response content omitted for brevity)."); // Avoid logging full potentially large response
        
        if (result && typeof result.text === 'string') { // Check for direct .text property first
            logger.info('MAIN', 'Gemini API call successful, text extracted directly.');
            return { success: true, text: result.text };
        } 
        else if (result && result.candidates && result.candidates[0] && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts[0] && typeof result.candidates[0].content.parts[0].text === 'string') {
            // Fallback to candidates structure if .text is not directly available or empty
            logger.info("MAIN", "Gemini API call successful, text extracted via candidates structure.");
            return { success: true, text: result.candidates[0].content.parts[0].text };
        }
        else {
            // Handle cases where no text is returned, possibly due to blocking or other issues
            logger.error('MAIN', 'Gemini API call did not return expected text. Full result (excluding potentially sensitive parts):', { 
                promptFeedback: result.promptFeedback, 
                candidates: result.candidates ? result.candidates.map(c => ({ finishReason: c.finishReason, safetyRatings: c.safetyRatings })) : null 
            });
            let errorMessage = "No valid response text from model with @google/genai.";
            if (result && result.candidates && result.candidates[0]) {
                const candidate = result.candidates[0];
                if (candidate.finishReason && candidate.finishReason !== "STOP") {
                     errorMessage = `Model generation stopped due to: ${candidate.finishReason}.`;
                     if (candidate.safetyRatings && candidate.safetyRatings.length > 0) {
                        const blockedCategories = candidate.safetyRatings
                            .filter(r => r.blocked || (r.probability && ['HIGH', 'MEDIUM'].includes(r.probability.toUpperCase())))
                            .map(r => r.category)
                            .join(', ');
                        if (blockedCategories) {
                            errorMessage += ` Potentially due to safety settings for: ${blockedCategories}.`;
                        }
                     }
                } else if (candidate.finishReason === "STOP" && !(result && typeof result.text === 'string' && result.text.trim() !== '')) {
                    // If finishReason is STOP but no text was found (e.g. model generated empty string)
                    // This case might mean an empty but valid response.
                    // The initial checks for `result.text` or candidate text should ideally catch valid empty strings.
                    // If we reach here, it's more likely an unexpected empty state.
                    errorMessage = "Model returned an empty response but was not explicitly blocked.";
                }
            } else if (result && result.promptFeedback && result.promptFeedback.blockReason) { 
                errorMessage = `Model generation blocked due to prompt: ${result.promptFeedback.blockReason}.`;
            }
            return { success: false, error: errorMessage, details: result };
        }

    } catch (error) {
        logger.error('MAIN', 'Gemini API call failed with @google/genai:', error.message, error.stack);
        let errorMessage = error.message;
        if (error.message && error.message.includes("Could not load the default credentials")) {
            errorMessage = "Authentication error: Could not load default credentials. Ensure API key is correct and SDK is instantiated properly with {apiKey: 'YOUR_KEY'}.";
        } else if (error.message && error.message.toLowerCase().includes("api key not valid")) {
            errorMessage = "Invalid API Key. Please check the key in your settings.";
        }
        return { success: false, error: errorMessage, details: error.toString() };
    }
});

function loadSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            logger.info('MAIN', 'Settings loaded successfully.');
            return JSON.parse(data);
        }
        logger.info('MAIN', 'No settings file found, using default settings.');
    } catch (error) {
        logger.error('MAIN', 'Failed to load settings, using defaults:', error);
    }
    // Default settings
    return {
        theme: 'default-dark',
        resolution: { width: 1280, height: 720 },
        apiKey: ''
    };
}

// Close logger on app quit
app.on('will-quit', () => {
    logger.info('MAIN', 'Application is about to quit.');
    logger.close();
});
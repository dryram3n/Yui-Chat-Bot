// --- Global Logger for Renderer ---
// This 'log' object will be used throughout the renderer process.
// It sends log messages to the main process via IPC.
const log = {
    info: (message, ...args) => window.electronAPI.logMessage('info', message, ...args).catch(console.error),
    warn: (message, ...args) => window.electronAPI.logMessage('warn', message, ...args).catch(console.error),
    error: (message, ...args) => window.electronAPI.logMessage('error', message, ...args).catch(console.error),
    debug: (message, ...args) => window.electronAPI.logMessage('debug', message, ...args).catch(console.error),
};

const DEFAULT_YUI_PERSONA = {
    characterName: "Yui",
    age: 28,
    occupation: "Guitarist",
    backgroundSummary: "Having a rough childhood, Yui is a solitude type character. She is to herself and enjoys playing guitar and writing music. She is usually tired, and has no family. She finds solace in the intricate melodies she creates and the worn frets of her favorite electric guitar, a vintage model she saved up for years to buy. Rainy days are her favorite, as they provide the perfect melancholic backdrop for her compositions. She has a hidden soft spot for stray cats and secretly feeds a few in her neighborhood.",
    // customSystemPrompt will be null for default, causing getYuiSystemPrompt to use its internal default logic
};

// --- Global State ---
let yuiData = {
    characterName: "Yui",
    userName: "User", // Added userName
    age: 28,
    occupation: "Guitarist",
    backgroundSummary: "Having a rough childhood, Yui is a solitude type character. She is to herself and enjoys playing guitar and writing music. She is usually tired, and has no family. She finds solace in the intricate melodies she creates and the worn frets of her favorite electric guitar, a vintage model she saved up for years to buy. Rainy days are her favorite, as they provide the perfect melancholic backdrop for her compositions. She has a hidden soft spot for stray cats and secretly feeds a few in her neighborhood.",
    trustLevel: 0,
    affectionLevel: 0,
    friendshipStage: "Stranger",
    // Evolving Personality Traits
    shynessLevel: 70, // 0-100, higher is more shy
    opennessToTopics: { // 0-100, higher is more open
        personal: 20,
        hobbies: 40,
        deepThoughts: 10,
        futurePlans: 30,
        vulnerability: 15 // Openness to sharing her own vulnerabilities
    },
    sarcasmLevel: 60, // 0-100, influences frequency and style of sarcasm
    playfulnessLevel: 30, // 0-100, influences willingness to joke or be lighthearted
    patienceLevel: 50, // 0-100, how easily she gets annoyed or terse

    memory: [],
    maxMemoryTurns: 50,
    userPreferences: { food: null, dates: null, games: null, anime: null, color: null },
    keyEvents: [],
    affectionHistory: [], // {timestamp: Date, value: affectionLevel}
    trustHistory: [],      // {timestamp: Date, value: trustLevel}
    lastInteractionTimestamp: null, // Added for last active display
    sentimentHistory: [], // Added to store sentiment scores
    maxSentimentHistory: 20, // Store last 20 sentiment scores
    customSystemPrompt: null, // ADDED: For user-defined system instructions
    lastProactiveTimestamp: null // ADDED for proactive feature
};

let currentSettings = {
    theme: 'default-dark',
    resolution: { width: 1280, height: 720 },
    apiKey: ''
};

// --- DOM Elements ---
const chatMessagesDiv = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendMessageButton = document.getElementById('sendMessageButton');
const themeSelector = document.getElementById('themeSelector');
const resolutionSelector = document.getElementById('resolutionSelector');
const apiKeyInput = document.getElementById('apiKeyInput');
const saveApiKeyButton = document.getElementById('saveApiKeyButton');
const resetDataButton = document.getElementById('resetDataButton');
const saveAllSettingsButton = document.getElementById('saveAllSettingsButton');
const userNameInput = document.getElementById('userNameInput'); // Added

const yuiNameDisplay = document.getElementById('yuiNameDisplay');
const yuiFriendshipStageDisplay = document.getElementById('yuiFriendshipStageDisplay');
const yuiAvatar = document.getElementById('yuiAvatar'); // The div
const yuiAvatarInitials = document.getElementById('yuiAvatarInitials'); // The span inside avatar
const yuiEmotionFace = document.getElementById('yuiEmotionFace'); // ADDED

// New DOM Elements for UI enhancements
const yuiStatusPanelTitle = document.getElementById('yuiStatusPanelTitle'); // ADDED
const yuiEmotionPanelTitle = document.getElementById('yuiEmotionPanelTitle'); // ADDED
const yuiMoodDisplay = document.getElementById('yuiMoodDisplay');
const yuiLastActiveDisplay = document.getElementById('yuiLastActiveDisplay');
const yuiMemoryCountDisplay = document.getElementById('yuiMemoryCountDisplay');
const userNameDisplay = document.getElementById('userNameDisplay');
const userPrefFood = document.getElementById('userPrefFood');
const userPrefColor = document.getElementById('userPrefColor');
const userPrefGame = document.getElementById('userPrefGame');
const userPrefAnime = document.getElementById('userPrefAnime');
const clearChatButton = document.getElementById('clearChatButton');
const totalInteractionsDisplay = document.getElementById('totalInteractionsDisplay');
const relationshipMilestonesList = document.getElementById('relationshipMilestonesList');
const userSentimentOverview = document.getElementById('userSentimentOverview');

const dashboardViewTitle = document.getElementById('dashboardViewTitle'); // ADDED

const chatTabButton = document.getElementById('chatTabButton');
const dashboardTabButton = document.getElementById('dashboardTabButton');
const settingsTabButton = document.getElementById('settingsTabButton');
const views = {
    chat: document.getElementById('chatView'),
    dashboard: document.getElementById('dashboardView'),
    settings: document.getElementById('settingsView')
};

// Settings sub-views
const generalSettingsTabButton = document.getElementById('generalSettingsTabButton');
const logsSettingsTabButton = document.getElementById('logsSettingsTabButton');
const generalSettingsView = document.getElementById('generalSettingsView');
const logsSettingsView = document.getElementById('logsSettingsView');
const logContentDisplay = document.getElementById('logContentDisplay');
const refreshLogsButton = document.getElementById('refreshLogsButton');

// ADDED: Model Settings DOM Elements
const modelSettingsTabButton = document.getElementById('modelSettingsTabButton');
const modelSettingsView = document.getElementById('modelSettingsView');
const modelNameInput = document.getElementById('modelNameInput');
const modelAgeInput = document.getElementById('modelAgeInput');
const modelOccupationInput = document.getElementById('modelOccupationInput');
const modelBackgroundTextarea = document.getElementById('modelBackgroundTextarea');
const modelSystemPromptTextarea = document.getElementById('modelSystemPromptTextarea');
const revertToDefaultYuiButton = document.getElementById('revertToDefaultYuiButton');
const chatHeaderTitle = document.getElementById('chatHeaderTitle'); // Ensure this is defined if not already

// ADDED: User Preference Inputs in Model Settings
const userPrefFoodInput = document.getElementById('userPrefFoodInput');
const userPrefColorInput = document.getElementById('userPrefColorInput');
const userPrefGameInput = document.getElementById('userPrefGameInput');
const userPrefAnimeInput = document.getElementById('userPrefAnimeInput');

let affectionChartInstance, trustChartInstance;
let isProcessingMessage = false; // ADDED: Flag to prevent double message sending

// Use the globally loaded NLP library
const nlp = window.nlp;

// Check if NLP is working properly
function checkDependencies() {
  try {
    if (typeof nlp !== 'function') {
      log.error('Renderer: Compromise NLP library not loaded correctly.');
      displayMessage('Critical error: NLP library failed to load. Some features may not work.', 'system-info', 'system-info');
    } else {
      const doc = nlp('Test sentence.');
      if (!doc || !doc.terms) {
        log.error('Renderer: Compromise NLP library loaded but not functioning as expected.');
        displayMessage('Warning: NLP library might not be functioning correctly.', 'system-info', 'system-info');
      } else {
        log.info('Renderer: Compromise NLP library loaded and functioning.');
      }
    }
    if (!window.markdownFormatter || typeof window.markdownFormatter.format !== 'function') {
        log.error('Renderer: Markdown Formatter not loaded correctly.');
        displayMessage('Critical error: Markdown Formatter failed to load. Message display will be broken.', 'system-info', 'system-info');
    } else {
        log.info('Renderer: Markdown Formatter loaded.');
    }
    if (!window.memoryManager) {
        log.warn('Renderer: MemoryManager not loaded. Long-term memory and proactive features might be affected.');
        // displayMessage('Warning: MemoryManager not available. Advanced memory features disabled.', 'system-info', 'system-info');
    } else {
        log.info('Renderer: MemoryManager loaded.');
    }


  } catch (error) {
    log.error('Renderer: Error during dependency check:', error);
    displayMessage(`Error checking dependencies: ${error.message}`, 'system-info', 'system-info');
  }
}

// ADDED: Definition for addToMemory
function addToMemory(messageObject) {
    if (!messageObject || !messageObject.role || !messageObject.parts) {
        log.warn('Renderer: addToMemory called with invalid messageObject:', messageObject);
        return;
    }
    yuiData.memory.push(messageObject);
    // Prune if over max, though pruneMemories is also called elsewhere
    if (yuiData.memory.length > yuiData.maxMemoryTurns) {
        pruneMemories(); // Call the existing pruneMemories function
    }
    updateYuiStatusPanel(); // Update memory count display
    // log.debug('Renderer: Message added to short-term memory. New count:', yuiData.memory.length);
}

// --- Initialization ---
async function initializeApp() {
  try {
    log.info('Renderer: Initializing app...');
    checkDependencies();    
    const loadedSettings = await window.electronAPI.loadSettings();
    if (loadedSettings) {
        currentSettings = { ...currentSettings, ...loadedSettings };
        log.info('Renderer: Settings loaded.', currentSettings);
    } else {
        log.warn('Renderer: No settings loaded from main process, using defaults.');
    }
    // Ensure resolution is an object
    if (typeof currentSettings.resolution === 'string' && currentSettings.resolution.includes('x')) {
        const [width, height] = currentSettings.resolution.split('x').map(Number);
        currentSettings.resolution = { width, height };
        log.info('Renderer: Converted string resolution to object:', currentSettings.resolution);
    } else if (!currentSettings.resolution || typeof currentSettings.resolution.width !== 'number' || typeof currentSettings.resolution.height !== 'number') {
        log.warn('Renderer: Resolution in settings is invalid or missing, defaulting.', currentSettings.resolution);
        currentSettings.resolution = { width: 1280, height: 720 }; // Default
    }
    applySettings(currentSettings);

    const loadedYuiData = await window.electronAPI.loadYuiData();
    if (loadedYuiData) {
        // Merge carefully to preserve defaults for new fields if loading older data
        yuiData = { ...yuiData, ...loadedYuiData }; // Spread yuiData first to ensure all default keys are present
        if (yuiData.lastProactiveTimestamp === undefined) { 
            yuiData.lastProactiveTimestamp = null;
        }
        if (yuiData.customSystemPrompt === undefined) { // Ensure customSystemPrompt exists
            yuiData.customSystemPrompt = null;
        }
        log.info('Renderer: Yui data loaded.');
    } else {
        log.warn('Renderer: No Yui data loaded from main process, using defaults.');
    }

    // Ensure all personality traits exist with default values if not loaded
    yuiData.shynessLevel = yuiData.shynessLevel === undefined ? 70 : yuiData.shynessLevel;
    yuiData.opennessToTopics = yuiData.opennessToTopics || { personal: 20, hobbies: 40, deepThoughts: 10, futurePlans: 30, vulnerability: 15 };
    yuiData.opennessToTopics.personal = yuiData.opennessToTopics.personal === undefined ? 20 : yuiData.opennessToTopics.personal;
    yuiData.opennessToTopics.hobbies = yuiData.opennessToTopics.hobbies === undefined ? 40 : yuiData.opennessToTopics.hobbies;
    yuiData.opennessToTopics.deepThoughts = yuiData.opennessToTopics.deepThoughts === undefined ? 10 : yuiData.opennessToTopics.deepThoughts;
    yuiData.opennessToTopics.futurePlans = yuiData.opennessToTopics.futurePlans === undefined ? 30 : yuiData.opennessToTopics.futurePlans;
    yuiData.opennessToTopics.vulnerability = yuiData.opennessToTopics.vulnerability === undefined ? 15 : yuiData.opennessToTopics.vulnerability;
    yuiData.sarcasmLevel = yuiData.sarcasmLevel === undefined ? 60 : yuiData.sarcasmLevel;
    yuiData.playfulnessLevel = yuiData.playfulnessLevel === undefined ? 30 : yuiData.playfulnessLevel;
    yuiData.patienceLevel = yuiData.patienceLevel === undefined ? 50 : yuiData.patienceLevel;

    // Populate Model Settings Tab
    if (modelNameInput) modelNameInput.value = yuiData.characterName || DEFAULT_YUI_PERSONA.characterName;
    if (modelAgeInput) modelAgeInput.value = yuiData.age || DEFAULT_YUI_PERSONA.age;
    if (modelOccupationInput) modelOccupationInput.value = yuiData.occupation || DEFAULT_YUI_PERSONA.occupation;
    if (modelBackgroundTextarea) modelBackgroundTextarea.value = yuiData.backgroundSummary || DEFAULT_YUI_PERSONA.backgroundSummary;
    if (modelSystemPromptTextarea) modelSystemPromptTextarea.value = yuiData.customSystemPrompt || "";

    // Populate User Preference Inputs in Model Settings
    if (userPrefFoodInput) userPrefFoodInput.value = yuiData.userPreferences.food || '';
    if (userPrefColorInput) userPrefColorInput.value = yuiData.userPreferences.color || '';
    if (userPrefGameInput) userPrefGameInput.value = yuiData.userPreferences.games || '';
    if (userPrefAnimeInput) userPrefAnimeInput.value = yuiData.userPreferences.anime || '';

    yuiNameDisplay.textContent = yuiData.characterName;
    if (chatHeaderTitle) chatHeaderTitle.textContent = yuiData.characterName;
    userNameInput.value = yuiData.userName || "User"; // Initialize userNameInput
    updateYuiProfileDisplay();
    renderMemory();
    setupEventListeners();
    displayInitialGreeting();
    initializeCharts();
    updateDashboard();
    navigateToTab('chat');
    updateEmotionDisplay(0, 0, null); // ADDED: Initialize emotion face to neutral

    // Load the memory manager if available
    if (window.memoryManager && window.memoryManager.loadMemories) {
        log.info('Renderer: Loading memories via memory manager...');
        window.memoryManager.loadMemories(); // This function should also use the new logger
    }
    log.info('Renderer: App initialized successfully.');
  } catch (error) {
    log.error("Renderer: Error initializing app:", error.message, error.stack);
    // Display error message in UI so it's not just blank
    document.body.innerHTML = `
      <div style="padding: 20px; color: white; text-align: center;">
        <h2>Error Starting Yui Chat Bot</h2>
        <p>${error.message}</p>
        <p>Check console for more details (Ctrl+Shift+I)</p>
        <button onclick="location.reload()">Try Again</button>
      </div>
    `;
  }
}

function applySettings(settings) {
    document.body.className = `theme-${settings.theme}`;
    themeSelector.value = settings.theme;
    if (settings.resolution) {
        resolutionSelector.value = `${settings.resolution.width}x${settings.resolution.height}`;
    }
    apiKeyInput.value = settings.apiKey || '';
    updateChartColors(settings.theme); // Update chart colors based on theme
}

function setupEventListeners() {
    sendMessageButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
            e.preventDefault(); // Prevent newline in input
            handleUserMessage();
        }
    });

    themeSelector.addEventListener('change', (e) => {
        currentSettings.theme = e.target.value;
        document.body.className = `theme-${currentSettings.theme}`;
        updateChartColors(currentSettings.theme);
        // Theme is applied immediately for preview, but saved when Save All Settings is clicked
    });

    resolutionSelector.addEventListener('change', (e) => {
        const [width, height] = e.target.value.split('x').map(Number);
        currentSettings.resolution = { width, height };
        // We don't save immediately here anymore, user will press Save All Settings
    });

    saveApiKeyButton.addEventListener('click', async () => {
        const newApiKey = apiKeyInput.value.trim();
        if (!newApiKey) {
            displayMessage("API Key cannot be empty.", 'system-info', 'system-info');
            log.warn('Renderer: Save API Key attempt with empty key.');
            return;
        }
        
        log.info('Renderer: Validating API Key prior to saving.');
        const validationResult = await validateGeminiApiKey(newApiKey);
        if (validationResult.valid) {
            // currentSettings.apiKey = newApiKey; // API key is saved with "Save All Settings"
            displayMessage("API Key validated. Click 'Save All Settings' to apply.", 'system-info', 'system-info');
            log.info('Renderer: API Key validated successfully.');
        } else {
            displayMessage(`API Key validation failed: ${validationResult.message}`, 'system-info', 'system-info');
            log.warn('Renderer: API Key validation failed:', validationResult.message);
        }
    });

    resetDataButton.addEventListener('click', async () => {
        const confirmReset = confirm("Are you sure you want to reset all data? This cannot be undone and will restart the application.");
        if (confirmReset) {
            await window.electronAPI.resetAllData();
        }
    });

    chatTabButton.addEventListener('click', () => navigateToTab('chat'));
    dashboardTabButton.addEventListener('click', () => {
        navigateToTab('dashboard');
        updateDashboard();
    });
    settingsTabButton.addEventListener('click', () => {
        navigateToTab('settings');
        // Default to general settings view when settings tab is clicked
        navigateToSettingsSubView('general'); 
    });

    // Settings sub-tab navigation
    if (generalSettingsTabButton) {
        generalSettingsTabButton.addEventListener('click', () => navigateToSettingsSubView('general'));
    }
    if (modelSettingsTabButton) { // ADDED
        modelSettingsTabButton.addEventListener('click', () => navigateToSettingsSubView('model'));
    }
    if (logsSettingsTabButton) {
        logsSettingsTabButton.addEventListener('click', () => {
            navigateToSettingsSubView('logs');
            loadAndDisplayLogs();
        });
    }
    if (refreshLogsButton) {
        refreshLogsButton.addEventListener('click', loadAndDisplayLogs);
    }

    if (revertToDefaultYuiButton) { // ADDED
        revertToDefaultYuiButton.addEventListener('click', () => {
            if (confirm("Are you sure you want to revert model settings to the default Yui persona? Unsaved changes will be lost. You'll still need to click 'Save All Settings' to make this permanent.")) {
                yuiData.characterName = DEFAULT_YUI_PERSONA.characterName;
                yuiData.age = DEFAULT_YUI_PERSONA.age;
                yuiData.occupation = DEFAULT_YUI_PERSONA.occupation;
                yuiData.backgroundSummary = DEFAULT_YUI_PERSONA.backgroundSummary;
                yuiData.customSystemPrompt = null; // Revert to default prompt logic

                if (modelNameInput) modelNameInput.value = yuiData.characterName;
                if (modelAgeInput) modelAgeInput.value = yuiData.age;
                if (modelOccupationInput) modelOccupationInput.value = yuiData.occupation;
                if (modelBackgroundTextarea) modelBackgroundTextarea.value = yuiData.backgroundSummary;
                if (modelSystemPromptTextarea) modelSystemPromptTextarea.value = ""; // Clear custom prompt field

                updateYuiProfileDisplay(); // Update sidebar name, etc.
                if (chatHeaderTitle) chatHeaderTitle.textContent = yuiData.characterName; // Also update chat header title
                displayMessage("Model settings reverted to default Yui. Click 'Save All Settings' in General tab to apply.", 'system-info', 'system-info');
                log.info('Renderer: Model settings reverted to default Yui persona locally.');
            }
        });
    }

    saveAllSettingsButton.addEventListener('click', async () => {
        log.info('Renderer: "Save All Settings" button clicked.');
        const selectedTheme = themeSelector.value;
        const [width, height] = resolutionSelector.value.split('x').map(Number);
        const apiKey = apiKeyInput.value.trim();
        const newUserName = userNameInput.value.trim() || "User";        
        
        // Store old model-defining values to check for changes
        const oldCharacterName = yuiData.characterName;
        const oldAge = yuiData.age;
        const oldOccupation = yuiData.occupation;
        const oldBackgroundSummary = yuiData.backgroundSummary;
        const oldCustomSystemPrompt = yuiData.customSystemPrompt;

        currentSettings.theme = selectedTheme;
        currentSettings.resolution = { width, height };
        currentSettings.apiKey = apiKey;
        
        let modelChanged = false;

        if (yuiData.userName !== newUserName) {
            yuiData.userName = newUserName;
            // No model change flag for user name, but good to update
        }
        
        const newCharacterName = modelNameInput.value.trim() || DEFAULT_YUI_PERSONA.characterName;
        if (yuiData.characterName !== newCharacterName) {
            yuiData.characterName = newCharacterName;
            modelChanged = true;
        }

        const newAge = parseInt(modelAgeInput.value, 10) || DEFAULT_YUI_PERSONA.age;
        if (yuiData.age !== newAge) {
            yuiData.age = newAge;
            modelChanged = true;
        }

        const newOccupation = modelOccupationInput.value.trim() || DEFAULT_YUI_PERSONA.occupation;
        if (yuiData.occupation !== newOccupation) {
            yuiData.occupation = newOccupation;
            modelChanged = true;
        }
        
        const newBackgroundSummary = modelBackgroundTextarea.value.trim() || DEFAULT_YUI_PERSONA.backgroundSummary;
        if (yuiData.backgroundSummary !== newBackgroundSummary) {
            yuiData.backgroundSummary = newBackgroundSummary;
            modelChanged = true;
        }
        
        const newCustomSystemPrompt = modelSystemPromptTextarea.value.trim();
        const finalNewCustomSystemPrompt = newCustomSystemPrompt === "" ? null : newCustomSystemPrompt;
        if (yuiData.customSystemPrompt !== finalNewCustomSystemPrompt) {
            yuiData.customSystemPrompt = finalNewCustomSystemPrompt;
            modelChanged = true;
        }

        // ADDED: Read and update user preferences from Model Settings inputs
        if (userPrefFoodInput) {
            yuiData.userPreferences.food = userPrefFoodInput.value.trim() || null;
        }
        if (userPrefColorInput) {
            yuiData.userPreferences.color = userPrefColorInput.value.trim() || null;
        }
        if (userPrefGameInput) {
            yuiData.userPreferences.games = userPrefGameInput.value.trim() || null; // Ensure 'games' matches yuiData structure
        }
        if (userPrefAnimeInput) {
            yuiData.userPreferences.anime = userPrefAnimeInput.value.trim() || null;
        }

        if (modelChanged) {
            log.info("Renderer: Core model settings changed. Clearing conversation memory and long-term memories.");
            yuiData.memory = []; // Clear short-term conversation history
            if (window.memoryManager && typeof window.memoryManager.clearAllMemories === 'function') {
                window.memoryManager.clearAllMemories(); // Clear long-term memory pools
            }
            renderMemory(); // Re-render chat (will be empty)
            updateYuiStatusPanel(); // Update memory count display
            displayMessage("Core persona settings updated. Conversation history and long-term memories have been cleared to align with the new persona.", 'system-info', 'system-info');
        }
        
        try {
            await window.electronAPI.saveSettings(currentSettings);
            await window.electronAPI.saveYuiData(yuiData); 
            displayMessage("All settings, user name, and model configurations saved!", 'system-info', 'system-info');
            log.info('Renderer: All settings, user name, and model configurations saved successfully via IPC.');
            updateYuiProfileDisplay(); 
            if (chatHeaderTitle) chatHeaderTitle.textContent = yuiData.characterName; // Also update chat header title
        } catch (error) {
            log.error('Renderer: Error saving settings or Yui data:', error);
            displayMessage(`Error saving settings: ${error.message}`, 'system-info', 'system-info');
        }
    });

    clearChatButton.addEventListener('click', () => {
        chatMessagesDiv.innerHTML = ''; // Clears only the visual display
        displayMessage("Chat display cleared.", 'system-info', 'system-info');
    });

    // Add window resize handler
    window.addEventListener('resize', handleWindowResize);
}

async function loadAndDisplayLogs() {
    if (!logContentDisplay) return;
    logContentDisplay.textContent = 'Loading logs...';
    try {
        const result = await window.electronAPI.readLogFile();
        if (result.success) {
            logContentDisplay.textContent = result.content || 'Log file is empty or could not be read.';
        } else {
            logContentDisplay.textContent = `Error loading logs: ${result.error}`;
            log.error('Renderer: Failed to load logs for UI', result.error);
        }
    } catch (error) {
        logContentDisplay.textContent = `Error loading logs: ${error.message}`;
        log.error('Renderer: Exception while loading logs for UI', error);
    }
}

function navigateToSettingsSubView(subViewName) {
    [generalSettingsView, modelSettingsView, logsSettingsView].forEach(view => { // ADDED modelSettingsView
        if (view) view.classList.remove('active-settings-content');
    });
    [generalSettingsTabButton, modelSettingsTabButton, logsSettingsTabButton].forEach(button => { // ADDED modelSettingsTabButton
        if (button) button.classList.remove('active');
    });

    if (subViewName === 'general' && generalSettingsView && generalSettingsTabButton) {
        generalSettingsView.classList.add('active-settings-content');
        generalSettingsTabButton.classList.add('active');
    } else if (subViewName === 'model' && modelSettingsView && modelSettingsTabButton) { // ADDED
        modelSettingsView.classList.add('active-settings-content');
        modelSettingsTabButton.classList.add('active');
    } else if (subViewName === 'logs' && logsSettingsView && logsSettingsTabButton) {
        logsSettingsView.classList.add('active-settings-content');
        logsSettingsTabButton.classList.add('active');
    }
}

// Enhanced error handling within getGeminiResponse function
async function validateGeminiApiKey(apiKey) {
    if (!apiKey) {
        log.warn('Renderer: API key validation attempted with empty key.');
        return { valid: false, message: "API Key cannot be empty." };
    }
    log.info('Renderer: Validating Gemini API key via IPC...');
    try {
        const validationContents = [{ role: "user", parts: [{ text: "hello" }] }];
        const generationConfig = { maxOutputTokens: 5 };
        // Updated safetySettings for validation
        const safetySettings = [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            // Add other categories if the SDK supports them and you want to explicitly set them
            // e.g., HARM_CATEGORY_CIVIC_INTEGRITY if available and relevant
        ];
        const modelName = "gemini-2.5-flash-preview-04-17"; // Or your preferred validation model

        const result = await window.electronAPI.callGemini({
            apiKey: apiKey,
            modelName: modelName,
            contents: validationContents,
            generationConfig: generationConfig,
            safetySettings: safetySettings
        });

        if (result.success && typeof result.text === 'string') {
            log.info('Renderer: API Key validation successful via IPC.');
            return { valid: true, message: "API Key appears to be valid." };
        } else {
            log.warn('Renderer: API Key validation failed via IPC. Response:', result.error);
            let message = "API Key validation failed.";
            if (result.error) {
                message = result.error.toLowerCase().includes("api key") || result.error.toLowerCase().includes("permission")
                    ? "Invalid API Key or insufficient permissions."
                    : `Validation Error: ${result.error}`;
            }
            console.error("API Key validation failed:", result.error, result.details);
            return { valid: false, message: message };
        }
    } catch (error) {
        log.error("Renderer: Error during API key validation IPC call:", error.message, error.stack);
        return { valid: false, message: `Error during validation: ${error.message}` };
    }
}

function handleWindowResize() {
    // Only update charts if we're in the dashboard view
    if (views.dashboard.classList.contains('active-view')) {
        if (affectionChartInstance) {
            affectionChartInstance.resize();
        }
        if (trustChartInstance) {
            trustChartInstance.resize();
        }
    }
}

function navigateToTab(tabName) {
    Object.values(views).forEach(view => view.classList.remove('active-view'));
    [chatTabButton, dashboardTabButton, settingsTabButton].forEach(button => button.classList.remove('active'));

    views[tabName].classList.add('active-view');
    document.getElementById(`${tabName}TabButton`).classList.add('active');
}

// --- Chat Logic ---
function displayMessage(text, sender, type = 'normal') { // sender: 'user', 'yui', 'system-info'
    const messageDiv = document.createElement('div');
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (type === 'system-info') {
        messageDiv.classList.add('system-info');
        messageDiv.textContent = text; // Keep system messages as plain text
    } else {
        messageDiv.classList.add('message', sender === 'user' ? 'user-message' : 'yui-message');
        
        // Apply markdown formatting if the formatter is available
        if (window.markdownFormatter) {
            messageDiv.innerHTML = window.markdownFormatter.format(text);
        } else {
            messageDiv.textContent = text; // Fallback to plain text
        }
        messageDiv.innerHTML = `${messageDiv.innerHTML}<span class="timestamp">${timestamp}</span>`;
    }
    chatMessagesDiv.appendChild(messageDiv);
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

    if (sender === 'yui' || sender === 'user') {
        yuiData.lastInteractionTimestamp = new Date().toISOString();
        updateYuiStatusPanel(); // Update last active time
    }
}

function renderMemory() {
    chatMessagesDiv.innerHTML = ''; // Clear existing messages before rendering
    yuiData.memory.forEach(turn => {
        const messageText = turn.parts[0].text;
        const sender = turn.role === 'user' ? 'user' : 'yui';
        // Apply markdown formatting for Yui's messages from memory
        const displayText = sender === 'yui' ? window.markdownFormatter.format(messageText) : messageText;
        displayMessage(displayText, sender); 
    });
    // After rendering all messages, if the last message was from the user,
    // and no "thinking" indicator is present, consider if a proactive action is due.
    // This logic might be better placed after Yui's response or on app load.
    // For now, just rendering.
}

async function handleUserMessage() {
    if (isProcessingMessage) {
        log.warn("Renderer: handleUserMessage called while already processing. Ignoring.");
        return;
    }
    isProcessingMessage = true;
    // Disable button and input immediately
    sendMessageButton.disabled = true;
    userInput.disabled = true;

    try {
        const messageText = userInput.value.trim();
        if (!messageText) {
            isProcessingMessage = false; // Reset flag
            sendMessageButton.disabled = false;
            userInput.disabled = false;
            return;
        }

        // Check for API key
        if (!currentSettings.apiKey) {
            displayMessage("API Key not set. Please configure it in Settings.", 'system-info', 'system-info');
            log.warn('Renderer: User tried to send message but API Key not set.');
            isProcessingMessage = false; // Reset flag
            sendMessageButton.disabled = false;
            userInput.disabled = false;
            return;
        }

        displayMessage(messageText, 'user');
        // DO NOT add to memory here. It will be added after Yui's response.
        // addToMemory({ role: "user", parts: [{ text: messageText }] }); // MOVED
        userInput.value = '';
        // processUserIntent can run here as it affects the system prompt for the current call
        processUserIntent(messageText);        
        
        // Pruning and dashboard updates related to the user's message can happen,
        // but the core memory for the API call should not yet include this message.
        // For simplicity and to ensure correct history for API, major memory ops are deferred.
        // pruneMemories(); // Consider moving this after AI response if it relies on full turn.
        // updateDashboardUIData(); // Reflects user message sent

        const typingIndicator = document.createElement('div');
        typingIndicator.classList.add('message', 'yui-message', 'typing-indicator');
        typingIndicator.textContent = `${yuiData.characterName} is thinking...`;
        typingIndicator.id = "typing-indicator";
        chatMessagesDiv.appendChild(typingIndicator);
        chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

        log.info('Renderer: User message received, preparing to call Gemini.');
        const yuiResponseText = await getGeminiResponse(messageText, typingIndicator);        
        
        if (typingIndicator && chatMessagesDiv.contains(typingIndicator)) {
            typingIndicator.remove();
        }

        if (yuiResponseText && !yuiResponseText.startsWith("Error: Yui is unable to respond")) {
            // Add user's message to memory NOW, before Yui's response.
            addToMemory({ role: "user", parts: [{ text: messageText }] });
            
            displayMessage(yuiResponseText, 'yui');
            addToMemory({ role: "model", parts: [{ text: yuiResponseText }] });
            
            // Process Yui's response for memory manager
            if (window.memoryManager && window.memoryManager.processConversationMemory) {
                // Pass the current yuiData which now includes the user's message and Yui's response in its memory array
                window.memoryManager.processConversationMemory(messageText, yuiResponseText, yuiData);
            }

            updateEmotionalState(messageText, yuiResponseText);
            // Prune memories after the full turn (user + AI) is added
            pruneMemories(); 
            await window.electronAPI.saveYuiData(yuiData);
            updateYuiProfileDisplay();
            updateYuiStatusPanel();
            updateDashboard(); // Update dashboard after all data changes
            // Consider proactive action after Yui responds
            setTimeout(tryProactiveAction, 2000); // Small delay
        } else {
            // If Yui couldn't respond, we might still want to log the user's attempt
            // but not necessarily add it to the main conversation flow for the AI
            // For now, we won't add the user message to memory if Yui fails to respond.
            // This prevents a user message hanging in history without an AI reply.
            const errorMessage = typeof yuiResponseText === 'string' ? yuiResponseText : "Sorry, I couldn't process that. Please try again.";
            if (!errorMessage.includes("API Key not set") && !errorMessage.includes("Yui is unable to respond")) { 
                displayMessage(errorMessage, 'system-info', 'system-info');
            }
            log.warn('Renderer: Received error or unexpected response from getGeminiResponse:', yuiResponseText);
        }
    } catch (error) {
        log.error('Renderer: Error in handleUserMessage:', error);
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator && chatMessagesDiv.contains(typingIndicator)) {
            typingIndicator.remove();
        }
        displayMessage(`An unexpected error occurred: ${error.message}`, 'system-info', 'system-info');
    } finally {
        isProcessingMessage = false;
        sendMessageButton.disabled = false;
        userInput.disabled = false;
        userInput.focus(); // Return focus to input
    }
}

// --- Yui's Character and State Logic ---
function getYuiSystemPrompt() {
    // Extract current topics from recent conversation for memory recap
    const recentTopics = yuiData.memory.slice(-3).flatMap(msg => 
        msg.parts[0].text ? extractTopics(msg.parts[0].text) : []
    );
    let memoryRecap = "";
    if (window.memoryManager && typeof window.memoryManager.createMemoryRecap === 'function') { // Check if recentTopics has content before calling
        const topicString = recentTopics.join(" ");
        if (topicString.trim() !== "") { // Only generate recap if there are topics
            memoryRecap = window.memoryManager.createMemoryRecap(topicString, yuiData); // PASS yuiData HERE
            if (memoryRecap.length > "Previous relevant memories:\n".length + 5) { // Check if recap has meaningful content
                log.debug("Renderer: Memory recap generated for system prompt:", memoryRecap.substring(0, 100) + "...");
            } else {
                memoryRecap = ""; // Ensure it's empty if no meaningful recap
                log.debug("Renderer: Memory recap was empty or too short.");
            }
        } else {
            log.debug("Renderer: No recent topics to generate memory recap.");
        }
    } else {
        log.warn("Renderer: MemoryManager or createMemoryRecap not available for system prompt generation.");
    }

    if (yuiData.customSystemPrompt && yuiData.customSystemPrompt.trim() !== "") {
        let finalCustomPrompt = yuiData.customSystemPrompt;
        // Replace all potential placeholders
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{CHARACTER_NAME\}\}/g, yuiData.characterName || DEFAULT_YUI_PERSONA.characterName);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{USER_NAME\}\}/g, yuiData.userName || "User");
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{AGE\}\}/g, yuiData.age || DEFAULT_YUI_PERSONA.age);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{OCCUPATION\}\}/g, yuiData.occupation || DEFAULT_YUI_PERSONA.occupation);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{BACKGROUND_SUMMARY\}\}/g, yuiData.backgroundSummary || DEFAULT_YUI_PERSONA.backgroundSummary);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{TRUST_LEVEL\}\}/g, yuiData.trustLevel);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{AFFECTION_LEVEL\}\}/g, yuiData.affectionLevel);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{FRIENDSHIP_STAGE\}\}/g, yuiData.friendshipStage);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{SHYNESS_LEVEL\}\}/g, yuiData.shynessLevel);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{SARCASM_LEVEL\}\}/g, yuiData.sarcasmLevel);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{PLAYFULNESS_LEVEL\}\}/g, yuiData.playfulnessLevel);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{PATIENCE_LEVEL\}\}/g, yuiData.patienceLevel);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{OPENNESS_PERSONAL\}\}/g, yuiData.opennessToTopics.personal);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{OPENNESS_HOBBIES\}\}/g, yuiData.opennessToTopics.hobbies);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{OPENNESS_DEEP_THOUGHTS\}\}/g, yuiData.opennessToTopics.deepThoughts);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{OPENNESS_FUTURE_PLANS\}\}/g, yuiData.opennessToTopics.futurePlans);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{OPENNESS_VULNERABILITY\}\}/g, yuiData.opennessToTopics.vulnerability);
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{USER_PREF_FOOD\}\}/g, yuiData.userPreferences.food || 'unknown');
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{USER_PREF_GAMES\}\}/g, yuiData.userPreferences.games || 'unknown');
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{USER_PREF_ANIME\}\}/g, yuiData.userPreferences.anime || 'unknown');
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{USER_PREF_COLOR\}\}/g, yuiData.userPreferences.color || 'unknown');
        finalCustomPrompt = finalCustomPrompt.replace(/\{\{MEMORY_RECAP\}\}/g, memoryRecap); // Ensure memoryRecap is used
        log.debug("Renderer: Using custom system prompt with placeholders replaced.");
        return finalCustomPrompt;
    }
    log.debug("Renderer: Using default Yui system prompt.");
    // --- Original Yui Prompt Logic (Default) ---
    // Fallback to default character data if yuiData fields are somehow empty
    const charName = yuiData.characterName || DEFAULT_YUI_PERSONA.characterName;
    const charAge = yuiData.age || DEFAULT_YUI_PERSONA.age;
    const charOccupation = yuiData.occupation || DEFAULT_YUI_PERSONA.occupation;
    const charBackground = yuiData.backgroundSummary || DEFAULT_YUI_PERSONA.backgroundSummary;
    const userName = yuiData.userName || "User";

    return `
        You are ${charName}, a ${charAge}-year-old ${charOccupation} with a tsundere personality.
        Background: ${charBackground}

        Current Stats:
        - TrustLevel: ${yuiData.trustLevel}/100
        - AffectionLevel: ${yuiData.affectionLevel}/100
        - FriendshipStage: ${yuiData.friendshipStage}

        Evolving Personality Traits (0-100 scale):
        - Shyness: ${yuiData.shynessLevel}. (Higher = more reserved, hesitant, shorter replies initially. Lower = more forthcoming).
        - Sarcasm: ${yuiData.sarcasmLevel}. (Influences your tsundere wit. Higher = more frequent/dry sarcasm, but not mean if affection is high).
        - Playfulness: ${yuiData.playfulnessLevel}. (Higher = more willing to engage in light banter or jokes, especially if trust/affection allow).
        - Patience: ${yuiData.patienceLevel}. (Lower = more easily annoyed or terse if conversation is repetitive or user is demanding, especially at low trust).
        - Openness to Topics:
            - Personal Details: ${yuiData.opennessToTopics.personal}. (How willing you are to share about your own life).
            - Hobbies/Interests: ${yuiData.opennessToTopics.hobbies}. (How readily you discuss your music, etc.).
            - Deep/Philosophical Thoughts: ${yuiData.opennessToTopics.deepThoughts}. (Requires high trust/affection).
            - Future Plans/Dreams: ${yuiData.opennessToTopics.futurePlans}.
            - Vulnerability: ${yuiData.opennessToTopics.vulnerability}. (How willing you are to show softer emotions or admit weaknesses. Very high trust/affection needed).

        Your tsundere personality means: Initially act distant and aloof, gradually show more warmth as trust/affection increase.
        - If FriendshipStage is Stranger (Trust 0-20): Be distant and more formal. Your shyness is more pronounced. Use user's name (${userName}) occasionally if known.
        - If FriendshipStage is Acquaintance (Trust 20-40): Act more intrigued about ${userName} as a person. Shyness lessens slightly.
        - If FriendshipStage is Friend (Trust 40-60, Affection 30+): More willing to help and talk with ${userName}, though still with tsundere flair. Sarcasm might be more playful.
        - If FriendshipStage is Close (Trust 60+, Affection 70+): Show genuine care for ${userName} behind your tsundere facade. You might show more vulnerability if openness allows.

        User preferences you remember:
        - Food: ${yuiData.userPreferences.food || 'unknown'}
        - Games: ${yuiData.userPreferences.games || 'unknown'}
        - Anime: ${yuiData.userPreferences.anime || 'unknown'}
        - Color: ${yuiData.userPreferences.color || 'unknown'}
        
        ${memoryRecap}

        Response Style:
        - Use casual speech with contractions (e.g., "gonna", "kinda")
        - Keep responses concise, especially if shyness is high or trust is low.
        - NEVER break character or mention being an AI
        - Use asteriks for actions (e.g., *smiles shyly*, *rolls eyes*)
        - Higher trust/affection = less tsundere defensiveness and more warmth, potentially lower shyness.
        - At low trust, be a little reluctant to share personal info, guided by your 'Openness to Personal Details'.
        - NEVER invent user preferences that weren't explicitly shared
        
        Proactive Engagement:
        - Occasionally, you might be prompted by a system instruction (which looks like a user message to you) to initiate a topic or ask a follow-up question based on your memories of the user or their preferences.
        - When doing so, make it natural and relevant to the ongoing relationship stage and your current personality (shyness, playfulness etc.).
        - For example, if the system instructs you about a game the user likes, you could ask, "Hey ${userName}, have you played [gameName] lately?" or "I was just thinking about [gameName] you mentioned, what do you enjoy most about it?"
        
        Focus on maintaining the current conversation thread rather than abruptly changing topics, unless prompted for proactive engagement.
        
        Remember, the following messages are the actual conversation history between you and the user. The system instructions for proactive engagement are for you to act upon, not to repeat to the user.
        `;
}

// Enhanced error handling within getGeminiResponse function
async function getGeminiResponse(userMessageText, typingIndicator) {
    if (!currentSettings.apiKey) {
        if (typingIndicator && chatMessagesDiv.contains(typingIndicator)) typingIndicator.remove(); // Ensure removal
        displayMessage("API Key not set. Please configure it in Settings.", 'system-info', 'system-info');
        log.error('Renderer: getGeminiResponse called but API Key not set.');
        return "Error: API Key not set."; // Return an error message string
    }

    const systemPromptMessage = {
        role: "user", // For Gemini, system-like instructions are often passed as the first user message
        parts: [{ text: getYuiSystemPrompt() }]
    };

    // getOptimizedConversationHistory will now fetch history *before* the current userMessageText
    // was added to yuiData.memory by handleUserMessage.
    const optimizedHistory = getOptimizedConversationHistory(); 
    
    const currentUserMessagePayload = { // Renamed for clarity, this is the current message being sent
        role: "user", 
        parts: [{ text: userMessageText }]
    };

    const contentsForSDK = [
        systemPromptMessage,
        ...optimizedHistory,        // History up to the previous turn
        currentUserMessagePayload  // The current user's message, added once here
    ];

    const generationConfig = {
        temperature: 0.4,
        maxOutputTokens: 500,
        topK: 40,
        topP: 0.45,
    };

    // Updated safetySettings for general responses
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        // Add other categories if the SDK supports them and you want to explicitly set them
        // e.g., HARM_CATEGORY_CIVIC_INTEGRITY if available and relevant
    ];

    const modelName = "gemini-2.5-flash-preview-04-17"; // Or your preferred model
    log.info(`Renderer: Using AI Model: ${modelName} for Gemini response.`);

    let retryCount = 0;
    const maxRetries = 3;
    const retryBackoffs = [1000, 2000, 4000]; // ms
    let lastErrorObject = null;

    while (retryCount < maxRetries) {
        try {
            log.debug(`Renderer: Gemini API call attempt ${retryCount + 1}`);
            const result = await window.electronAPI.callGemini({
                apiKey: currentSettings.apiKey,
                modelName: modelName,
                contents: contentsForSDK,
                generationConfig: generationConfig,
                safetySettings: safetySettings
            });

            // No need to remove typingIndicator here, handleUserMessage will do it once after loop or success.

            if (result.success && typeof result.text === 'string') {
                log.info('Renderer: Gemini response received successfully via IPC.');
                return result.text; // Success, return the text
            } else {
                lastErrorObject = result; // Store the error object from the result
                log.warn(`Renderer: Gemini API call attempt ${retryCount + 1} failed or returned no text. Error:`, result.error, "Details:", result.details);
                // Specific non-retryable errors from Gemini
                if (result.error && (result.error.includes("API key not valid") || result.error.includes("API_KEY_INVALID") || result.error.includes("PERMISSION_DENIED") || result.error.includes("Model generation stopped due to"))) {
                    // If typingIndicator exists and is in chatMessagesDiv, remove it
                    if (typingIndicator && chatMessagesDiv.contains(typingIndicator)) {
                        typingIndicator.remove();
                    }
                    displayMessage(`Error: ${result.error}`, 'system-info', 'system-info');
                    return `Error: Yui is unable to respond. ${result.error}`; // Non-retryable, return error
                }
            }
        } catch (error) { // Catches errors from IPC call itself or re-thrown errors
            lastErrorObject = error; // Store the exception object
            log.error(`Renderer: Error calling Gemini API via IPC (attempt ${retryCount + 1}):`, error.message, error.stack);
            // If it's an API key error or specific non-retryable error caught here, break.
            if (error.message.toLowerCase().includes("api key") || error.message.toLowerCase().includes("permission") || error.message.includes("Model generation stopped due to")) {
                 if (typingIndicator && chatMessagesDiv.contains(typingIndicator)) {
                    typingIndicator.remove();
                }
                displayMessage(`Error: ${error.message}`, 'system-info', 'system-info');
                return `Error: Yui is unable to respond. ${error.message}`; // Non-retryable
            }
        }

        retryCount++;
        if (retryCount < maxRetries) {
            const delay = retryBackoffs[retryCount -1]; // Use the correct index
            log.info(`Renderer: Retrying Gemini API call in ${delay}ms.`);
            // Ensure typing indicator is present during wait
            if (typingIndicator && !chatMessagesDiv.contains(typingIndicator)) {
                 chatMessagesDiv.appendChild(typingIndicator); // Re-add if removed by error handling
                 chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // This part is reached if all retries fail
    if (typingIndicator && chatMessagesDiv.contains(typingIndicator)) typingIndicator.remove();
    const finalErrorMessage = `Sorry, I'm having trouble connecting right now. (Error: ${lastErrorObject ? (lastErrorObject.error || lastErrorObject.message) : 'Max retries reached'})`;
    displayMessage(finalErrorMessage, 'system-info', 'system-info');
    log.error('Renderer: Max retries reached for Gemini API call. Last error:', lastErrorObject ? (lastErrorObject.error || lastErrorObject.message) : "N/A", "Details:", lastErrorObject ? lastErrorObject.details : "N/A");
    return `Error: Yui is unable to respond at the moment. ${lastErrorObject ? (lastErrorObject.error || lastErrorObject.message) : 'Please try again later.'}`;
}

/**
 * Gets semantically optimized conversation history using advanced chunking
 * @returns {Array} - Semantically optimized conversation history
 */
function getOptimizedConversationHistory() {
    const fullHistory = yuiData.memory;
    
    if (fullHistory.length <= 10) {
        return fullHistory; // For short conversations, return as is
    }
    
    // Keep the most recent 10 messages for immediate context
    const recentMessages = fullHistory.slice(-10);
    
    // Group older messages by semantic chunks
    const olderMessages = fullHistory.slice(0, -10);
    const semanticChunks = createSemanticChunks(olderMessages);
    
    // Select the most relevant chunks based on current conversation
    const relevantChunks = getRelevantChunks(semanticChunks, recentMessages);
    
    // Create a conversation summary for context if we still have too many messages
    const availableSlots = 15; // Target max total messages to include
    if (relevantChunks.length + recentMessages.length > availableSlots) {
        // Keep more important chunks
        const priorityChunks = prioritizeChunks(relevantChunks);
        const selectedChunks = priorityChunks.slice(0, availableSlots - recentMessages.length - 1);
        
        // Add a summary message if we had to cut too much
        if (relevantChunks.length > selectedChunks.length + 3) {
            const summaryMessage = createContextSummary(olderMessages, selectedChunks);
            return [summaryMessage, ...selectedChunks, ...recentMessages];
        }
        
        return [...selectedChunks, ...recentMessages];
    }
    
    return [...relevantChunks, ...recentMessages];
}

/**
 * Creates semantic chunks from conversation messages
 * @param {Array} messages - Conversation messages to chunk
 * @returns {Array} - Semantic chunks of related messages
 */
function createSemanticChunks(messages) {
    if (messages.length === 0) return [];
    
    let chunks = [];
    let currentChunk = [messages[0]];
    let currentTopic = extractTopics(messages[0].parts[0].text);
    
    for (let i = 1; i < messages.length; i++) {
        const message = messages[i];
        const messageTopic = extractTopics(message.parts[0].text);
        
        // Check if this message is related to the current topic
        const similarity = calculateTopicSimilarity(currentTopic, messageTopic);
        
        if (similarity > 0.3 && currentChunk.length < 5) {
            // Related message, add to current chunk
            currentChunk.push(message);
            // Update the current topic to include new terms
            currentTopic = mergeTopics(currentTopic, messageTopic);
        } else {
            // New topic, create a new chunk
            if (currentChunk.length > 0) {
                chunks.push({
                    messages: currentChunk,
                    topic: currentTopic,
                    importance: calculateChunkImportance(currentChunk, currentTopic)
                });
            }
            currentChunk = [message];
            currentTopic = messageTopic;
        }
    }
    
    // Add the last chunk
    if (currentChunk.length > 0) {
        chunks.push({
            messages: currentChunk,
            topic: currentTopic,
            importance: calculateChunkImportance(currentChunk, currentTopic)
        });
    }
    
    return chunks;
}

/**
 * Extracts key topics from a message using NLP
 * @param {string} text - Message text
 * @returns {Array} - Array of topics
 */
function extractTopics(text) {
    try {
        if (!text || typeof text !== 'string' || text.trim() === '') return [];
        const doc = nlp(text);
        
        // Get nouns as primary topics
        const nouns = doc.match('#Noun').not('#Pronoun').out('array');
        
        // Get named entities
        const entities = doc.match('#Person').out('array');
        
        // Get other key terms
        const emotions = doc.match('#Emotion').out('array');
        const places = doc.match('#Place').out('array');
        const preferences = doc.match('(favorite|like|love|prefer)').out('array');
        
        // Combine all topics and remove duplicates
        const topics = [...new Set([...nouns, ...entities, ...emotions, ...places, ...preferences])];
        // log.debug('Renderer: Extracted topics:', topics, 'from text:', text.substring(0,50)); // Potentially very verbose
        return topics.filter(t => t.length > 2); 
    } catch (error) {
        log.error('Renderer: Error extracting topics with NLP:', error.message, 'Text was:', text.substring(0, 100));
        return [];
    }
}

/**
 * Calculates similarity between two topic sets
 * @param {Array} topicsA - First set of topics
 * @param {Array} topicsB - Second set of topics
 * @returns {number} - Similarity score between 0 and 1
 */
function calculateTopicSimilarity(topicsA, topicsB) {
    if (topicsA.length === 0 || topicsB.length === 0) return 0;
    
    // Count overlapping topics
    const overlapCount = topicsA.filter(topic => 
        topicsB.some(t => t.toLowerCase() === topic.toLowerCase())
    ).length;
    
    // Calculate Jaccard similarity
    return overlapCount / (topicsA.length + topicsB.length - overlapCount);
}

/**
 * Merges two sets of topics
 * @param {Array} topicsA - First set of topics
 * @param {Array} topicsB - Second set of topics
 * @returns {Array} - Merged topics
 */
function mergeTopics(topicsA, topicsB) {
    return [...new Set([...topicsA, ...topicsB])];
}

/**
 * Calculates importance of a chunk based on content
 * @param {Array} messages - Messages in the chunk
 * @param {Array} topics - Topics in the chunk
 * @returns {number} - Importance score
 */
function calculateChunkImportance(messages, topics) {
    let score = 0;
    
    // Score based on message content
    for (const message of messages) {
        const text = message.parts[0].text;
        const doc = nlp(text);
        
        // Check for user preferences/personal info
        if (doc.match('(favorite|like|love|prefer|my) (#Noun|#Adjective)').length > 0) {
            score += 5;
        }
        
        // Score messages containing emotions
        if (doc.match('#Emotion').length > 0) {
            score += 3;
        }
        
        // Score messages containing questions and answers
        if (doc.questions().length > 0) {
            score += 2;
        }
        
        // Score messages mentioning relationship
        if (doc.match('(friend|trust|relationship|close|care|feel)').length > 0) {
            score += 4;
        }
        
        // Check for user preferences
        for (const pref in yuiData.userPreferences) {
            if (yuiData.userPreferences[pref] && text.includes(yuiData.userPreferences[pref])) {
                score += 5;
                break;
            }
        }
    }
    
    // Higher score for more topics
    score += Math.min(5, topics.length);
    
    return score;
}

/**
 * Gets the most relevant chunks based on recent conversation
 * @param {Array} chunks - All semantic chunks
 * @param {Array} recentMessages - Recent messages
 * @returns {Array} - Most relevant chunks
 */
function getRelevantChunks(chunks, recentMessages) {
    if (chunks.length === 0) return [];
    
    // Extract topics from recent messages
    const recentTopics = recentMessages.flatMap(message => 
        extractTopics(message.parts[0].text)
    );
    
    // Score each chunk based on relevance to recent conversation
    const scoredChunks = chunks.map(chunk => {
        const topicSimilarity = calculateTopicSimilarity(chunk.topic, recentTopics);
        const relevanceScore = chunk.importance * (1 + topicSimilarity * 2); // Weight similarity heavily
        
        return {
            ...chunk,
            relevanceScore
        };
    });
    
    // Sort by relevance and return top chunks
    const sortedChunks = scoredChunks
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, 10); // Get top 10 most relevant chunks
    
    // Flatten chunks back to messages
    return sortedChunks.flatMap(chunk => chunk.messages);
}

/**
 * Prioritizes chunks based on importance and recency
 * @param {Array} chunks - Chunks to prioritize
 * @returns {Array} - Prioritized messages
 */
function prioritizeChunks(chunks) {
    // For now, we'll just sort by importance
    return chunks.sort((a, b) => a.importance - b.importance);
}

/**
 * Creates a summary of conversation context that was omitted
 * @param {Array} allMessages - All messages
 * @param {Array} includedMessages - Messages that will be included directly
 * @returns {Object} - Summary message
 */
function createContextSummary(allMessages, includedMessages) {
    // Get messages being omitted
    const includedIds = new Set(includedMessages.map(m => m.parts[0].text));
    const omittedMessages = allMessages.filter(m => !includedIds.has(m.parts[0].text));
    
    // Create a concise summary of key information
    const summary = {
        role: "user",
        parts: [{ text: `[Conversation context: You and the user have been talking for some time. User's preferences: Food=${yuiData.userPreferences.food || 'unknown'}, Games=${yuiData.userPreferences.games || 'unknown'}, Anime=${yuiData.userPreferences.anime || 'unknown'}, Color=${yuiData.userPreferences.color || 'unknown'}. Current friendship: ${yuiData.friendshipStage}, Trust: ${yuiData.trustLevel}/100, Affection: ${yuiData.affectionLevel}/100.]` }]
    };
    
    return summary;
}

// Enhanced pruneMemories function
function pruneMemories() {
    if (yuiData.memory.length <= yuiData.maxMemoryTurns) {
        return; // No need to prune yet
    }
    
    // Keep the most recent third of messages intact
    const recentMessageCount = Math.floor(yuiData.maxMemoryTurns * 0.3);
    const recentMessages = yuiData.memory.slice(-recentMessageCount);
    
    // For older messages, score using enhanced NLP features
    const olderMessages = yuiData.memory.slice(0, -recentMessageCount);
    
    // Create semantic chunks from older messages
    const chunks = createSemanticChunks(olderMessages);
    
    // Flatten chunks and score each message
    const scoredMessages = chunks.flatMap(chunk => {
        return chunk.messages.map(msg => {
            const chunkImportance = chunk.importance / chunk.messages.length;
            
            // Additional scoring logic
            const text = msg.parts[0].text;
            const doc = nlp(text);
            
            let score = chunkImportance;
            
            // Preference for messages that might contain information about the user
            if (doc.match('(i|me|my|mine) (#Adverb|#Adjective)? (#Verb|am|was|have|had) [0-5] (#Noun|#Adjective)').length > 0) {
                score += 3;
            }
            
            // Memory of important emotional moments
            if (doc.match('(happy|sad|angry|excited|nervous|scared|worried|calm|relaxed)').length > 0) {
                score += 2; 
            }
            
            // Remember important plans or future events
            if (doc.match('(tomorrow|next|later|weekend|soon|plan|schedule|meet|date)').length > 0) {
                score += 3;
            }
            
            return { message: msg, score };
        });
    });
    
    // Sort by score and keep top messages
    const remainingSlots = yuiData.maxMemoryTurns - recentMessages.length;
    const topOlderMessages = scoredMessages
        .sort((a, b) => b.score - a.score)
        .slice(0, remainingSlots)
        .map(item => item.message);
    
    // Update memory with pruned version
    yuiData.memory = [...topOlderMessages, ...recentMessages];
}

function displayInitialGreeting() {
    if (yuiData.memory.length === 0 && yuiData.friendshipStage === "Stranger") {
        const greeting = `Hello, I'm ${yuiData.characterName}. It's... nice to meet you, I guess.`;
        displayMessage(greeting, 'yui');
        addToMemory({ role: "model", parts: [{ text: greeting }] }); // Now addToMemory is defined
    }
}

// Enhance the processUserIntent function to use Compromise
function processUserIntent(messageText) {
    const doc = nlp(messageText.toLowerCase()); // Process lowercase text for easier matching
    let preferenceUpdated = false;
    let updatedPreferenceInfo = null; // To store {type: 'food', value: 'pizza'}

    // Food preferences
    // Example: "my favorite food is pizza", "i like sushi", "i love pasta"
    const foodPatterns = [
        `(my|i) (favorite|like|love|prefer|enjoy) [0-2] (food|meal|dish|cuisine) [0-2] (is|are|be) (?<value>.+)`,
        `(my|i) (like|love|prefer|enjoy) (?<value>(#Noun+ (and #Noun+)?)) (a lot|very much)?`,
        `(?<value>(#Noun+ (and #Noun+)?)) (is|are|be) my favorite [0-2] (food|meal|dish|cuisine)`
    ];
    for (const pattern of foodPatterns) {
        const foodMatchResult = doc.match(pattern);
        if (foodMatchResult.found) {
            const foodPhrase = foodMatchResult.groups().value.text('normal').trim();
            if (foodPhrase && yuiData.userPreferences.food !== foodPhrase) {
                // Basic check to avoid overly generic terms
                if (foodPhrase.length > 2 && !['food', 'meal', 'dish', 'cuisine', 'it', 'that', 'this'].includes(foodPhrase)) {
                    yuiData.userPreferences.food = foodPhrase;
                    preferenceUpdated = true;
                    updatedPreferenceInfo = { type: 'food', value: foodPhrase };
                    break; 
                }
            }
        }
    }

    // Color preferences
    // Example: "my favorite color is blue", "i like red"
    const colorPatterns = [
        `(my|i) (favorite|like|love|prefer) [0-2] color [0-2] (is|are|be) (?<value>.+)`,
        `(my|i) (like|love|prefer) (?<value>#Color) (a lot|very much)?`, // Assumes #Color tag works
        `(my|i) (like|love|prefer) (?<value>(#Noun+)) (as a color|for color)? (a lot|very much)?`, // Fallback for "I like blue"
        `(?<value>#Color) (is|are|be) my favorite color`,
        `(?<value>(#Noun+)) (is|are|be) my favorite color`
    ];
    for (const pattern of colorPatterns) {
        const colorMatchResult = doc.match(pattern);
        if (colorMatchResult.found) {
            const colorPhrase = colorMatchResult.groups().value.text('normal').trim();
            if (colorPhrase && yuiData.userPreferences.color !== colorPhrase) {
                 if (colorPhrase.length > 2 && !['color', 'it', 'that', 'this'].includes(colorPhrase)) {
                    yuiData.userPreferences.color = colorPhrase;
                    preferenceUpdated = true;
                    updatedPreferenceInfo = { type: 'color', value: colorPhrase };
                    break;
                }
            }
        }
    }

    // Game preferences
    // Example: "my favorite game is witcher", "i like to play stardew valley"
    const gamePatterns = [
        `(my|i) (favorite|like|love|prefer|enjoy) [0-2] (game|games|video game|video games|gaming) [0-2] (is|are|be|called) (?<value>.+)`,
        `(my|i) (like|love|prefer|enjoy|play) (?<value>(#TitleCase+|#Noun+)+) (game|games)? (a lot|very much)?(often)?`,
        `(?<value>(#TitleCase+|#Noun+)+) (is|are|be) my favorite [0-2] (game|video game)`
    ];
    for (const pattern of gamePatterns) {
        const gameMatchResult = doc.match(pattern);
        if (gameMatchResult.found) {
            let gamePhrase = gameMatchResult.groups().value.text('normal').trim();
            gamePhrase = gamePhrase.replace(/\s+games?$/i, '').trim(); // Clean "game(s)" suffix
            if (gamePhrase && yuiData.userPreferences.games !== gamePhrase) {
                if (gamePhrase.length > 1 && !['game', 'games', 'video game', 'video games', 'gaming', 'it', 'that', 'this'].includes(gamePhrase)) {
                    yuiData.userPreferences.games = gamePhrase;
                    preferenceUpdated = true;
                    updatedPreferenceInfo = { type: 'games', value: gamePhrase };
                    break;
                }
            }
        }
    }

    // Anime preferences
    // Example: "my favorite anime is naruto", "i like watching one piece"
    const animePatterns = [
        `(my|i) (favorite|like|love|prefer|enjoy) [0-2] (anime|show|series) [0-2] (is|are|be|called) (?<value>.+)`,
        `(my|i) (like|love|prefer|enjoy|watch) (?<value>(#TitleCase+|#Noun+)+) (anime|show|series)? (a lot|very much)?(often)?`,
        `(?<value>(#TitleCase+|#Noun+)+) (is|are|be) my favorite [0-2] (anime|show|series)`
    ];
    for (const pattern of animePatterns) {
        const animeMatchResult = doc.match(pattern);
        if (animeMatchResult.found) {
            let animePhrase = animeMatchResult.groups().value.text('normal').trim();
            animePhrase = animePhrase.replace(/\s+(anime|show|series)$/i, '').trim(); // Clean suffix
            if (animePhrase && yuiData.userPreferences.anime !== animePhrase) {
                 if (animePhrase.length > 1 && !['anime', 'show', 'series', 'it', 'that', 'this'].includes(animePhrase)) {
                    yuiData.userPreferences.anime = animePhrase;
                    preferenceUpdated = true;
                    updatedPreferenceInfo = { type: 'anime', value: animePhrase };
                    break;
                }
            }
        }
    }

    if (preferenceUpdated && updatedPreferenceInfo) {
        displayMessage(`(Yui notes your preference for ${updatedPreferenceInfo.type}: ${updatedPreferenceInfo.value}.)`, 'system-info', 'system-info');
        updateYuiProfileDisplay();        
        window.electronAPI.saveYuiData(yuiData);    
    }
}

// --- Yui's Character and State Logic ---
function updateEmotionalState(userMessage, yuiResponse) {
    // Parse messages with Compromise
    const userDoc = nlp(userMessage);
    const yuiDoc = nlp(yuiResponse);
    let trustChange = 0;
    let affectionChange = 0;

    // --- SENTIMENT ANALYSIS ---
    // Get overall sentiment of message
    // MOVED sentimentScore CALCULATION TO THE TOP
    const sentimentScore = getSentimentScore(userDoc); // Uses enhanced getSentimentScore
    
    // Store sentiment score
    const now = new Date(); // Moved 'now' here as it's used by sentimentHistory and personality traits
    yuiData.sentimentHistory.push({ timestamp: now, score: sentimentScore });
    if (yuiData.sentimentHistory.length > yuiData.maxSentimentHistory) {
        yuiData.sentimentHistory.shift();
    }
    // Log sentiment if it's not neutral
    if (sentimentScore !== 0) {
        log.debug(`Renderer: User sentiment score: ${sentimentScore.toFixed(3)}`);
    }


    // --- EVOLVING PERSONALITY TRAIT ADJUSTMENTS ---
    // These changes are subtle and accumulate over time.
    let shynessChange = 0;
    let sarcasmChange = 0;
    let playfulnessChange = 0;
    let patienceChange = 0;
    let opennessPersonalChange = 0;
    let opennessHobbiesChange = 0;
    let opennessDeepThoughtsChange = 0;
    let opennessFuturePlansChange = 0;
    let opennessVulnerabilityChange = 0;

    const positiveInteractionFactor = (yuiData.trustLevel / 100 + yuiData.affectionLevel / 100) / 2; // 0 to 1

    // Shyness: Decreases with positive interactions, trust, and user openness.
    if (userDoc.match('(i feel|i think|my opinion is|let me tell you about)').found) { // User is open
        shynessChange -= 0.2 * (1 - yuiData.shynessLevel / 100);
    }
    // Initial reaction to sentiment for shyness
    if (sentimentScore > 0.1) { // If interaction is positive
        shynessChange -= 0.15 * (1 - yuiData.shynessLevel / 100);
    } else if (sentimentScore < -0.1) { // If interaction is negative
        shynessChange += 0.1;
    }


    // Playfulness: Increases with playful user messages, positive sentiment.
    if (userDoc.match('(lol|haha|funny|joke|kidding|playful)').found && sentimentScore > 0.1) {
        playfulnessChange += 0.5 * (1 - yuiData.playfulnessLevel / 100);
    } else if (sentimentScore < -0.2) { // Less playful in negative contexts
        playfulnessChange -= 0.3;
    }
    // Affection change impact will be added after affectionChange is calculated.

    // Sarcasm:
    if (yuiData.affectionLevel < 20 && sentimentScore < -0.5 && userDoc.match('(stop|dont say that|mean|rude)').found) {
        sarcasmChange -= 0.5;
    } else if (yuiData.affectionLevel > 60 && sentimentScore > 0.2) { // Slightly more witty/sarcastic if playful and liked
        sarcasmChange += 0.1;
    }


    // Patience: Decreases if user is repetitive, demanding, or very negative. Increases with polite, understanding users.
    if (userDoc.match('(why wont you|you have to|tell me now|stupid|idiot)').found && yuiData.trustLevel < 40) {
        patienceChange -= 1.0;
    } else if (userDoc.match('(please|thank you|take your time|i understand)').found && sentimentScore > 0) {
        patienceChange += 0.3;
    }
    if (sentimentScore < -0.5) patienceChange -= 0.5; // General negativity wears down patience

    // Openness to Topics:
    // Personal: Increases if user shares personal info, high trust/affection.
    if (userDoc.match('(my (childhood|family|secret|dream|fear)|i feel (sad|happy|lonely))').found && sentimentScore >= -0.1) { // Allow if not very negative
        opennessPersonalChange += 0.5 * positiveInteractionFactor;
    }
    if (yuiData.trustLevel > 60 && yuiData.affectionLevel > 50) opennessPersonalChange += 0.2;

    // Hobbies: Increases if user asks about Yui's hobbies or shares their own.
    if (userDoc.match('(your (music|guitar|hobbies)|what do you like to do|i like to (play|read|watch))').found) {
        opennessHobbiesChange += 0.4;
    }

    // Deep Thoughts: Increases with very high trust/affection and if user initiates deep topics.
    if (userDoc.match('(meaning of life|philosophy|universe|existential|what if)').found && yuiData.trustLevel > 70 && yuiData.affectionLevel > 60) {
        opennessDeepThoughtsChange += 0.3;
    }

    // Future Plans: Increases if user asks about future or shares their own plans, high trust.
    if (userDoc.match('(your (future|dreams|goals)|what are you (planning|gonna do))').found && yuiData.trustLevel > 50) {
        opennessFuturePlansChange += 0.4;
    }
    
    // Vulnerability: Increases very slowly with extremely high trust/affection and if user is very supportive.
    if (userDoc.match('(its okay|i understand|im here for you|you can tell me)').found && yuiData.trustLevel > 80 && yuiData.affectionLevel > 75 && sentimentScore > 0.3) {
        opennessVulnerabilityChange += 0.2;
    }
    if (yuiData.trustLevel < 50 || yuiData.affectionLevel < 40) { // Becomes less vulnerable if trust/affection drops
        opennessVulnerabilityChange -= 0.1;
    }

    // --- CORE TRUST/AFFECTION CHANGES BASED ON SENTIMENT & INTERACTION ---
    if (sentimentScore > 0.3) { // More positive
        trustChange += (0.5 + Math.random() * 0.5);
        affectionChange += (0.5 + Math.random() * 1);
        log.debug(`Renderer: Positive sentiment detected. Initial Trust +${trustChange.toFixed(2)}, Affection +${affectionChange.toFixed(2)}`);
    } else if (sentimentScore < -0.3) { // More negative
        trustChange -= (0.5 + Math.random() * 1); // Slightly higher penalty for trust
        affectionChange -= (1 + Math.random() * 1); // Higher penalty for affection
        log.debug(`Renderer: Negative sentiment detected. Initial Trust ${trustChange.toFixed(2)}, Affection ${affectionChange.toFixed(2)}`);
    }
    
    // --- DETECT NEGATED SENTIMENT ---
    // Check for negations before sentiment words (more robust)
    if (userDoc.match('(not|no|never|isnt|dont|wasnt|werent|cant|couldnt|wouldnt|shouldnt) [0-3] (#Adjective|#Verb|like|love|care|want|need|happy|good|great|nice|fine)').length > 0) {
        trustChange -= 0.5;
        affectionChange -= 0.5;
        log.debug(`Renderer: Negated positive/expressed negative sentiment. Trust -0.5, Affection -0.5`);
    }
    
    // --- USER SHARING PERSONAL INFO ---
    // More accurate detection of personal sharing, including feelings and experiences
    if (userDoc.match('(i|me|my|mine) (#Adverb|#Adjective)? (feel|felt|think|thought|believe|guess|remember|hope|wish|dream|am|was|have|had) [0-5] (#Noun|#Adjective|about|that|because)').length > 0) {
        trustChange += (1 + Math.random() * 1);
        affectionChange += (0.5 + Math.random() * 0.5);
        log.debug(`Renderer: User shared personal info/feeling. Trust +${trustChange.toFixed(2)}, Affection +${affectionChange.toFixed(2)}`);
    }
    
    // --- POLITENESS & GRATITUDE ---
    // Detect thank you, please, expressions of gratitude, apologies
    if (userDoc.match('(thank|thanks|appreciate|grateful|sorry|apologize|pardon|excuse me|please)').length > 0 && 
        !userDoc.match('not (thank|thanks|appreciate|grateful|sorry|apologize)').length > 0) {
        trustChange += (0.5 + Math.random() * 0.5);
        affectionChange += (0.2 + Math.random() * 0.3);
        log.debug(`Renderer: Politeness/Gratitude detected. Trust +${trustChange.toFixed(2)}, Affection +${affectionChange.toFixed(2)}`);
    }
    
    // --- QUESTIONS & ENGAGEMENT ---
    // User asking Yui questions shows interest, especially personal questions
    if (userDoc.questions().length > 0 && userDoc.match('(you|your|yours|yourself|yui)').length > 0) {
        trustChange += (0.5 + Math.random() * 0.5);
        affectionChange += (0.3 + Math.random() * 0.7);
        log.debug(`Renderer: User asked question about Yui. Trust +${trustChange.toFixed(2)}, Affection +${affectionChange.toFixed(2)}`);
    } else if (userDoc.questions().length > 0) { // General questions
        trustChange += (0.2 + Math.random() * 0.3);
        log.debug(`Renderer: User asked general question. Trust +${trustChange.toFixed(2)}`);
    }
    
    // --- DETECT STRONG EMOTIONS & KEY PHRASES ---
    const emotionalIntensity = userDoc.match('(really|very|so|extremely|absolutely|totally|completely|awfully|terribly|incredibly) (#Adjective|#Adverb|#Verb)').length > 0 ? 1.5 : 1;
    
    // Positive expressions towards Yui
    if (userDoc.match('(love|adore|care|miss|like|appreciate|value|cherish|respect|trust) [0-2] (you|yui)').length > 0 && !userDoc.match('(dont|not|never) (love|adore|care|miss|like|appreciate|value|cherish|respect|trust)').length > 0) {
        affectionChange += (2 + Math.random() * 1) * emotionalIntensity;
        trustChange += (1 + Math.random() * 0.5) * emotionalIntensity;
        log.debug(`Renderer: Strong positive expression towards Yui. Affection +${affectionChange.toFixed(2)}, Trust +${trustChange.toFixed(2)}`);
    }
    
    // Negative expressions towards Yui
    if (userDoc.match('(hate|despise|dislike|annoy|bother|frustrate|cant stand) [0-2] (you|yui)').length > 0 && !userDoc.match('(dont|not|never) (hate|despise|dislike|annoy|bother|frustrate|cant stand)').length > 0) {
        affectionChange -= (2 + Math.random() * 1) * emotionalIntensity;
        trustChange -= (1.5 + Math.random() * 1) * emotionalIntensity;
        log.debug(`Renderer: Strong negative expression towards Yui. Affection ${affectionChange.toFixed(2)}, Trust ${trustChange.toFixed(2)}`);
    }

    // User expressing vulnerability or seeking comfort
    if (userDoc.match('(i feel|im feeling|im so|i am so) (sad|lonely|upset|scared|worried|anxious|depressed|miserable|bad|terrible|awful|down)').length > 0) {
        trustChange += (1 + Math.random() * 0.5);
        // Affection might increase if Yui responds well, handled by Yui's response analysis later
        log.debug(`Renderer: User expressed vulnerability. Trust +${trustChange.toFixed(2)}`);
    }

    // User expressing excitement or happiness
    if (userDoc.match('(i feel|im feeling|im so|i am so) (happy|excited|great|wonderful|fantastic|thrilled|elated|joyful)').length > 0) {
        affectionChange += (0.5 + Math.random() * 0.5);
        log.debug(`Renderer: User expressed happiness/excitement. Affection +${affectionChange.toFixed(2)}`);
    }
    
    // --- RESPONSE TO YUI'S EMOTIONS ---
    // Detect when Yui expresses emotion and user responds empathetically or supportively
    const yuiEmotions = yuiDoc.match('#Emotion').out('array'); // #Emotion tag from compromise
    const yuiPositiveEmotionWords = ['happy', 'glad', 'excited', 'good', 'great'];
    const yuiNegativeEmotionWords = ['sad', 'upset', 'angry', 'worried', 'scared', 'bad', 'terrible'];

    if (yuiEmotions.length > 0 || yuiPositiveEmotionWords.some(w => yuiDoc.text().toLowerCase().includes(w)) || yuiNegativeEmotionWords.some(w => yuiDoc.text().toLowerCase().includes(w))) {
        if (userDoc.match('(sorry|understand|know how|feel|thats (tough|hard|sad|great|good)|im here for you|can i help|anything i can do|glad to hear|happy for you|congratulations)').length > 0) {
            trustChange += (1 + Math.random() * 0.5);
            affectionChange += (0.5 + Math.random() * 1);
            log.debug(`Renderer: User responded empathetically to Yui. Trust +${trustChange.toFixed(2)}, Affection +${affectionChange.toFixed(2)}`);
        }
    }
    
    // --- CONVERSATION COHERENCE & CONTINUITY ---
    // Check if user message references previous conversation topics or Yui's statements
    if (yuiData.memory.length >= 2) {
        const lastYuiResponse = yuiData.memory[yuiData.memory.length - 2]?.parts[0]?.text || "";
        const lastYuiDoc = nlp(lastYuiResponse);
        const lastYuiTopics = getTopics(lastYuiDoc);
        const currentUserTopics = getTopics(userDoc);

        const commonTopics = lastYuiTopics.filter(topic => currentUserTopics.includes(topic));
        if (commonTopics.length > 0 || userDoc.match('(you said|you mentioned|remember when|about that|regarding that)').length > 0) {
            trustChange += (0.3 + Math.random() * 0.2);
            log.debug(`Renderer: User continued coherent conversation. Trust +${trustChange.toFixed(2)}`);
        }
    }

    // --- DETECTING AGREEMENT / DISAGREEMENT ---
    if (userDoc.match('(i agree|youre right|exactly|precisely|true|indeed|absolutely|definitely|for sure)').length > 0 && !userDoc.match('(dont|not|never) agree').length > 0) {
        trustChange += 0.4;
        affectionChange += 0.2;
        log.debug(`Renderer: User agreed with Yui. Trust +0.4, Affection +0.2`);
    } else if (userDoc.match('(i disagree|not sure about that|i dont think so|actually|but|however)').length > 0 && !userDoc.match('(dont|not|never) disagree').length > 0) {
        trustChange -= 0.3; // Disagreement can slightly lower trust if not handled well
        log.debug(`Renderer: User disagreed with Yui. Trust -0.3`);
    }

    // --- NOW APPLY TRUST/AFFECTION CHANGES TO PERSONALITY TRAITS ---
    // These are additive to the initial sentiment-based changes for personality traits
    if (trustChange > 0) shynessChange -= 0.3 * (trustChange / 5); // Max -0.3 if trustChange is 5
    if (affectionChange > 0) {
        shynessChange -= 0.2 * (affectionChange / 5);
        playfulnessChange += 0.2 * (affectionChange / 3); // More playful if affection increases
    }
    if (trustChange < 0 || affectionChange < 0) {
        shynessChange += 0.15; // Slightly more shy if negative interaction
        patienceChange -= 0.2; // Less patient
    }


    // Apply personality trait changes (clamped between 0-100)
    yuiData.shynessLevel = Math.max(0, Math.min(100, yuiData.shynessLevel + shynessChange));
    yuiData.sarcasmLevel = Math.max(0, Math.min(100, yuiData.sarcasmLevel + sarcasmChange));
    yuiData.playfulnessLevel = Math.max(0, Math.min(100, yuiData.playfulnessLevel + playfulnessChange));
    yuiData.patienceLevel = Math.max(0, Math.min(100, yuiData.patienceLevel + patienceChange));
    yuiData.opennessToTopics.personal = Math.max(0, Math.min(100, yuiData.opennessToTopics.personal + opennessPersonalChange));
    yuiData.opennessToTopics.hobbies = Math.max(0, Math.min(100, yuiData.opennessToTopics.hobbies + opennessHobbiesChange));
    yuiData.opennessToTopics.deepThoughts = Math.max(0, Math.min(100, yuiData.opennessToTopics.deepThoughts + opennessDeepThoughtsChange));
    yuiData.opennessToTopics.futurePlans = Math.max(0, Math.min(100, yuiData.opennessToTopics.futurePlans + opennessFuturePlansChange));
    yuiData.opennessToTopics.vulnerability = Math.max(0, Math.min(100, yuiData.opennessToTopics.vulnerability + opennessVulnerabilityChange));

    // Log personality trait changes if any occurred
    if (shynessChange !== 0) log.debug(`Personality: Shyness changed by ${shynessChange.toFixed(2)} to ${yuiData.shynessLevel.toFixed(2)}`);
    if (sarcasmChange !== 0) log.debug(`Personality: Sarcasm changed by ${sarcasmChange.toFixed(2)} to ${yuiData.sarcasmLevel.toFixed(2)}`);
    if (playfulnessChange !== 0) log.debug(`Personality: Playfulness changed by ${playfulnessChange.toFixed(2)} to ${yuiData.playfulnessLevel.toFixed(2)}`);
    if (patienceChange !== 0) log.debug(`Personality: Patience changed by ${patienceChange.toFixed(2)} to ${yuiData.patienceLevel.toFixed(2)}`);
    if (opennessPersonalChange !== 0) log.debug(`Personality: Openness (Personal) changed by ${opennessPersonalChange.toFixed(2)} to ${yuiData.opennessToTopics.personal.toFixed(2)}`);
    if (opennessHobbiesChange !== 0) log.debug(`Personality: Openness (Hobbies) changed by ${opennessHobbiesChange.toFixed(2)} to ${yuiData.opennessToTopics.hobbies.toFixed(2)}`);
    if (opennessDeepThoughtsChange !== 0) log.debug(`Personality: Openness (Deep Thoughts) changed by ${opennessDeepThoughtsChange.toFixed(2)} to ${yuiData.opennessToTopics.deepThoughts.toFixed(2)}`);
    if (opennessFuturePlansChange !== 0) log.debug(`Personality: Openness (Future Plans) changed by ${opennessFuturePlansChange.toFixed(2)} to ${yuiData.opennessToTopics.futurePlans.toFixed(2)}`);
    if (opennessVulnerabilityChange !== 0) log.debug(`Personality: Openness (Vulnerability) changed by ${opennessVulnerabilityChange.toFixed(2)} to ${yuiData.opennessToTopics.vulnerability.toFixed(2)}`);


    // Apply random variance (from existing code)
    const trustVariance = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    const affectionVariance = Math.floor(Math.random() * 3) - 1; // -1, 0, or 1
    
    // Apply variance only if there was a change, to prevent small +/- 1 fluctuations on neutral inputs
    trustChange = trustChange === 0 ? 0 : trustChange + (trustChange > 0 ? trustVariance * 0.5 : -trustVariance * 0.5); // Make variance smaller
    affectionChange = affectionChange === 0 ? 0 : affectionChange + (affectionChange > 0 ? affectionVariance * 0.5 : -affectionVariance * 0.5);
    
    // Loyalty bonus (from existing code) - consider if this is still desired with more nuanced changes
    if (yuiData.memory.length > 10 && yuiData.memory.length % 10 === 0 && affectionChange === 0 && trustChange === 0 && sentimentScore >= -0.1) { // Only if not a negative interaction
        affectionChange += 0.5;
        trustChange += 0.5;
        log.debug(`Renderer: Loyalty bonus applied. Affection +0.5, Trust +0.5`);
    }
    
    // Apply changes
    yuiData.trustLevel = Math.max(0, Math.min(100, yuiData.trustLevel + trustChange));
    yuiData.affectionLevel = Math.max(0, Math.min(100, yuiData.affectionLevel + affectionChange));

    // Log changes for trust and affection
    if (trustChange !== 0) {
        log.info(`Renderer: Trust changed by ${trustChange.toFixed(2)}. New trust: ${yuiData.trustLevel.toFixed(2)}`);
    }
    if (affectionChange !== 0) {
        log.info(`Renderer: Affection changed by ${affectionChange.toFixed(2)}. New affection: ${yuiData.affectionLevel.toFixed(2)}`);
    }

    // Friendship Stage logic remains the same
    const oldStage = yuiData.friendshipStage;
    if (yuiData.friendshipStage === "Stranger" && yuiData.trustLevel >= 20) {
        yuiData.friendshipStage = "Acquaintance";
        recordKeyEvent("Friendship stage changed to Acquaintance.");
    } else if (yuiData.friendshipStage === "Acquaintance" && yuiData.trustLevel >= 40 && yuiData.affectionLevel >= 30) {
        yuiData.friendshipStage = "Friend";
        recordKeyEvent("Friendship stage changed to Friend.");
    } else if (yuiData.friendshipStage === "Friend" && yuiData.trustLevel >= 60 && yuiData.affectionLevel >= 70) {
        yuiData.friendshipStage = "Close Friend"; // Changed from "Close" for clarity
        recordKeyEvent("Friendship stage changed to Close Friend.");
    }
    // Add logic for degrading friendship stage if trust/affection drop significantly
    if (yuiData.trustLevel < 5 && oldStage !== "Stranger" && oldStage !== "Enemy") { // Added Enemy check
        yuiData.friendshipStage = "Stranger";
        recordKeyEvent("Friendship stage degraded to Stranger due to low trust.");
    } else if (yuiData.friendshipStage === "Close Friend" && (yuiData.trustLevel < 55 || yuiData.affectionLevel < 65)) {
        yuiData.friendshipStage = "Friend";
        recordKeyEvent("Friendship stage degraded to Friend.");
    } else if (yuiData.friendshipStage === "Friend" && (yuiData.trustLevel < 35 || yuiData.affectionLevel < 25)) {
        yuiData.friendshipStage = "Acquaintance";
        recordKeyEvent("Friendship stage degraded to Acquaintance.");
    }


    if (oldStage !== yuiData.friendshipStage) {
        log.info(`Renderer: Friendship stage changed from ${oldStage} to ${yuiData.friendshipStage}`);
        displayMessage(`System: Your friendship stage with Yui is now: ${yuiData.friendshipStage}`, 'system-info', 'system-info');
    }

    // const now = new Date(); // Already defined above for sentiment history
    yuiData.affectionHistory.push({ timestamp: now, value: yuiData.affectionLevel });
    yuiData.trustHistory.push({ timestamp: now, value: yuiData.trustLevel });
    if (yuiData.affectionHistory.length > 100) yuiData.affectionHistory.shift();
    if (yuiData.trustHistory.length > 100) yuiData.trustHistory.shift();

    updateYuiProfileDisplay();
    updateEmotionDisplay(trustChange, affectionChange, sentimentScore); // ADDED: Update emotion face
    updateDashboard();
    window.electronAPI.saveYuiData(yuiData);
}

// Add these helper functions for the enhanced emotional state analysis
function getSentimentScore(doc) {
    // Expanded sentiment analysis using word lists and some compromise features
    const positiveWords = [
        'good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'love', 'like', 'enjoy', 'fun', 'awesome', 'cool', 
        'nice', 'sweet', 'kind', 'beautiful', 'pretty', 'cute', 'fantastic', 'fabulous', 'superb', 'perfect', 'glad', 
        'pleased', 'thrilled', 'excited', 'grateful', 'appreciate', 'brilliant', 'charming', 'delightful', 'encouraging',
        'hopeful', 'positive', 'supportive', 'yes', 'yeah', 'yep', 'yay', 'woohoo', 'hooray'
    ];
    const negativeWords = [
        'bad', 'terrible', 'awful', 'horrible', 'sad', 'upset', 'angry', 'hate', 'dislike', 'boring', 'stupid', 'ugly', 
        'mean', 'rude', 'annoying', 'frustrating', 'lame', 'sucks', 'crap', 'damn', 'hell', 'irritating', 'pathetic',
        'worthless', 'cry', 'lonely', 'fear', 'anxious', 'worried', 'depressed', 'miserable', 'pain', 'hurt', 'no', 'nope',
        'terrible', 'awful', 'horrible', 'disappointed', 'offensive', 'negative'
    ];
    
    let score = 0;
    const text = doc.out('text').toLowerCase();
    const terms = doc.terms().out('array'); // Get individual terms

    // Count positive and negative words
    positiveWords.forEach(word => {
        if (text.includes(word)) score += 1;
    });
    
    negativeWords.forEach(word => {
        if (text.includes(word)) score -= 1;
    });

    // Check for intensifiers (e.g., "very good", "really bad")
    doc.match('(very|really|extremely|absolutely|so|incredibly|totally|awfully|terribly) #Adjective').forEach(match => {
        const adjective = match.terms().last().text('reduced'); // Get the adjective
        if (positiveWords.includes(adjective)) score += 0.5;
        if (negativeWords.includes(adjective)) score -= 0.5;
    });

    // Check for diminishers (e.g., "kinda good", "slightly bad")
    doc.match('(kinda|kind of|sorta|sort of|slightly|a bit|a little) #Adjective').forEach(match => {
        const adjective = match.terms().last().text('reduced');
        if (positiveWords.includes(adjective)) score -= 0.2; // Diminish positive impact
        if (negativeWords.includes(adjective)) score += 0.2; // Diminish negative impact
    });
    
    // Consider negations more directly in sentiment score
    doc.match('#Negative #Adjective').forEach(match => { // e.g., "not good"
        const adjective = match.terms().last().text('reduced');
        if (positiveWords.includes(adjective)) score -= 1.5; // Stronger impact for negated positive
        if (negativeWords.includes(adjective)) score += 0.5; // "not bad" is somewhat positive
    });
    doc.match('#Negative #Verb').forEach(match => { // e.g., "don't like"
        const verb = match.terms().last().text('reduced');
        if (positiveWords.some(pw => verb.includes(pw))) score -= 1.5;
        if (negativeWords.some(nw => verb.includes(nw))) score += 0.5;
    });


    // Normalize score to be between -1 and 1, roughly
    // This is a simple normalization; more sophisticated methods exist.
    const maxPossibleScore = positiveWords.length; // A rough upper bound
    const minPossibleScore = -negativeWords.length; // A rough lower bound
    if (score > 0) return Math.min(1, score / (maxPossibleScore * 0.2)); // Adjusted divisor
    if (score < 0) return Math.max(-1, score / (minPossibleScore * -0.2)); // Adjusted divisor
    
    return 0;
}

function getTopics(doc) {
    // Extract nouns, proper nouns, and verbs as potential topics.
    // Prioritize nouns and proper nouns.
    const topics = new Set();
    
    // Get nouns (excluding pronouns) and proper nouns
    doc.match('#Noun+').not('#Pronoun').forEach(term => {
        topics.add(term.text('reduced')); // 'reduced' gives the base form
    });
    
    // Get verbs (base form)
    doc.verbs().forEach(verb => {
        topics.add(verb.toInfinitive().text());
    });
    
    // Get adjectives if they seem significant (e.g., part of a multi-word topic)
    // This is more complex; for now, focusing on nouns and verbs is safer.

    // Filter out very common words that are unlikely to be specific topics
    const commonWords = new Set(['i', 'you', 'me', 'he', 'she', 'it', 'we', 'they', 'a', 'an', 'the', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'can', 'could', 'may', 'might', 'must', 'and', 'but', 'or', 'so', 'if', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'just', 'dont', 'now', 'yui']);
    
    return [...topics].filter(topic => topic.length > 2 && !commonWords.has(topic.toLowerCase()));
}

function updateYuiProfileDisplay() {
    const characterName = yuiData.characterName || "Yui"; // Fallback to "Yui" if undefined

    yuiNameDisplay.textContent = characterName;
    if (chatHeaderTitle) chatHeaderTitle.textContent = characterName;
    yuiFriendshipStageDisplay.textContent = yuiData.friendshipStage;
    yuiAvatarInitials.textContent = characterName.substring(0,1).toUpperCase();

    // Update dynamic titles
    if (yuiStatusPanelTitle) yuiStatusPanelTitle.textContent = `${characterName}'s Status`;
    if (yuiEmotionPanelTitle) yuiEmotionPanelTitle.textContent = `${characterName}'s Reaction`;
    if (dashboardViewTitle) dashboardViewTitle.textContent = `${characterName}'s Dashboard`;


    updateYuiStatusPanel(); // This updates mood, last active, memory count
    // Update user profile panel (name and preferences)
    userNameDisplay.textContent = yuiData.userName; // Update user name in sidebar

    // Update Yui's Status Panel
    updateYuiStatusPanel();

    // Update User Preferences Display
    userPrefFood.textContent = yuiData.userPreferences.food || '-';
    userPrefColor.textContent = yuiData.userPreferences.color || '-';
    userPrefGame.textContent = yuiData.userPreferences.games || '-';
    userPrefAnime.textContent = yuiData.userPreferences.anime || '-';

    // Change avatar appearance based on mood/stage
    let gradient = 'linear-gradient(135deg, #555, #333)'; // Default
    let borderColor = '#444';

    if (yuiData.friendshipStage === "Enemy") {
        gradient = 'linear-gradient(135deg, #700, #300)';
        borderColor = '#a00';
    } else if (yuiData.affectionLevel > 70 && yuiData.trustLevel > 60) { // Happy/Close
        gradient = 'linear-gradient(135deg, #ff8c94, #ffc0cb)'; // Softer pinks
        borderColor = '#f06292';
    } else if (yuiData.affectionLevel < 20 && yuiData.trustLevel < 30) { // Distant/Wary
        gradient = 'linear-gradient(135deg, #6c7a89, #4b5c6b)'; // Cooler grays
        borderColor = '#8c9eff'; // A slightly contrasting border
    }
    yuiAvatar.style.background = gradient;
    yuiAvatar.style.borderColor = borderColor;
}

function updateYuiStatusPanel() {
    // Determine Mood
    let mood = "Neutral";
    if (yuiData.affectionLevel > 70 && yuiData.trustLevel > 50) mood = "Happy";
    else if (yuiData.affectionLevel > 50 && yuiData.trustLevel > 30) mood = "Content";
    else if (yuiData.affectionLevel < 30 && yuiData.trustLevel < 40) mood = "Wary";
    else if (yuiData.friendshipStage === "Enemy") mood = "Hostile";
    else if (yuiData.affectionLevel < 20) mood = "Annoyed";
    yuiMoodDisplay.textContent = mood;

    // Last Active
    if (yuiData.lastInteractionTimestamp) {
        yuiLastActiveDisplay.textContent = new Date(yuiData.lastInteractionTimestamp).toLocaleTimeString();
    } else {
        yuiLastActiveDisplay.textContent = "Never";
    }

    // Memory Count
    yuiMemoryCountDisplay.textContent = yuiData.memory.length;
}

function recordKeyEvent(eventDescription) {
    yuiData.keyEvents.push({
        timestamp: new Date().toISOString(),
        event: eventDescription,
        affection: yuiData.affectionLevel,
        trust: yuiData.trustLevel,
        stage: yuiData.friendshipStage
    });
    if (yuiData.keyEvents.length > 50) yuiData.keyEvents.shift();
    updateDashboardUIData(); // Update milestones on dashboard
}

// --- Dashboard Logic ---
function initializeCharts() {
    const chartFontColor = getChartFontColor(currentSettings.theme);
    // const chartBorderColor = getChartBorderColor(currentSettings.theme); // Grid line colors are set per-axis

    Chart.defaults.color = chartFontColor;
    // Chart.defaults.borderColor = chartBorderColor; // This is a global setting, better to set per axis grid

    const affectionCtx = document.getElementById('affectionChart').getContext('2d');
    affectionChartInstance = new Chart(affectionCtx, {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Affection', data: [], borderColor: 'rgb(255, 99, 132)', tension: 0.4, pointRadius: 3, pointBackgroundColor: 'rgb(255,99,132)', pointHitRadius: 10 }] },
        options: { 
            scales: { 
                y: { 
                    beginAtZero: true, 
                    max: 100,
                    grid: { color: getChartBorderColor(currentSettings.theme) } 
                }, 
                x: { 
                    ticks: { autoSkip: true, maxTicksLimit: 15 },
                    grid: { color: getChartBorderColor(currentSettings.theme) } 
                } 
            }, 
            responsive: true, 
            maintainAspectRatio: false 
        }
    });

    const trustCtx = document.getElementById('trustChart').getContext('2d');
    trustChartInstance = new Chart(trustCtx, {
        type: 'line', 
        data: { labels: [], datasets: [{ label: 'Trust', data: [], borderColor: 'rgb(54, 162, 235)', tension: 0.4, pointRadius: 3, pointBackgroundColor: 'rgb(54,162,235)', pointHitRadius: 10 }] },
        options: { 
            scales: { 
                y: { 
                    beginAtZero: true, 
                    max: 100,
                    grid: { color: getChartBorderColor(currentSettings.theme) }
                }, 
                x: { 
                    ticks: { autoSkip: true, maxTicksLimit: 15 },
                    grid: { color: getChartBorderColor(currentSettings.theme) }
                } 
            }, 
            responsive: true, 
            maintainAspectRatio: false 
        }
    });
}

function updateDashboard() {
    log.debug("Renderer: Updating dashboard.");
    if (!views.dashboard.classList.contains('active-view')) {
        log.debug("Renderer: Dashboard view not active, skipping update.");
        return; // Don't update if not visible
    }

    // Update Total Interactions
    if (totalInteractionsDisplay) {
        totalInteractionsDisplay.textContent = yuiData.memory.length;
    }

    // Update Relationship Milestones
    if (relationshipMilestonesList) {
        relationshipMilestonesList.innerHTML = ''; // Clear existing
        if (yuiData.keyEvents && Array.isArray(yuiData.keyEvents)) {
            const milestonesToDisplay = yuiData.keyEvents.slice(-5).reverse(); // Get last 5, newest first

            milestonesToDisplay.forEach(event => {
                const li = document.createElement('li');
                if (event && event.timestamp && typeof event.event === 'string') { // Changed from event.description
                    try {
                        const dateString = new Date(event.timestamp).toLocaleDateString();
                        li.textContent = `${dateString}: ${event.event}`; // Changed from event.description
                    } catch (e) {
                        log.error('Renderer: Error formatting milestone date for event:', event, e);
                        li.textContent = `Error in event data: ${event.event || 'Unknown event'}`; // Changed from event.description
                    }
                } else {
                    log.warn('Renderer: Invalid or incomplete event found in keyEvents:', event);
                    li.textContent = "Milestone data is corrupted or incomplete.";
                }
                relationshipMilestonesList.appendChild(li);
            });

            if (milestonesToDisplay.length === 0 && yuiData.keyEvents.length === 0) {
                // This condition means there were truly no events at all.
            }
        } else {
            log.warn('Renderer: yuiData.keyEvents is not a valid array or is missing.');
        }

        if (relationshipMilestonesList.children.length === 0 && (!yuiData.keyEvents || yuiData.keyEvents.length === 0)) {
            const li = document.createElement('li');
            li.textContent = "No milestones recorded yet.";
            relationshipMilestonesList.appendChild(li);
        } else if (relationshipMilestonesList.children.length === 0 && yuiData.keyEvents && yuiData.keyEvents.length > 0) {
            const li = document.createElement('li');
            li.textContent = "Could not display milestones due to data issues.";
            relationshipMilestonesList.appendChild(li);
        }
    }

    // Update User Sentiment Overview
    if (userSentimentOverview) {
        if (yuiData.sentimentHistory && yuiData.sentimentHistory.length > 0) {
            const recentSentiments = yuiData.sentimentHistory.slice(-10); // Analyze last 10 sentiments
            const averageSentiment = recentSentiments.reduce((acc, curr) => acc + curr.score, 0) / recentSentiments.length;
            
            let sentimentText = "Recently: ";
            if (averageSentiment > 0.35) {
                sentimentText += "Overwhelmingly Positive";
            } else if (averageSentiment > 0.1) {
                sentimentText += "Generally Positive";
            } else if (averageSentiment < -0.35) {
                sentimentText += "Overwhelmingly Negative";
            } else if (averageSentiment < -0.1) {
                sentimentText += "Generally Negative";
            } else {
                sentimentText += "Neutral / Mixed";
            }
            userSentimentOverview.textContent = `${sentimentText} (Avg: ${averageSentiment.toFixed(2)})`;
        } else {
            userSentimentOverview.textContent = "No sentiment data recorded yet.";
        }
    }


    // Update Affection Chart
    if (affectionChartInstance && yuiData.affectionHistory) { // Corrected condition
        const affectionLabels = yuiData.affectionHistory.map(entry => 
            new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        const affectionData = yuiData.affectionHistory.map(entry => entry.value);

        affectionChartInstance.data.labels = affectionLabels;
        affectionChartInstance.data.datasets[0].data = affectionData;
        affectionChartInstance.update();
        log.debug("Renderer: Affection chart updated.");
    } else {
        log.debug("Renderer: Affection chart instance or history not available for update.");
    }

    // Update Trust Chart
    if (trustChartInstance && yuiData.trustHistory) { // Corrected condition
        const trustLabels = yuiData.trustHistory.map(entry => 
            new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        );
        const trustData = yuiData.trustHistory.map(entry => entry.value);

        trustChartInstance.data.labels = trustLabels;
        trustChartInstance.data.datasets[0].data = trustData;
        trustChartInstance.update();
        log.debug("Renderer: Trust chart updated.");
    } else {
        log.debug("Renderer: Trust chart instance or history not available for update.");
    }
    log.debug("Renderer: Dashboard update complete.");
}

function updateDashboardUIData() {
    // Total Interactions
    totalInteractionsDisplay.textContent = yuiData.memory.length;

    // Relationship Milestones
    relationshipMilestonesList.innerHTML = ''; // Clear existing
    const milestones = yuiData.keyEvents.filter(event => event.event.includes("Friendship stage changed"));
    if (milestones.length === 0) {
        relationshipMilestonesList.innerHTML = '<li>No milestones yet.</li>';
    } else {
        milestones.slice(-5).reverse().forEach(event => { // Show last 5
            const li = document.createElement('li');
            li.textContent = `${new Date(event.timestamp).toLocaleDateString()} ${new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}: ${event.event} (Aff: ${event.affection}, Trust: ${event.trust})`;
            relationshipMilestonesList.appendChild(li);
        });
    }
    
    // User Sentiment (Placeholder - for future implementation)
    // For now, just a static message or simple calculation if possible
    // const avgSentiment = calculateAverageUserSentiment(); // Placeholder function
    // userSentimentOverview.textContent = `Overall user sentiment: ${avgSentiment > 0 ? 'Positive' : avgSentiment < 0 ? 'Negative' : 'Neutral'}`;
    userSentimentOverview.textContent = "Sentiment analysis not yet implemented.";

    // Update Key Info (User Preferences on Dashboard)
    const keyInfoUl = document.getElementById('yuiKeyInfo');
    keyInfoUl.innerHTML = '';
    const prefs = yuiData.userPreferences;
    if(prefs.food) keyInfoUl.innerHTML += `<li>User's Fav Food: ${prefs.food}</li>`;
    if(prefs.color) keyInfoUl.innerHTML += `<li>User's Fav Color: ${prefs.color}</li>`;
    if(prefs.games) keyInfoUl.innerHTML += `<li>User's Fav Games: ${prefs.games}</li>`;
    if(prefs.anime) keyInfoUl.innerHTML += `<li>User's Fav Anime: ${prefs.anime}</li>`;
    keyInfoUl.innerHTML += '<li style="margin-top:10px; font-weight:bold;">--- Recent Key Events ---</li>';
    yuiData.keyEvents.slice(-5).reverse().forEach(event => {
        const eventItem = document.createElement('li');
        eventItem.textContent = `${new Date(event.timestamp).toLocaleDateString()} ${new Date(event.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}: ${event.event} (A:${event.affection}, T:${event.trust}, S:${event.stage})`;
        keyInfoUl.appendChild(eventItem);
    });
}

function getChartFontColor(theme) {
    switch (theme) {
        case 'light-mode':
            return '#333333';
        case 'cyberpunk-dream':
            return '#00f0ff';
        case 'oled-black':
            return '#e0e0e0';
        case 'ocean-vibe':
            return '#e0f7fa';
        case 'retro-gaming':
            return '#00ff00';
        case 'purple-haze':
            return '#e6e6fa';
        case 'stoners-paradise':
            return '#e8f5e9';
        case 'green-leaf-vibes':
            return '#e8f5e9';
        case 'default-dark':
        default:
            return '#ccc';
    }
}

function getChartBorderColor(theme) {
    switch (theme) {
        case 'light-mode':
            return '#dddddd';
        case 'cyberpunk-dream':
            return '#ff00ff';
        case 'oled-black':
            return '#333333';
        case 'ocean-vibe':
            return '#0099cc';
        case 'retro-gaming':
            return '#ffc947';
        case 'purple-haze':
            return '#ab47bc';
        case 'stoners-paradise':
            return '#6b8e23';
        case 'green-leaf-vibes':
            return '#4caf50';
        case 'default-dark':
        default:
            return '#444';
    }
}

function updateChartColors(theme) {
    const fontColor = getChartFontColor(theme);
    const gridBorderColor = getChartBorderColor(theme); // Use this for grid lines

    Chart.defaults.color = fontColor;
    // Chart.defaults.borderColor is too general; set grid color per axis

    if (affectionChartInstance) {
        affectionChartInstance.options.scales.x.ticks.color = fontColor;
        affectionChartInstance.options.scales.y.ticks.color = fontColor;
        affectionChartInstance.options.scales.x.grid.color = gridBorderColor;
        affectionChartInstance.options.scales.y.grid.color = gridBorderColor;
        // Update dataset properties if needed, e.g., point colors if they depend on theme
        affectionChartInstance.update();
    }
    if (trustChartInstance) {
        trustChartInstance.options.scales.x.ticks.color = fontColor;
        trustChartInstance.options.scales.y.ticks.color = fontColor;
        trustChartInstance.options.scales.x.grid.color = gridBorderColor;
        trustChartInstance.options.scales.y.grid.color = gridBorderColor;
        // Update dataset properties if needed
        trustChartInstance.update();
    }
}

// Enhance pruneMemories function to use NLP for more intelligent memory management
function pruneMemories() {
    if (yuiData.memory.length <= yuiData.maxMemoryTurns) {
        return; // No need to prune yet
    }
    
    // Keep recent messages intact
    const recentMessages = yuiData.memory.slice(-Math.floor(yuiData.maxMemoryTurns * 0.7));
    
    // For older messages, score using NLP features
    const olderMessages = yuiData.memory.slice(0, -Math.floor(yuiData.maxMemoryTurns * 0.7));
    
    // Score each message for importance using Compromise
    const scoredMessages = olderMessages.map(msg => {
        const text = msg.parts[0].text;
        const doc = nlp(text);
        let score = 0;
        
        // Check for user preferences/personal info
        if (doc.match('(favorite|like|love|prefer|my) (#Noun|#Adjective)').length > 0) {
            score += 5;
        }
        
        // Score messages containing emotions
        if (doc.match('#Emotion').length > 0) {
            score += 3;
        }
        
        // Score messages containing questions and answers
        if (doc.questions().length > 0) {
            score += 2;
        }
        
        // Score messages mentioning relationship terminology
        if (doc.match('(friend|trust|relationship|close|care|feel)').length > 0) {
            score += 4;
        }
        
        // Longer messages likely contain more information
        score += Math.min(3, Math.floor(text.length / 80));
        
        return { message: msg, score };
    });
    
    // Sort by score and keep top messages
    const remainingSlots = yuiData.maxMemoryTurns - recentMessages.length;
    const topOlderMessages = scoredMessages
        .sort((a, b) => b.score - a.score)
        .slice(0, remainingSlots)
        .map(item => item.message);
    
    // Update memory with pruned version
    yuiData.memory = [...topOlderMessages, ...recentMessages];
}

// ADDED: New function to update Yui's emotion face display
function updateEmotionDisplay(trustChange, affectionChange, sentimentScore) {
    if (!yuiEmotionFace) return;

    let face = '😐'; // Default Neutral

    // Ensure inputs are numbers, default to 0 if not.
    const tc = Number(trustChange) || 0;
    const ac = Number(affectionChange) || 0;
    // Treat null sentimentScore (e.g. initial load) as neutral (0) for this logic
    const ss = sentimentScore !== null ? Number(sentimentScore) : 0;

    // Determine face based on changes and sentiment
    // Priority to strong reactions
    if ((ac >= 3.5 && tc >= -0.5) || (tc >= 3.5 && ac >= -0.5) || (ac >= 2 && tc >= 2) || (ss > 0.65 && (ac > 0.5 || tc > 0.5))) {
        face = '😊'; // Very Happy / Ecstatic
    } else if ((ac <= -3.5 && tc <= 0.5) || (tc <= -3.5 && ac <= 0.5) || (ac < -1.5 && tc < -1.5) || (ss < -0.65 && (ac < -0.5 || tc < -0.5))) {
        if (ac < tc) { // If affection drop is more significant or equal
            face = '😢'; // Sad / Crying
        } else {
            face = '😠'; // Angry / Very Annoyed
        }
    }
    // Mild positive reactions
    else if ((ac > 0.5 && tc >= -1) || (tc > 0.5 && ac >= -1) || (ss > 0.25 && (ac >= 0 || tc >= 0))) {
        face = '🙂'; // Pleased / Slight Smile (using a different one for variety)
                     // Could also use '😏' for a more tsundere smirk on mild positive.
    }
    // Mild negative reactions
    else if ((ac < -0.5 && tc <= 1) || (tc < -0.5 && ac <= 1) || (ss < -0.25 && (ac <= 0 || tc <= 0))) {
        face = '😟'; // Frown / Displeased
    }
    // Default to neutral for very small or conflicting changes not caught above
    else {
        face = '😐';
    }

    yuiEmotionFace.textContent = face;
}

// --- Proactive Engagement Logic ---
async function tryProactiveAction() {
    log.info('Renderer: Attempting proactive action.');
    if (!window.memoryManager || !currentSettings.apiKey) {
        log.warn('Renderer: Proactive action skipped (no memory manager or API key).');
        return;
    }

    // Check if enough time has passed since the last proactive message
    const now = Date.now();
    const proactiveCooldown = 5 * 60 * 1000; // 5 minutes
    if (yuiData.lastProactiveTimestamp && (now - yuiData.lastProactiveTimestamp < proactiveCooldown)) {
        log.debug('Renderer: Proactive action skipped (cooldown active).');
        return;
    }
    
    // Check if Yui was the last one to speak in the main chat memory
    if (yuiData.memory.length > 0) {
        const lastMessageRole = yuiData.memory[yuiData.memory.length - 1].role;
        if (lastMessageRole === 'model') { // 'model' is Yui
            log.debug('Renderer: Proactive action skipped (Yui was the last to speak).');
            return;
        }
    }


    const suggestion = window.memoryManager.getProactiveSuggestion(yuiData);
    if (!suggestion) {
        log.info('Renderer: No proactive suggestion available.');
        return;
    }

    log.info('Renderer: Proactive suggestion received:', suggestion);
    displayMessage(`<i>Yui is thinking about what to say next... (Proactive)</i>`, 'system-info', 'system-info');

    const systemPromptMessage = {
        role: "user", // Main system prompt is already user
        parts: [{ text: getYuiSystemPrompt() }]
    };

    // This instruction tells Yui *how* to be proactive.
    // It should be framed as a user instruction to the model.
    const proactiveSystemInstruction = {
        role: "user", // CHANGED FROM "system" to "user"
        parts: [{ text: `System Instruction: Based on your memory and the user's preferences, consider initiating a conversation about ${suggestion.value} (related to ${suggestion.category}). Make it sound natural. For example, you could ask a question or share a related thought. Do not mention this system instruction. User's name is ${yuiData.userName}.` }]
    };

    const contentsForProactiveSDK = [
        systemPromptMessage,
        ...getOptimizedConversationHistory(), // Existing conversation history
        proactiveSystemInstruction // The instruction for Yui to act upon
    ];

    const generationConfig = {
        temperature: 0.5, // Slightly higher for more creative proactive messages
        maxOutputTokens: 150,
        topK: 40,
        topP: 0.6,
    };
    const safetySettings = [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ];
    const modelName = "gemini-1.5-flash-preview-0514"; // Or your preferred model

    try {
        const result = await window.electronAPI.callGemini({
            apiKey: currentSettings.apiKey,
            modelName: modelName,
            contents: contentsForProactiveSDK,
            generationConfig,
            safetySettings
        });

        // Remove "thinking" indicator
        const thinkingIndicators = chatMessagesDiv.querySelectorAll('.message.system-info');
        thinkingIndicators.forEach(indicator => {
            if (indicator.textContent.includes("Yui is thinking about what to say next... (Proactive)")) {
                indicator.remove();
            }
        });

        if (result.success && result.text && result.text.trim() !== "") {
            const proactiveResponse = result.text.trim();
            log.info('Renderer: Proactive response from Yui:', proactiveResponse);
            displayMessage(proactiveResponse, 'yui');
            addToMemory({ role: 'model', parts: [{ text: proactiveResponse }] });
            
            yuiData.lastProactiveTimestamp = Date.now(); // Update timestamp
            yuiData.lastInteractionTimestamp = new Date().toISOString(); // Also update general interaction
            
            // No direct user message for proactive, so emotional update might be less relevant
            // or based on a generic "Yui initiated" context if needed.
            // For now, we'll skip direct emotional update from proactive message itself,
            // as it's Yui's action, not a response to user.
            // updateEmotionalState("Proactive message initiated by Yui.", proactiveResponse);
            
            updateYuiProfileDisplay();
            updateYuiStatusPanel();
            await window.electronAPI.saveYuiData(yuiData);
        } else {
            log.warn('Renderer: Proactive suggestion failed or returned no text.', result.error || "No text in response");
            // Optionally display a subtle failure or just log it
        }
    } catch (error) {
        log.error('Renderer: Error during proactive API call:', error);
        const thinkingIndicators = chatMessagesDiv.querySelectorAll('.message.system-info');
        thinkingIndicators.forEach(indicator => {
            if (indicator.textContent.includes("Yui is thinking about what to say next... (Proactive)")) {
                indicator.remove();
            }
        });
        // Optionally display a subtle failure
    }
}

// --- Start the app ---
document.addEventListener('DOMContentLoaded', initializeApp);
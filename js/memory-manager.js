/**
 * Advanced Memory Management System for Yui Chat Bot
 * Provides long-term memory storage and semantic search capabilities
 */

// Ensure 'log' is available, similar to renderer.js
// Prefix logs from this module with [MM] for clarity if using a shared log object.
// If window.log is already defined by renderer.js, this will use it.
// Otherwise, it creates a local one that tries to use electronAPI.
let mmLog;
if (window.log && typeof window.log.info === 'function') {
    // Use existing global log if available
    mmLog = {
        info: (message, ...args) => window.log.info(`[MM] ${message}`, ...args),
        warn: (message, ...args) => window.log.warn(`[MM] ${message}`, ...args),
        error: (message, ...args) => window.log.error(`[MM] ${message}`, ...args),
        debug: (message, ...args) => window.log.debug(`[MM] ${message}`, ...args),
    };
} else if (window.electronAPI && window.electronAPI.logMessage) {
    mmLog = {
        info: (message, ...args) => window.electronAPI.logMessage('info', `[MM] ${message}`, ...args).catch(console.error),
        warn: (message, ...args) => window.electronAPI.logMessage('warn', `[MM] ${message}`, ...args).catch(console.error),
        error: (message, ...args) => window.electronAPI.logMessage('error', `[MM] ${message}`, ...args).catch(console.error),
        debug: (message, ...args) => window.electronAPI.logMessage('debug', `[MM] ${message}`, ...args).catch(console.error),
    };
    mmLog.info("Logger initialized for memory-manager directly via electronAPI.");
} else { 
    // Fallback if electronAPI is not ready or available (should not happen in normal flow)
    mmLog = {
        info: (m, ...a) => console.info("[MM-Fallback]", m, ...a),
        warn: (m, ...a) => console.warn("[MM-Fallback]", m, ...a),
        error: (m, ...a) => console.error("[MM-Fallback]", m, ...a),
        debug: (m, ...a) => console.debug("[MM-Fallback]", m, ...a),
    };
    mmLog.warn("Electron API for logging not found, falling back to console for memory-manager.");
}

// Memory Pools
let memoryPools = {
    // Facts the user has shared about themselves
    userFacts: [],
    
    // Important conversations or events
    keyConversations: [],
    
    // Emotional moments between user and Yui
    emotionalMoments: [],
    
    // Yui's personal experiences and reflections
    yuiExperiences: [],

    // Knowledge Graph:
    // nodes: Map<string, {id: string, label: string, type: string, count: number}>
    // edges: Set<string> (e.g., "user_likes_pizza")
    knowledgeGraph: { nodes: new Map(), edges: new Set() }
};

/**
 * Normalizes an entity ID for consistency.
 * @param {string} id - The raw ID.
 * @returns {string} - The normalized ID.
 */
function normalizeEntityId(id) {
    return String(id).toLowerCase().replace(/\s+/g, '_');
}

/**
 * Adds a node to the knowledge graph.
 * @param {string} id - The raw ID of the node.
 * @param {string} label - The display label for the node.
 * @param {string} type - The type of the node (e.g., 'food', 'person', 'concept').
 */
function addKgNode(id, label, type) {
    const nodeId = normalizeEntityId(id);
    if (!memoryPools.knowledgeGraph.nodes.has(nodeId)) {
        memoryPools.knowledgeGraph.nodes.set(nodeId, { id: nodeId, label: label, type: normalizeEntityId(type), count: 1 });
        mmLog.debug(`KG: Added node - ID: ${nodeId}, Label: ${label}, Type: ${type}`);
    } else {
        const node = memoryPools.knowledgeGraph.nodes.get(nodeId);
        node.count += 1;
        if (type && normalizeEntityId(type) !== 'thing' && node.type === 'thing') { // Update type if a more specific one is found
            node.type = normalizeEntityId(type);
        }
        memoryPools.knowledgeGraph.nodes.set(nodeId, node);
    }
}

/**
 * Adds an edge to the knowledge graph.
 * @param {string} sourceIdRaw - The raw ID of the source node.
 * @param {string} targetIdRaw - The raw ID of the target node.
 * @param {string} relationshipLabel - The label for the relationship (e.g., 'likes', 'is_a', 'has_favorite_food').
 */
function addKgEdge(sourceIdRaw, targetIdRaw, relationshipLabel) {
    const sourceId = normalizeEntityId(sourceIdRaw);
    const targetId = normalizeEntityId(targetIdRaw);
    const edgeKey = `${sourceId}_${normalizeEntityId(relationshipLabel)}_${targetId}`;

    if (!memoryPools.knowledgeGraph.edges.has(edgeKey)) {
        memoryPools.knowledgeGraph.edges.add(edgeKey);
        mmLog.debug(`KG: Added edge - ${sourceId} --(${relationshipLabel})--> ${targetId}`);
    }
}


/**
 * Extracts knowledge graph data from an NLP document.
 * @param {object} doc - The NLP document (from Compromise.js).
 * @param {string} sourceEntityLabel - The label of the source entity for these facts (e.g., 'user', 'Yui').
 * @param {object} currentYuiData - Current Yui data, used for context like userName.
 */
function extractKnowledgeGraphData(doc, sourceEntityLabel, currentYuiData) {
    const sourceNodeId = normalizeEntityId(sourceEntityLabel === 'user' ? (currentYuiData.userName || 'user') : (currentYuiData.characterName || 'yui'));
    addKgNode(sourceNodeId, sourceEntityLabel === 'user' ? (currentYuiData.userName || 'User') : (currentYuiData.characterName || 'Yui'), 'person');

    // Pattern 1: "My favorite X is Y" or "My X is Y" (when X is a known category)
    // e.g., "My favorite food is pizza", "My color is blue"
    doc.match(`(my|i) (favorite|favourite)? #Noun+ (is|are) (#Noun+|#ProperNoun+|#Adjective+)`).forEach(match => {
        const parts = match.terms();
        let categoryNoun = '';
        let value = '';
        let isReached = false;
        for(let i = 0; i < parts.length; i++) {
            if (parts[i].text === 'is' || parts[i].text === 'are') {
                isReached = true;
                if (i > 0 && parts[i-1].tags.includes('Noun')) categoryNoun = parts[i-1].text;
                if (i < parts.length -1) value = parts.slice(i+1).map(t => t.text).join(' ');
                break;
            }
        }
        if (!categoryNoun && parts.length > 2 && parts[1].tags.includes('Noun')) { // "My food is pizza"
             categoryNoun = parts[1].text;
        }


        if (categoryNoun && value) {
            const relationship = `has_favorite_${normalizeEntityId(categoryNoun)}`;
            addKgNode(value, value, categoryNoun);
            addKgEdge(sourceNodeId, value, relationship);
            mmLog.info(`KG: ${sourceNodeId} ${relationship} ${value} (type: ${categoryNoun})`);
        } else if (value && !categoryNoun && match.has('(color|food|game|anime|movie|book|song|music)')) { // "My favorite is pizza" (if context implies food)
            const impliedCategory = match.match('(color|food|game|anime|movie|book|song|music)').text();
            if (impliedCategory) {
                const relationship = `has_favorite_${normalizeEntityId(impliedCategory)}`;
                addKgNode(value, value, impliedCategory);
                addKgEdge(sourceNodeId, value, relationship);
                mmLog.info(`KG: ${sourceNodeId} ${relationship} ${value} (type: ${impliedCategory}, implied)`);
            }
        }
    });

    // Pattern 2: "I like Y", "I love Y", "I enjoy Y"
    doc.match(`(i|me) (like|love|enjoy|prefer|adore|hate|dislike) (#Noun+|#ProperNoun+|#Activity+)`).forEach(match => {
        const likedEntity = match.match('(#Noun+|#ProperNoun+|#Activity+)').text();
        const relationship = match.match('(like|love|enjoy|prefer|adore)').found ? 'likes' : 'dislikes';
        if (likedEntity) {
            addKgNode(likedEntity, likedEntity, 'thing'); // Default type 'thing', can be refined
            addKgEdge(sourceNodeId, likedEntity, relationship);
            mmLog.info(`KG: ${sourceNodeId} ${relationship} ${likedEntity}`);
        }
    });

    // Pattern 3: "X is a Y" or "X are Y" (simple 'is_a' relationship)
    doc.match(`(#Noun+|#ProperNoun+) (is|are) (a|an)? (#Noun+|#Adjective+)`).forEach(match => {
        const entity1 = match.group(1).text();
        const entity2 = match.group(4).text(); // Use group 4 to capture the noun/adjective after "a/an"
        if (entity1 && entity2 && normalizeEntityId(entity1) !== sourceNodeId) { // Avoid "User is a user"
            addKgNode(entity1, entity1, entity2); // entity2 becomes the type of entity1
            addKgNode(entity2, entity2, 'category'); // entity2 itself is a category
            addKgEdge(entity1, entity2, 'is_a');
            mmLog.info(`KG: ${entity1} is_a ${entity2}`);
        }
    });
}


/**
 * Processes a conversation and extracts memories to store
 * @param {string} userText - User's message
 * @param {string} yuiText - Yui's response
 * @param {object} currentYuiData - Current state of Yui
 */
function processConversationMemory(userText, yuiText, currentYuiData) {
    try {
        mmLog.debug('Processing conversation for memory extraction.');
        const userDoc = nlp(userText);
        const yuiDoc = nlp(yuiText);
        
        // Extract and store user facts
        extractUserFacts(userDoc, currentYuiData);
        
        // Check if this is an emotional moment
        checkForEmotionalMoment(userDoc, yuiDoc, userText, yuiText, currentYuiData);
        
        // Check if this is a key conversation 
        checkForKeyConversation(userDoc, yuiDoc, userText, yuiText, currentYuiData);
        
        // Extract Yui experiences (her own perspective)
        extractYuiExperience(yuiDoc, yuiText, currentYuiData);

        // Extract data for Knowledge Graph
        if (userText) extractKnowledgeGraphData(userDoc, 'user', currentYuiData);
        if (yuiText) extractKnowledgeGraphData(yuiDoc, 'yui', currentYuiData); // Yui can also state facts
        
        mmLog.debug('Finished processing conversation memory.');
        saveMemories(); // Save memories after processing
        
    } catch (error) {
        mmLog.error("Error processing conversation memory:", error.message, error.stack);
    }
}

/**
 * Extracts facts the user shares about themselves
 * @param {object} userDoc - NLP document of user message
 * @param {object} currentYuiData - Current Yui data state
 */
function extractUserFacts(userDoc, currentYuiData) {
    // Check for "I am", "I have", "My", "I like/love" statements
    const iStatements = userDoc.match('(i|me|my|mine) (am|is|was|have|had|like|love|hate|prefer) [0-10]');
    
    if (iStatements.length > 0) {
        iStatements.forEach(statement => {
            const factText = statement.out('text');
            
            // Don't store duplicates
            if (!memoryPools.userFacts.some(f => f.text === factText)) {
                memoryPools.userFacts.push({
                    text: factText,
                    timestamp: new Date().toISOString(),
                    affectionLevel: currentYuiData.affectionLevel,
                    trustLevel: currentYuiData.trustLevel
                });
                mmLog.info('Extracted user fact:', factText);
            }
        });
    }
}

/**
 * Identifies emotional moments in conversation
 * @param {object} userDoc - NLP document of user message
 * @param {object} yuiDoc - NLP document of Yui response
 * @param {string} userText - User message text
 * @param {string} yuiText - Yui response text
 * @param {object} currentYuiData - Current Yui data
 */
function checkForEmotionalMoment(userDoc, yuiDoc, userText, yuiText, currentYuiData) {
    // Check for emotional language
    const userEmotions = userDoc.match('#Emotion').out('array');
    const yuiEmotions = yuiDoc.match('#Emotion').out('array');
    const emotionWords = ['love', 'happy', 'sad', 'angry', 'scared', 'excited', 'nervous', 'proud', 'hurt'];
    
    // Check if either text contains strong emotional words
    const hasStrongEmotion = emotionWords.some(emotion => 
        userText.toLowerCase().includes(emotion) || yuiText.toLowerCase().includes(emotion)
    );
    
    // Check for expressions of feelings toward each other
    const userExpressesFeeling = userDoc.match('(i|me) [0-3] (love|like|hate|miss|care|trust) [0-3] you').length > 0;
    const yuiExpressesFeeling = yuiDoc.match('(i|me) [0-3] (love|like|hate|miss|care|trust) [0-3] you').length > 0;
    
    if (hasStrongEmotion || userExpressesFeeling || yuiExpressesFeeling || 
        userEmotions.length > 0 || yuiEmotions.length > 0) {
        
        memoryPools.emotionalMoments.push({
            userText,
            yuiText,
            timestamp: new Date().toISOString(),
            affectionLevel: currentYuiData.affectionLevel,
            trustLevel: currentYuiData.trustLevel,
            emotions: [...userEmotions, ...yuiEmotions]
        });
    }
}

/**
 * Identifies key conversations to remember
 * @param {object} userDoc - NLP document of user message
 * @param {object} yuiDoc - NLP document of Yui response
 * @param {string} userText - User message text
 * @param {string} yuiText - Yui response text
 * @param {object} currentYuiData - Current Yui data
 */
function checkForKeyConversation(userDoc, yuiDoc, userText, yuiText, currentYuiData) {
    // Check for various indicators of important conversation
    const isQuestion = userDoc.questions().length > 0;
    const isPersonal = userDoc.match('(family|childhood|past|future|dream|goal|ambition|hope|fear)').length > 0;
    const isPreference = userDoc.match('(favorite|prefer|like best|love|enjoy|dislike|hate)').length > 0;
    const isFuturePlan = userDoc.match('(tomorrow|weekend|later|next|plan|meet|date|event)').length > 0;
    
    // Score the conversation importance
    let importance = 0;
    if (isQuestion) importance += 1;
    if (isPersonal) importance += 2;
    if (isPreference) importance += 1;
    if (isFuturePlan) importance += 3;
    
    // If substantial affection or trust change happened, also important
    if (currentYuiData.affectionHistory.length >= 2) {
        const prevAffection = currentYuiData.affectionHistory[currentYuiData.affectionHistory.length - 2].value;
        if (Math.abs(currentYuiData.affectionLevel - prevAffection) >= 5) {
            importance += 3;
        }
    }
    
    // Store if important enough
    if (importance >= 2) {
        memoryPools.keyConversations.push({
            userText,
            yuiText,
            timestamp: new Date().toISOString(),
            importance,
            affectionLevel: currentYuiData.affectionLevel,
            trustLevel: currentYuiData.trustLevel
        });
    }
}

/**
 * Extracts experiences from Yui's perspective
 * @param {object} yuiDoc - NLP document of Yui response
 * @param {string} yuiText - Yui response text
 * @param {object} currentYuiData - Current Yui data
 */
function extractYuiExperience(yuiDoc, yuiText, currentYuiData) {
    // Check if Yui is sharing something about herself
    const yuiSelfReference = yuiDoc.match('(i|me|my|mine) (#Adverb|#Adjective)? (#Verb|am|was|have|had) [0-5]').length > 0;
    
    if (yuiSelfReference) {
        memoryPools.yuiExperiences.push({
            text: yuiText,
            timestamp: new Date().toISOString(),
            affectionLevel: currentYuiData.affectionLevel,
            trustLevel: currentYuiData.trustLevel
        });
    }
}

/**
 * Retrieves memories relevant to the current conversation
 * @param {string} currentTopic - Current conversation topic
 * @returns {object} - Relevant memories from each pool
 */
function getRelevantMemories(currentTopic) {
    const relevantMemories = {
        userFacts: [],
        emotionalMoments: [],
        keyConversations: [],
        yuiExperiences: []
    };
    
    // Simple keyword-based relevance for now
    // In a real implementation, you'd use embedding similarity search
    const keywords = currentTopic.toLowerCase().split(/\s+/).filter(k => k.length > 0);
    
    // Iterate only over the keys defined in relevantMemories, which correspond to array-based pools
    for (const poolName in relevantMemories) {
        if (memoryPools.hasOwnProperty(poolName) && Array.isArray(memoryPools[poolName])) {
            const currentPoolData = memoryPools[poolName];
            for (const memory of currentPoolData) {
                let text = '';
                if (poolName === 'emotionalMoments' || poolName === 'keyConversations') {
                    text = (memory.userText || '') + ' ' + (memory.yuiText || '');
                } else if (memory.hasOwnProperty('text')) {
                    text = memory.text || '';
                } else {
                    mmLog.warn(`Memory item in pool '${poolName}' is missing 'text' property:`, memory);
                    continue; 
                }

                if (typeof text !== 'string') {
                    mmLog.warn(`Memory item in pool '${poolName}' has non-string text content:`, memory);
                    continue;
                }
                
                const relevance = keywords.reduce((score, keyword) => 
                    text.toLowerCase().includes(keyword) ? score + 1 : score, 0
                );
                
                if (relevance > 0) {
                    relevantMemories[poolName].push({
                        ...memory,
                        relevance
                    });
                }
            }
            
            // Sort by relevance and take top 3
            relevantMemories[poolName].sort((a, b) => b.relevance - a.relevance);
            relevantMemories[poolName] = relevantMemories[poolName].slice(0, 3);
        } else {
            mmLog.warn(`Memory pool '${poolName}' is missing in memoryPools or is not an array.`);
        }
    }
    
    return relevantMemories;
}

/**
 * Creates a memory recap for the system prompt
 * @param {string} currentTopic - Current conversation topic
 * @param {object} currentYuiData - The current yuiData object from renderer.js
 * @returns {string} - Memory recap text for system prompt
 */
function createMemoryRecap(currentTopic, currentYuiData) { // ADDED currentYuiData parameter
    const relevantMemories = getRelevantMemories(currentTopic);
    let recap = "Previous relevant memories:\n";
    
    // User facts
    if (relevantMemories.userFacts.length > 0) {
        recap += "- User facts: " + 
            relevantMemories.userFacts.map(f => f.text).join("; ") + "\n";
    }
    
    // Emotional moments
    if (relevantMemories.emotionalMoments.length > 0) {
        recap += "- Emotional moments: " + 
            relevantMemories.emotionalMoments.map(m => 
                `User said "${m.userText}" and you responded "${m.yuiText}"`
            ).join("; ") + "\n";
    }
    
    // Key conversations
    if (relevantMemories.keyConversations.length > 0) {
        recap += "- Important discussions: " + 
            relevantMemories.keyConversations.map(c => 
                `You discussed "${c.userText.substring(0, 50)}..."`
            ).join("; ") + "\n";
    }
    
    // Yui's experiences
    if (relevantMemories.yuiExperiences.length > 0) {
        recap += "- Your past statements: " + 
            relevantMemories.yuiExperiences.map(e => 
                `You said "${e.text.substring(0, 50)}..."`
            ).join("; ") + "\n";
    }

    // Knowledge Graph Insights for User
    let kgUserInsights = [];
    // Use currentYuiData passed as parameter
    const userNameNormalized = normalizeEntityId(currentYuiData && currentYuiData.userName ? currentYuiData.userName : 'user');

    memoryPools.knowledgeGraph.edges.forEach(edgeKey => {
        const [source, relationship, target] = edgeKey.split(/_(.+)/s).filter(Boolean); // Split only on the first underscore of relationship
        if (source === userNameNormalized) {
            const targetNode = memoryPools.knowledgeGraph.nodes.get(target);
            const targetLabel = targetNode ? targetNode.label : target;
            let readableRelationship = relationship.replace(/_/g, ' ');
            if (readableRelationship.startsWith('has favorite')) {
                kgUserInsights.push(`User's ${readableRelationship.replace('has favorite ', 'favorite ')} is ${targetLabel}.`);
            } else {
                kgUserInsights.push(`User ${readableRelationship} ${targetLabel}.`);
            }
        }
    });

    if (kgUserInsights.length > 0) {
        recap += "- Key things about the user: " + kgUserInsights.slice(0, 5).join(" ") + "\n"; // Limit to 5 insights for brevity
    }
    
    return recap;
}

// Add memory saving/loading functions
function saveMemories() {
    try {
        const serializablePools = {
            ...memoryPools,
            knowledgeGraph: {
                nodes: Array.from(memoryPools.knowledgeGraph.nodes.entries()),
                edges: Array.from(memoryPools.knowledgeGraph.edges)
            }
        };
        localStorage.setItem('yuiMemoryPools', JSON.stringify(serializablePools));
        mmLog.info('Memories saved to localStorage.');
    } catch (error) {
        mmLog.error('Failed to save memories to localStorage:', error);
    }
}

function loadMemories() {
    try {
        const storedMemories = localStorage.getItem('yuiMemoryPools');
        if (storedMemories) {
            const loadedData = JSON.parse(storedMemories);
            
            // Simple merge: overwrite existing pools with loaded ones if they exist
            if (loadedData.userFacts) memoryPools.userFacts = loadedData.userFacts;
            if (loadedData.keyConversations) memoryPools.keyConversations = loadedData.keyConversations;
            if (loadedData.emotionalMoments) memoryPools.emotionalMoments = loadedData.emotionalMoments;
            if (loadedData.yuiExperiences) memoryPools.yuiExperiences = loadedData.yuiExperiences;

            if (loadedData.knowledgeGraph) {
                memoryPools.knowledgeGraph.nodes = new Map(loadedData.knowledgeGraph.nodes || []);
                memoryPools.knowledgeGraph.edges = new Set(loadedData.knowledgeGraph.edges || []);
            } else {
                memoryPools.knowledgeGraph = { nodes: new Map(), edges: new Set() };
            }
            mmLog.info('Memories loaded from localStorage.');
        } else {
            mmLog.info('No memories found in localStorage to load.');
            // Ensure KG is initialized if no stored data
            memoryPools.knowledgeGraph = { nodes: new Map(), edges: new Set() };
        }
    } catch (error) {
        mmLog.error('Failed to load memories from localStorage:', error);
        // Optionally, clear potentially corrupted data or reset to defaults
        // For now, we'll just log the error and continue with empty/default pools
        memoryPools.knowledgeGraph = { nodes: new Map(), edges: new Set() };
    }
}

function getProactiveSuggestion(currentYuiData) {
    mmLog.debug("MemoryManager: Getting proactive suggestion.");
    const suggestions = [];

    // 1. Check user preferences from yuiData
    if (currentYuiData && currentYuiData.userPreferences) {
        for (const category in currentYuiData.userPreferences) {
            const value = currentYuiData.userPreferences[category];
            if (value && typeof value === 'string' && value !== 'unknown' && value.trim() !== '') {
                suggestions.push({
                    type: 'preference',
                    category: category,
                    value: value,
                    // Crude recency: index of last mention in current short-term memory
                    recency: currentYuiData.memory ? currentYuiData.memory.findLastIndex(m => m.parts[0].text.toLowerCase().includes(value.toLowerCase())) : -1
                });
            }
        }
    }

    // 2. Check user facts from memoryPools (long-term memory)
    if (memoryPools.userFacts.length > 0) {
        memoryPools.userFacts.forEach(fact => {
            suggestions.push({
                type: 'userFact',
                text: fact.text,
                timestamp: new Date(fact.timestamp).getTime(),
                // Crude recency for facts based on current short-term memory
                recency: currentYuiData.memory ? currentYuiData.memory.findLastIndex(m => m.parts[0].text.toLowerCase().includes(fact.text.toLowerCase().substring(0, 20))) : -1
            });
        });
    }

    if (suggestions.length === 0) {
        mmLog.debug("MemoryManager: No proactive suggestions found initially.");
        return null;
    }

    // Prioritize suggestions:
    // - Prefer things not mentioned recently in short-term memory (lower recency index, or -1)
    // - For facts not in short-term memory, prefer older ones to bring them back.
    suggestions.sort((a, b) => {
        if (a.recency === -1 && b.recency !== -1) return -1; // a is better (not in recent memory)
        if (b.recency === -1 && a.recency !== -1) return 1;  // b is better
        if (a.recency !== -1 && b.recency !== -1) return a.recency - b.recency; // smaller index is less recent, better

        // If both are -1 (not in recent memory), for facts, prefer older ones by timestamp
        if (a.type === 'userFact' && b.type === 'userFact' && a.timestamp && b.timestamp) {
            return a.timestamp - b.timestamp; // older fact first
        }
        return 0; // Keep original order or randomize for ties
    });
    
    // Filter out suggestions that might be too recent from the main chat memory (e.g., in the last 5 turns)
    const minRecencyThreshold = currentYuiData.memory ? currentYuiData.memory.length - 5 : 0;
    const filteredSuggestions = suggestions.filter(s => s.recency === -1 || s.recency < minRecencyThreshold);

    if (filteredSuggestions.length === 0) {
         mmLog.debug("MemoryManager: No suitable non-recent proactive suggestions found after filtering.");
        return null;
    }

    // Pick one from the top 3 best (less recent or older) suggestions randomly
    const bestSuggestions = filteredSuggestions.slice(0, Math.min(3, filteredSuggestions.length));
    const chosenSuggestion = bestSuggestions[Math.floor(Math.random() * bestSuggestions.length)];
    
    mmLog.info("MemoryManager: Chosen proactive suggestion:", chosenSuggestion);
    return chosenSuggestion;
}

function clearAllMemories() {
    mmLog.info("Clearing all memory pools (userFacts, keyConversations, emotionalMoments, yuiExperiences, knowledgeGraph).");
    memoryPools = {
        userFacts: [],
        keyConversations: [],
        emotionalMoments: [],
        yuiExperiences: [],
        knowledgeGraph: { nodes: new Map(), edges: new Set() }
    };
    saveMemories(); // This will save the cleared state to localStorage
    // No need to update yuiData.memory here, renderer.js will handle its own short-term memory
}


// Export the memory management functions
window.memoryManager = {
    processConversationMemory,
    getRelevantMemories,
    createMemoryRecap,
    saveMemories,
    loadMemories,
    getProactiveSuggestion, // Added
    clearAllMemories // ADDED
};

// Ensure memories (including KG) are loaded when the script is initialized
loadMemories();
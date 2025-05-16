const fs = require('fs');
const path = require('path');
const util = require('util');

let logStream;
let logFilePathGlobal;
const MAX_LOG_SIZE_MB = 5; // Max size of a single log file
const MAX_BACKUP_FILES = 3; // Number of backup log files to keep (e.g., app.1.log, app.2.log)

function getFormattedTimestamp() {
    return new Date().toISOString();
}

function formatLogMessage(level, source, message, ...args) {
    const timestamp = getFormattedTimestamp();
    const formattedArgs = args.map(arg => {
        if (typeof arg === 'object' && arg !== null) {
            try {
                // Use util.inspect for better object formatting
                return util.inspect(arg, { showHidden: false, depth: 3, colors: false });
            } catch (e) {
                return '[Uninspectable Object]';
            }
        }
        return arg;
    }).join(' ');
    return `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message} ${formattedArgs}\n`;
}

function rotateLogFiles(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return; // No file to rotate
        }

        const stats = fs.statSync(filePath);
        if (stats.size / (1024 * 1024) < MAX_LOG_SIZE_MB) {
            return; // File is not large enough to rotate
        }

        const dir = path.dirname(filePath);
        const baseName = path.basename(filePath, '.log');
        const ext = '.log';

        // Delete oldest backup if max backups exceeded
        const oldestBackupPath = path.join(dir, `${baseName}.${MAX_BACKUP_FILES + 1}${ext}`);
        if (fs.existsSync(oldestBackupPath)) {
            fs.unlinkSync(oldestBackupPath);
        }

        // Shift existing backups
        for (let i = MAX_BACKUP_FILES; i >= 1; i--) {
            const currentBackupPath = path.join(dir, `${baseName}.${i}${ext}`);
            const nextBackupPath = path.join(dir, `${baseName}.${i + 1}${ext}`);
            if (fs.existsSync(currentBackupPath)) {
                fs.renameSync(currentBackupPath, nextBackupPath);
            }
        }
        // Rename current log to first backup
        fs.renameSync(filePath, path.join(dir, `${baseName}.1${ext}`));
    } catch (err) {
        // Use console.error for logger's internal errors to avoid loops
        console.error("LOGGER: Failed to rotate log files:", err);
    }
}


function writeToFile(logMessage) {
    if (logStream && logFilePathGlobal) {
        try {
            // Check for rotation before writing
            rotateLogFiles(logFilePathGlobal);
            
            // If rotation happened, the stream might be closed or pointing to an old file.
            // Re-open stream if necessary (simple approach: close and open)
            if (!logStream.writable || logStream.destroyed) {
                 if (logStream && typeof logStream.end === 'function') {
                    logStream.end();
                 }
                 logStream = fs.createWriteStream(logFilePathGlobal, { flags: 'a' });
            }
            logStream.write(logMessage);
        } catch (err) {
            console.error("LOGGER: Error writing to log file:", err);
        }
    }
}

const logger = {
    init: (filePath) => {
        logFilePathGlobal = filePath;
        try {
            const logDir = path.dirname(filePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            // Perform initial rotation check in case of leftover large file from previous session
            rotateLogFiles(logFilePathGlobal);
            logStream = fs.createWriteStream(logFilePathGlobal, { flags: 'a' });
            // Initial log message using the logger itself
            logger.info('LOGGER', `Logging initialized. Log file: ${logFilePathGlobal}`);
        } catch (error) {
            console.error('LOGGER: Failed to initialize log file stream:', error);
            logStream = null;
        }
    },
    info: (source, message, ...args) => {
        const formattedMessage = formatLogMessage('info', source, message, ...args);
        process.stdout.write(formattedMessage);
        writeToFile(formattedMessage);
    },
    warn: (source, message, ...args) => {
        const formattedMessage = formatLogMessage('warn', source, message, ...args);
        process.stdout.write(formattedMessage);
        writeToFile(formattedMessage);
    },
    error: (source, message, ...args) => {
        const formattedMessage = formatLogMessage('error', source, message, ...args);
        process.stderr.write(formattedMessage);
        writeToFile(formattedMessage);
    },
    debug: (source, message, ...args) => {
        const formattedMessage = formatLogMessage('debug', source, message, ...args);
        // Optionally, make debug logs console-only unless a flag is set
        process.stdout.write(formattedMessage);
        writeToFile(formattedMessage); // Writing debug to file for now
    },
    close: () => {
        if (logStream) {
            logger.info('LOGGER', 'Closing log stream.');
            logStream.end();
            logStream = null;
        }
    }
};

module.exports = logger;
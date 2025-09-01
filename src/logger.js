// @stackql/provider-utils/src/logger.js

// Simple logger implementation
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

let currentLevel = 'info';

const logger = {
  get level() {
    return currentLevel;
  },
  
  set level(newLevel) {
    if (logLevels[newLevel] !== undefined) {
      currentLevel = newLevel;
    } else {
      console.warn(`Invalid log level: ${newLevel}. Using 'info' instead.`);
      currentLevel = 'info';
    }
  },
  
  error: (message) => {
    if (logLevels[currentLevel] >= logLevels.error) {
      console.error(`ERROR: ${message}`);
    }
  },
  
  warn: (message) => {
    if (logLevels[currentLevel] >= logLevels.warn) {
      console.warn(`WARNING: ${message}`);
    }
  },
  
  info: (message) => {
    if (logLevels[currentLevel] >= logLevels.info) {
      console.info(`INFO: ${message}`);
    }
  },
  
  debug: (message) => {
    if (logLevels[currentLevel] >= logLevels.debug) {
      console.debug(`DEBUG: ${message}`);
    }
  }
};

export default logger;
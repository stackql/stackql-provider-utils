// Add to utils.js at the top:
import fs from 'fs';
import logger from './logger.js';

/**
 * Convert camelCase to snake_case
 * @param {string} name - The string to convert
 * @returns {string} - Converted string in snake_case
 */
export function camelToSnake(name) {
  const s1 = name.replace(/([a-z0-9])([A-Z][a-z]+)/g, '$1_$2');
  return s1.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Create destination directory
 * @param {string} destDir - Destination directory path
 * @param {boolean} overwrite - Whether to overwrite existing directory
 * @returns {boolean} - Success status
 */
export function createDestDir(destDir, overwrite) {
  if (fs.existsSync(destDir)) {
    if (!overwrite) {
      logger.error(`Destination directory ${destDir} already exists. Use --overwrite to force.`);
      return false;
    }
    
    // Clean the directory if overwrite is true
    try {
      // Remove all files and subdirectories
      fs.rmSync(destDir, { recursive: true, force: true });
      logger.info(`Cleaned destination directory ${destDir}`);
    } catch (error) {
      logger.error(`Failed to clean destination directory ${destDir}: ${error.message}`);
      return false;
    }
  }
  
  // Create the directory (or recreate it if it was deleted)
  fs.mkdirSync(destDir, { recursive: true });
  return true;
}
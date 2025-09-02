// src/providerdev/generate.js
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import csv from 'csv-parser';
import logger from '../logger.js';
import { createReadStream } from 'fs';

/**
 * Load manifest from CSV file
 * @param {string} configPath - Path to CSV config file
 * @returns {Promise<Object>} - Manifest object
 */
async function loadManifest(configPath) {
  const manifest = {};
  
  return new Promise((resolve, reject) => {
    createReadStream(configPath)
      .pipe(csv())
      .on('data', (row) => {
        const key = `${row.filename}::${row.operationId}`;
        manifest[key] = row;
      })
      .on('end', () => {
        resolve(manifest);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Load specification from YAML or JSON file
 * @param {string} filepath - Path to specification file
 * @returns {Object} - Loaded specification
 */
function loadSpec(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  if (filepath.endsWith('.json')) {
    return JSON.parse(content);
  }
  return yaml.load(content);
}

/**
 * Write specification to file
 * @param {string} filepath - Output file path
 * @param {Object} data - Data to write
 */
function writeSpec(filepath, data) {
  fs.writeFileSync(filepath, yaml.dump(data, { sortKeys: false }));
}

/**
 * Encode reference path
 * @param {string} path - HTTP path
 * @param {string} verb - HTTP verb
 * @returns {string} - Encoded reference path
 */
function encodeRefPath(path, verb) {
  const encodedPath = path.replace(/\//g, '~1');
  return `#/paths/${encodedPath}/${verb}`;
}

/**
 * Get success response information
 * @param {Object} operation - Operation object
 * @returns {Object} - Response information
 */
function getSuccessResponseInfo(operation) {
  const responses = operation.responses || {};
  const twoXxCodes = Object.keys(responses)
    .filter(code => code.startsWith('2'))
    .sort();

  if (twoXxCodes.length === 0) {
    return { mediaType: '', openAPIDocKey: '' };
  }

  const lowest2xx = twoXxCodes[0];
  const content = responses[lowest2xx]?.content || {};
  const mediaTypes = Object.keys(content);

  const mediaType = mediaTypes.length > 0 ? mediaTypes[0] : '';

  return {
    mediaType,
    openAPIDocKey: lowest2xx
  };
}

/**
 * Convert string to snake_case
 * @param {string} name - String to convert
 * @returns {string} - Converted string
 */
function snakeCase(name) {
  return name.replace(/-/g, '_');
}

/**
 * Generate StackQL provider extensions
 * @param {Object} options - Options for generation
 * @returns {Promise<boolean>} - Success status
 */
export async function generate(options) {
  const {
    inputDir,
    outputDir,
    configPath,
    providerId,
    servers = null,
    providerConfig = null,
    skipFiles = []
  } = options;

  const version = 'v00.00.00000';
  const servicesPath = path.join(outputDir, version, 'services');
  
  // Create directories
  fs.mkdirSync(servicesPath, { recursive: true });
  
  // Clean all files in services output dir
  try {
    const files = fs.readdirSync(servicesPath);
    for (const file of files) {
      const filePath = path.join(servicesPath, file);
      if (fs.statSync(filePath).isFile()) {
        fs.unlinkSync(filePath);
      }
    }
    logger.info(`🧹 Cleared all files in ${servicesPath}`);
  } catch (error) {
    logger.error(`Failed to clear files in ${servicesPath}: ${error.message}`);
    return false;
  }
  
  // Delete provider.yaml file
  const providerManifestFile = path.join(outputDir, version, 'provider.yaml');
  if (fs.existsSync(providerManifestFile)) {
    fs.unlinkSync(providerManifestFile);
    logger.info(`🧹 Deleted ${providerManifestFile}`);
  }
  
  // Load manifest
  let manifest;
  try {
    manifest = await loadManifest(configPath);
  } catch (error) {
    logger.error(`Failed to load manifest: ${error.message}`);
    return false;
  }
  
  const providerServices = {};
  
  try {
    const files = fs.readdirSync(inputDir);
    
    for (const filename of files) {

      const filePath = path.join(inputDir, filename);
      
      // Skip directories
      if (fs.statSync(filePath).isDirectory()) {
        logger.info(`📁 Skipping directory: ${filename}`);
        continue;
      }
  
      if (skipFiles.includes(filename)) {
        logger.info(`⭐️ Skipping ${filename} (matched --skip)`);
        continue;
      }
      
      if (!filename.endsWith('.yaml') && !filename.endsWith('.yml') && !filename.endsWith('.json')) {
        continue;
      }
      
      const baseName = path.basename(filename, path.extname(filename));
      const serviceName = snakeCase(baseName);

      console.log(`processing service: ${serviceName}`);

      const specPath = path.join(inputDir, filename);
      const spec = loadSpec(specPath);
      
      // Initialize resources object with defaultdict-like behavior
      const resources = {};
      
      for (const [pathKey, pathItem] of Object.entries(spec.paths || {})) {
        for (const [verb, operation] of Object.entries(pathItem)) {
          if (typeof operation !== 'object' || operation === null) {
            continue;
          }
          
          const operationId = operation.operationId;
          if (!operationId) {
            continue;
          }
          
          const manifestKey = `${filename}::${operationId}`;
          const entry = manifest[manifestKey];
          if (!entry) {
            logger.error(`❌ ERROR: ${filename} → ${operationId} not found in manifest`);
            return false;
          }
          
          const resource = entry.stackql_resource_name;
          const method = entry.stackql_method_name;
          const sqlverb = entry.stackql_verb;
          
          // Initialize resource if it doesn't exist
          if (!resources[resource]) {
            resources[resource] = {
              id: `${providerId}.${serviceName}.${resource}`,
              name: resource,
              title: resource.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
              methods: {},
              sqlVerbs: { 
                select: [], 
                insert: [], 
                update: [], 
                delete: [], 
                replace: [] 
              }
            };
          }
          
          const pathRef = encodeRefPath(pathKey, verb);
          const responseInfo = getSuccessResponseInfo(operation);
          
          const methodEntry = {
            operation: { $ref: pathRef },
            response: responseInfo
          };

          resources[resource].methods[method] = methodEntry;
          if (sqlverb && sqlverb === 'exec') {
            logger.info(`exec method skipped:  ${resource}.${method}`);
          } else if (sqlverb && resources[resource].sqlVerbs[sqlverb]) {
            resources[resource].sqlVerbs[sqlverb].push({
              $ref: `#/components/x-stackQL-resources/${resource}/methods/${method}`
            });
          } else if (sqlverb) {
            logger.warn(`⚠️ Unknown SQL verb '${sqlverb}' for ${resource}.${method}, skipping`);
          }
        }
      }
      
      // Inject into spec
      if (!spec.components) {
        spec.components = {};
      }
      spec.components['x-stackQL-resources'] = resources;
      
      // Inject servers if provided
      if (servers) {
        try {
          const serversJson = JSON.parse(servers);
          spec.servers = serversJson;
        } catch (error) {
          logger.error(`❌ Failed to parse servers JSON: ${error.message}`);
          return false;
        }
      }
      
      // Write enriched spec
      const outputPath = path.join(servicesPath, filename);
      writeSpec(outputPath, spec);
      logger.info(`✅ Wrote enriched spec: ${outputPath}`);
      
      // Add providerService entry
      const info = spec.info || {};
      const specTitle = info.title || `${serviceName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} API`;
      const specDescription = info.description || `TODO: add description for ${serviceName}`;
      
      providerServices[serviceName] = {
        id: `${serviceName}:${version}`,
        name: serviceName,
        preferred: true,
        service: {
          $ref: `${providerId}/${version}/services/${filename}`
        },
        title: specTitle,
        version: version,
        description: specDescription
      };
    }
    
    // Write provider.yaml
    const providerYaml = {
      id: providerId,
      name: providerId,
      version: version,
      providerServices: providerServices,
    };
    
    if (providerConfig) {
      try {
        const providerConfigJson = JSON.parse(providerConfig);
        providerYaml.config = providerConfigJson;
      } catch (error) {
        logger.error(`❌ Failed to parse provider config JSON: ${error.message}`);
        return false;
      }
    }
    
    writeSpec(path.join(outputDir, version, 'provider.yaml'), providerYaml);
    logger.info(`📦 Wrote provider.yaml to ${outputDir}/${version}/provider.yaml`);
    
    return true;
  } catch (error) {
    logger.error(`Failed to generate provider: ${error.message}`);
    return false;
  }
}
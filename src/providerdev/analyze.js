// src/providerdev/analyze.js
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../logger.js';
import { camelToSnake } from '../utils.js';

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
 * Extract main 2xx response schema reference
 * @param {Object} responseObj - Response object
 * @returns {string} - Schema reference name
 */
function extractMain2xxResponse(responseObj) {
  for (const [code, response] of Object.entries(responseObj)) {
    if (code.startsWith('2')) {
      const content = response.content || {};
      const appJson = content['application/json'] || {};
      const schema = appJson.schema || {};

      // Case 1: Direct $ref
      if (schema.$ref) {
        return schema.$ref.split('/').pop();
      }

      // Case 2: Array of items
      if (schema.type === 'array') {
        const items = schema.items || {};
        if (items.$ref) {
          return items.$ref.split('/').pop();
        }
      }
      
      return '';
    }
  }
  return '';
}

/**
 * Find existing mapping in x-stackQL-resources
 * @param {Object} spec - OpenAPI spec
 * @param {string} pathRef - Reference to path item
 * @returns {Object} - Mapping info (resource, method, verb)
 */
function findExistingMapping(spec, pathRef) {
  const stackQLResources = spec.components?.['x-stackQL-resources'] || {};
  
  for (const [resourceName, resource] of Object.entries(stackQLResources)) {
    // Check methods
    for (const [methodName, method] of Object.entries(resource.methods || {})) {
      if (method.operation?.$ref === pathRef) {
        // Find SQL verb for this method
        let sqlVerb = 'exec'; // Default if no explicit mapping
        
        for (const [verb, methods] of Object.entries(resource.sqlVerbs || {})) {
          for (const methodRef of methods) {
            if (methodRef.$ref === `#/components/x-stackQL-resources/${resourceName}/methods/${methodName}`) {
              sqlVerb = verb;
              break;
            }
          }
        }
        
        return {
          resourceName,
          methodName,
          sqlVerb
        };
      }
    }
  }
  
  return {
    resourceName: '',
    methodName: '',
    sqlVerb: ''
  };
}

/**
 * Analyze OpenAPI specs and generate mapping CSV
 * @param {Object} options - Options for analysis
 * @returns {Promise<boolean>} - Success status
 */
export async function analyze(options) {
  const {
    inputDir,
    outputDir
  } = options;

  try {
    fs.mkdirSync(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'all_services.csv');
    
    const writer = fs.createWriteStream(outputPath, { encoding: 'utf8' });
    
    // Write header
    writer.write('filename,path,operationId,formatted_op_id,verb,response_object,tags,formatted_tags,stackql_resource_name,stackql_method_name,stackql_verb\n');
    
    const files = fs.readdirSync(inputDir);
    
    for (const filename of files) {
      if (!filename.endsWith('.yaml') && !filename.endsWith('.yml') && !filename.endsWith('.json')) {
        continue;
      }
      
      const filepath = path.join(inputDir, filename);
      const spec = loadSpec(filepath);
      
      for (const [pathKey, pathItem] of Object.entries(spec.paths || {})) {
        for (const [verb, operation] of Object.entries(pathItem)) {
          if (typeof operation !== 'object' || operation === null) {
            continue;
          }
          
          const operationId = operation.operationId || '';
          // Format operationId as snake_case
          const formattedOpId = operationId ? camelToSnake(operationId) : '';
          
          const responseObj = operation.responses || {};
          const responseRef = extractMain2xxResponse(responseObj);
          const tagsList = operation.tags || [];
          const tagsStr = tagsList.join('|');
          
          // Format tags as snake_case
          const formattedTags = tagsList.map(tag => camelToSnake(tag)).join('|');
          
          // Construct the path reference as it would appear in x-stackQL-resources
          const encodedPath = pathKey.replace(/\//g, '~1');
          const pathRef = `#/paths/${encodedPath}/${verb}`;
          
          // Find existing mapping if available
          const { resourceName, methodName, sqlVerb } = findExistingMapping(spec, pathRef);
          
          // Escape commas in fields
          const escapedPath = pathKey.includes(',') ? `"${pathKey}"` : pathKey;
          const escapedOperationId = operationId.includes(',') ? `"${operationId}"` : operationId;
          const escapedFormattedOpId = formattedOpId.includes(',') ? `"${formattedOpId}"` : formattedOpId;
          const escapedTags = tagsStr.includes(',') ? `"${tagsStr}"` : tagsStr;
          const escapedFormattedTags = formattedTags.includes(',') ? `"${formattedTags}"` : formattedTags;
          
          // Write row
          writer.write(`${filename},${escapedPath},${escapedOperationId},${escapedFormattedOpId},${verb},${responseRef},${escapedTags},${escapedFormattedTags},${resourceName},${methodName},${sqlVerb}\n`);
        }
      }
    }
    
    writer.end();
    
    logger.info(`✅ Analysis complete. Output written to: ${outputPath}`);
    return true;
  } catch (error) {
    logger.error(`Failed to analyze OpenAPI specs: ${error.message}`);
    return false;
  }
}
// @stackql/provider-utils/src/providerdev/split.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import logger from '../logger.js';
import {
  camelToSnake,
  createDestDir
} from '../utils.js';

// Constants
const OPERATIONS = ["get", "post", "put", "delete", "patch", "options", "head", "trace"];
const NON_OPERATIONS = ["parameters", "servers", "summary", "description"];
const COMPONENTS_CHILDREN = ["schemas", "responses", "parameters", "examples", "requestBodies", "headers", "securitySchemes", "links", "callbacks"];

/**
 * Check if operation should be excluded
 * @param {string[]} exclude - List of exclusion criteria
 * @param {Object} opItem - Operation item from OpenAPI doc
 * @param {string} svcDiscriminator - Service discriminator 
 * @returns {boolean} - Whether operation should be excluded
 */
function isOperationExcluded(exclude, opItem) {
  if (!exclude || exclude.length === 0) {
    return false;
  }
  
  // Example: exclude based on tags or other criteria
  if (opItem.tags && opItem.tags.some(tag => exclude.includes(tag))) {
    return true;
  }
  
  return false;
}

/**
 * Determine service name and description using discriminator
 * @param {string} providerName - Provider name
 * @param {Object} opItem - Operation item
 * @param {string} pathKey - Path key
 * @param {string} svcDiscriminator - Service discriminator
 * @param {Object[]} allTags - All tags from API doc
 * @param {boolean} debug - Debug flag
 * @returns {[string, string]} - [service name, service description]
 */
function retServiceNameAndDesc(providerName, opItem, pathKey, svcDiscriminator, allTags, debug) {
  let service = "default";
  let serviceDesc = `${providerName} API`;
  
  // Use tags if discriminator is "tag"
  if (svcDiscriminator === "tag" && opItem.tags && opItem.tags.length > 0) {
    service = opItem.tags[0].toLowerCase().replace(/-/g, '_').replace(/ /g, '_');
    
    // Find description in all_tags
    for (const tag of allTags) {
      if (tag.name === service) {
        serviceDesc = tag.description || serviceDesc;
        break;
      }
    }
  }
  
  // Use first significant path segment if discriminator is "path"
  else if (svcDiscriminator === "path") {
    const pathParts = pathKey.replace(/^\//, '').split('/');
    if (pathParts.length > 0) {
      // Find the first path segment that is not 'api' or 'v{number}'
      for (const part of pathParts) {
        const lowerPart = part.toLowerCase();
        // Skip if it's 'api' or matches version pattern 'v1', 'v2', etc.
        if (lowerPart === 'api' || /^v\d+$/.test(lowerPart)) {
          continue;
        }
        service = lowerPart.replace(/-/g, '_').replace(/ /g, '_').replace(/\./g, '_');
        break;
      }
      serviceDesc = `${providerName} ${service} API`;
    }
  }
  
  // Check if service should be skipped
  if (service === "skip") {
    return ["skip", ""];
  }
  
  return [service, serviceDesc];
}

/**
 * Initialize service map
 * @param {Object} services - Services map
 * @param {string[]} componentsChildren - Components children
 * @param {string} service - Service name
 * @param {string} serviceDesc - Service description
 * @param {Object} apiDoc - API doc
 * @returns {Object} - Updated services map
 */
function initService(services, componentsChildren, service, serviceDesc, apiDoc) {
  services[service] = {
    openapi: apiDoc.openapi || "3.0.0",
    info: {
      title: `${service} API`,
      description: serviceDesc,
      version: apiDoc.info?.version || "1.0.0"
    },
    paths: {},
    components: {}
  };
  
  // Initialize components sections
  services[service].components = {};
  for (const child of componentsChildren) {
    services[service].components[child] = {};
  }
  
  // Copy servers if present
  if (apiDoc.servers) {
    services[service].servers = apiDoc.servers;
  }
  
  return services;
}

/**
 * Extract all $ref values from an object recursively
 * @param {any} obj - Object to extract refs from
 * @returns {Set<string>} - Set of refs
 */
function getAllRefs(obj) {
  const refs = new Set();
  
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        for (const ref of getAllRefs(item)) {
          refs.add(ref);
        }
      }
    } else {
      for (const [key, value] of Object.entries(obj)) {
        if (key === "$ref" && typeof value === 'string') {
          refs.add(value);
        } else if (typeof value === 'object' && value !== null) {
          for (const ref of getAllRefs(value)) {
            refs.add(ref);
          }
        }
      }
    }
  }
  
  return refs;
}

/**
 * Add referenced components to service
 * @param {Set<string>} refs - Set of refs
 * @param {Object} service - Service object
 * @param {Object} components - Components from API doc
 * @param {boolean} debug - Debug flag
 */
function addRefsToComponents(refs, service, components, debug) {
  for (const ref of refs) {
    const parts = ref.split('/');
    
    // Only process refs that point to components
    if (parts.length >= 4 && parts[1] === "components") {
      const componentType = parts[2];
      const componentName = parts[3];
      
      // Check if component type exists in service
      if (!service.components[componentType]) {
        service.components[componentType] = {};
      }
      
      // Skip if component already added
      if (service.components[componentType][componentName]) {
        continue;
      }
      
      // Add component if it exists in source document
      if (components[componentType] && components[componentType][componentName]) {
        service.components[componentType][componentName] = components[componentType][componentName];
        if (debug) {
          logger.debug(`Added component ${componentType}/${componentName}`);
        }
      }
    }
  }
}

/**
 * Add missing type: object to schema objects
 * @param {any} obj - Object to process
 * @returns {any} - Processed object
 */
function addMissingObjectTypes(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => addMissingObjectTypes(item));
  }
  
  // If it has properties but no type, add type: object
  if (obj.properties && !obj.type) {
    obj.type = "object";
  }
  
  // Process nested objects
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      obj[key] = addMissingObjectTypes(value);
    }
  }
  
  return obj;
}

/**
 * Split OpenAPI document into service-specific files
 * @param {Object} options - Options for splitting
 * @returns {Promise<boolean>} - Success status
 */
export async function split(options) {
  const {
    apiDoc,
    providerName,
    outputDir,
    svcDiscriminator = "tag",
    exclude = null,
    overwrite = true,
    verbose = false
  } = options;
  
  // Setup logging based on verbosity
  if (verbose) {
    logger.level = 'debug';
  }
  
  logger.info(`📄 Splitting OpenAPI doc for ${providerName}`);
  logger.info(`API Doc: ${apiDoc}`);
  logger.info(`Output: ${outputDir}`);
  logger.info(`Service Discriminator: ${svcDiscriminator}`);
  
  // Process exclude list
  const excludeList = exclude ? exclude.split(",") : [];
  
  // Read the OpenAPI document
  let apiDocObj;
  try {
    const apiDocContent = fs.readFileSync(apiDoc, 'utf8');
    apiDocObj = yaml.load(apiDocContent);
  } catch (e) {
    logger.error(`❌ Failed to parse ${apiDoc}: ${e.message}`);
    return false;
  }
  
  // Create destination directory
  if (!createDestDir(outputDir, overwrite)) {
    return false;
  }
  
  // Get API paths
  const apiPaths = apiDocObj.paths || {};
  logger.info(`🔑 Iterating over ${Object.keys(apiPaths).length} paths`);
  
  const services = {};
  let opCounter = 0;
  
  // Process each path
  for (const [pathKey, pathItem] of Object.entries(apiPaths)) {
    if (verbose) {
      logger.debug(`Processing path ${pathKey}`);
    }
    
    if (!pathItem) {
      continue;
    }
    
    // Process each operation (HTTP verb)
    for (const [verbKey, opItem] of Object.entries(pathItem)) {
      if (!OPERATIONS.includes(verbKey) || !opItem) {
        continue;
      }
      
      opCounter += 1;
      if (opCounter % 100 === 0) {
        logger.info(`⚙️ Operations processed: ${opCounter}`);
      }
      
      if (verbose) {
        logger.debug(`Processing operation ${pathKey}:${verbKey}`);
      }
      
      // Skip excluded operations
      if (isOperationExcluded(excludeList, opItem, svcDiscriminator)) {
        continue;
      }
      
      // Determine service name
      const [service, serviceDesc] = retServiceNameAndDesc(
        providerName, opItem, pathKey, svcDiscriminator, 
        apiDocObj.tags || [], verbose
      );
      
      // Skip if service is marked to skip
      if (service === 'skip') {
        logger.warn(`⭐️ Skipping service: ${service}`);
        continue;
      }
      
      if (verbose) {
        logger.debug(`Service name: ${service}`);
        logger.debug(`Service desc: ${serviceDesc}`);
      }
      
      // Initialize service if first occurrence
      if (!services[service]) {
        if (verbose) {
          logger.debug(`First occurrence of ${service}`);
        }
        initService(services, COMPONENTS_CHILDREN, service, serviceDesc, apiDocObj);
      }
      
      // Add operation to service
      if (!services[service].paths[pathKey]) {
        if (verbose) {
          logger.debug(`First occurrence of ${pathKey}`);
        }
        services[service].paths[pathKey] = {};
      }
      
      services[service].paths[pathKey][verbKey] = opItem;
      
      // Special case for GitHub
      if (providerName === 'github' && 
          opItem['x-github'] && 
          opItem['x-github'].subcategory) {
        services[service].paths[pathKey][verbKey]['x-stackQL-resource'] = camelToSnake(
          opItem['x-github'].subcategory
        );
      }
      
      // Get all refs for operation
      const opRefs = getAllRefs(opItem);
      
      if (verbose) {
        logger.debug(`Found ${opRefs.size} refs for ${service}`);
      }
      
      // Add refs to components
      addRefsToComponents(opRefs, services[service], apiDocObj.components || {}, verbose);
      
      // Get internal refs
      for (let i = 0; i < 3; i++) {  // Internal ref depth
        const intRefs = getAllRefs(services[service].components);
        if (verbose) {
          logger.debug(`Found ${intRefs.size} INTERNAL refs for service ${service}`);
        }
        addRefsToComponents(intRefs, services[service], apiDocObj.components || {}, verbose);
      }
      
      // Get deeply nested schema refs
      for (let i = 0; i < 10; i++) {  // Schema max ref depth
        const intRefs = getAllRefs(services[service].components);
        // Filter refs that are already in service components
        const filteredRefs = new Set();
        for (const ref of intRefs) {
          const parts = ref.split('/');
          if (parts.length >= 4 && parts[1] === "components" && parts[2] === "schemas" &&
              !services[service].components.schemas[parts[3]]) {
            filteredRefs.add(ref);
          }
        }
        
        if (verbose) {
          logger.debug(`Found ${filteredRefs.size} INTERNAL schema refs for service ${service}`);
        }
        
        if (filteredRefs.size > 0) {
          if (verbose) {
            logger.debug(`Adding ${filteredRefs.size} INTERNAL schema refs for service ${service}`);
          }
          addRefsToComponents(filteredRefs, services[service], apiDocObj.components || {}, verbose);
        } else {
          if (verbose) {
            logger.debug(`Exiting INTERNAL schema refs for ${service}`);
          }
          break;
        }
      }
    }
  }
  
  // Add non-operations to each service
  for (const service in services) {
    for (const pathKey of Object.keys(services[service].paths)) {
      if (verbose) {
        logger.debug(`Adding non operations to ${service} for path ${pathKey}`);
      }
      
      for (const nonOp of NON_OPERATIONS) {
        if (verbose) {
          logger.debug(`Looking for non operation ${nonOp} in ${service} under path ${pathKey}`);
        }
        
        if (apiPaths[pathKey] && apiPaths[pathKey][nonOp]) {
          if (verbose) {
            logger.debug(`Adding ${nonOp} to ${service} for path ${pathKey}`);
          }
          
          // Special case for parameters
          if (nonOp === 'parameters') {
            for (const verbKey in services[service].paths[pathKey]) {
              services[service].paths[pathKey][verbKey].parameters = apiPaths[pathKey].parameters;
            }
          }
        }
      }
    }
  }
  
  // Update path param names (replace hyphens with underscores)
  for (const service in services) {
    if (services[service].paths) {
      const pathKeys = Object.keys(services[service].paths);
      for (const pathKey of pathKeys) {
        if (verbose) {
          logger.debug(`Renaming path params in ${service} for path ${pathKey}`);
        }
        
        // Replace hyphens with underscores in path parameters
        const updatedPathKey = pathKey.replace(/(?<=\{)([^}]+?)-([^}]+?)(?=\})/g, '$1_$2');
        
        if (updatedPathKey !== pathKey) {
          if (verbose) {
            logger.debug(`Updated path key from ${pathKey} to ${updatedPathKey}`);
          }
          
          services[service].paths[updatedPathKey] = services[service].paths[pathKey];
          delete services[service].paths[pathKey];
          
          // Also update parameter names in operations
          for (const verbKey in services[service].paths[updatedPathKey]) {
            const operation = services[service].paths[updatedPathKey][verbKey];
            if (operation.parameters) {
              for (const param of operation.parameters) {
                if (param.in === 'path' && param.name.includes('-')) {
                  const originalName = param.name;
                  param.name = param.name.replace(/-/g, '_');
                  if (verbose) {
                    logger.debug(`Updated parameter name from ${originalName} to ${param.name} in path ${updatedPathKey}`);
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  // Fix missing type: object
  for (const service in services) {
    if (verbose) {
      logger.debug(`Updating paths for ${service}`);
    }
    services[service].paths = addMissingObjectTypes(services[service].paths);
    services[service].components = addMissingObjectTypes(services[service].components);
  }
  
  // Write out service docs
  for (const service in services) {
    logger.info(`✅ Writing out OpenAPI doc for [${service}]`);

    // const svcDir = path.join(outputDir, service);
    // const outputFile = path.join(svcDir, `${service}.yaml`);
    const outputFile = path.join(outputDir, `${service}.yaml`);    
    // fs.mkdirSync(svcDir, { recursive: true });
    
    fs.writeFileSync(outputFile, yaml.dump(services[service], { 
      noRefs: true,
      sortKeys: false
    }));
  }
  
  logger.info(`🎉 Successfully split OpenAPI doc into ${Object.keys(services).length} services`);
  return true;
}

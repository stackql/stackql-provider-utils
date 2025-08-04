// src/docgen/resource/methods.js
import { cleanDescription } from '../helpers.js';

export function createMethodsSection(providerName, serviceName, resourceName, vwResourceName, dereferencedAPI) {
    if (!dereferencedAPI || !dereferencedAPI.components || !dereferencedAPI.components['x-stackQL-resources'] || 
        !dereferencedAPI.components['x-stackQL-resources'][resourceName] ||
        !dereferencedAPI.components['x-stackQL-resources'][resourceName].methods) {
        return '';
    }

    const resourceData = dereferencedAPI.components['x-stackQL-resources'][resourceName];
    const methods = resourceData.methods;
    
    // Group methods by SQL verb
    const methodsByVerb = groupMethodsBySqlVerb(resourceData);
    
    // Generate methods table
    let content = `\n## Methods\n| Name | Accessible by | Required Params | Optional Params | Description |\n|:-----|:--------------|:----------------|:----------------|:------------|\n`;
    
    // Process each method
    for (const [methodName, methodObj] of Object.entries(methods)) {
        const accessVerbs = getAccessVerbsForMethod(methodName, methodsByVerb);
        if (!accessVerbs.length) continue; // Skip methods with no access verbs
        
        const requiredParams = getRequiredParams(methodObj.operation);
        const optionalParams = getOptionalParams(methodObj.operation);
        const description = cleanDescription(methodObj.operation.description || '');
        
        content += `| <CopyableCode code="${methodName}" /> | \`${accessVerbs.join(', ')}\` | ${formatParamsList(requiredParams)} | ${formatParamsList(optionalParams)} | ${description} |\n`;
    }
    
    // Generate parameter details if there are any optional parameters
    const allOptionalParams = getAllOptionalParams(methods);
    if (allOptionalParams.length > 0) {
        content += `\n<br />\n\n\n<details>\n<summary>Optional Parameter Details</summary>\n\n`;
        content += `| Name | Description | Type | Default |\n|------|-------------|------|--------|\n`;
        
        for (const param of allOptionalParams) {
            content += `| <CopyableCode code="${param.name}" /> | ${param.description} | \`${param.type}\` | \`${param.default || '-'}\` |\n`;
        }
        
        content += `\n</details>\n`;
    }
    
    return content;
}

function groupMethodsBySqlVerb(resourceData) {
    const verbMapping = {};
    
    // Process each SQL verb category
    if (resourceData.sqlVerbs) {
        for (const [verb, methodRefs] of Object.entries(resourceData.sqlVerbs)) {
            for (const methodRef of methodRefs) {
                // Extract method name from reference
                const methodName = methodRef.$ref.split('/').pop();
                if (!verbMapping[methodName]) {
                    verbMapping[methodName] = [];
                }
                verbMapping[methodName].push(verb.toUpperCase());
            }
        }
    }
    
    return verbMapping;
}

function getAccessVerbsForMethod(methodName, verbMapping) {
    return verbMapping[methodName] || [];
}

function getRequiredParams(operation) {
    const requiredParams = [];
    
    // Process path parameters
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (param.required && param.name !== 'endpoint') {
                requiredParams.push(param.name);
            }
        }
    }
    
    // Add endpoint as a required parameter (standard for StackQL)
    requiredParams.push('endpoint');
    
    // Process required fields in request body
    if (operation.requestBody && operation.requestBody.required && 
        operation.requestBody.content && 
        operation.requestBody.content['application/json'] &&
        operation.requestBody.content['application/json'].schema) {
        
        const schema = operation.requestBody.content['application/json'].schema;
        
        if (schema.required) {
            for (const field of schema.required) {
                if (field !== 'endpoint') {
                    requiredParams.push(`data__${field}`);
                }
            }
        }
    }
    
    return requiredParams;
}

function getOptionalParams(operation) {
    const optionalParams = [];
    
    // Process optional path/query parameters
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (!param.required && param.name !== 'endpoint') {
                optionalParams.push(param.name);
            }
        }
    }
    
    // Process optional fields in request body
    if (operation.requestBody && operation.requestBody.content && 
        operation.requestBody.content['application/json'] && 
        operation.requestBody.content['application/json'].schema) {
        
        const schema = operation.requestBody.content['application/json'].schema;
        
        if (schema.properties) {
            for (const [propName, propValue] of Object.entries(schema.properties)) {
                // Skip properties that are in the required list
                if (!schema.required || !schema.required.includes(propName)) {
                    // Skip endpoint
                    if (propName !== 'endpoint') {
                        optionalParams.push(`data__${propName}`);
                    }
                }
            }
        }
    }
    
    return optionalParams;
}

function formatParamsList(params) {
    if (!params.length) return '-';
    return `<CopyableCode code="${params.join(', ')}" />`;
}

function getAllOptionalParams(methods) {
    const paramDetails = [];
    const seenParams = new Set();
    
    for (const methodObj of Object.values(methods)) {
        if (!methodObj.operation || !methodObj.operation.parameters) continue;
        
        for (const param of methodObj.operation.parameters) {
            if (param.name === 'endpoint' || seenParams.has(param.name)) continue;
            
            if (!param.required) {
                seenParams.add(param.name);
                
                paramDetails.push({
                    name: param.name,
                    description: cleanDescription(param.description || ''),
                    type: param.schema ? param.schema.type : 'string',
                    default: param.schema && param.schema.default !== undefined ? param.schema.default : null
                });
            }
        }
    }
    
    return paramDetails;
}
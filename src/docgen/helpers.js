// src/docgen/helpers.js
export function getIndefiniteArticle(resourceName) {
  // Determine whether to use "a" or "an" based on the first letter's pronunciation
  const firstLetter = resourceName.charAt(0).toLowerCase();
  const vowelSounds = ['a', 'e', 'i', 'o', 'u'];
  // Special case for 'h' when it's silent (like in "hour")
  const specialCaseH = resourceName.toLowerCase().startsWith('hour');
  // Special case for words starting with 'u' but pronounced with 'y' sound (like "user")
  const specialCaseU = firstLetter === 'u' && !resourceName.toLowerCase().startsWith('un');

  let article = 'a';
  if (vowelSounds.includes(firstLetter) && !specialCaseU) {
    article = 'an';
  }
  // Handle special case for words starting with 'h' where 'h' is silent
  if (firstLetter === 'h' && specialCaseH) {
    article = 'an';
  }

  return article;
}

export function getRequiredServerVars(dereferencedAPI){
    const serverVars = [];
    for (const serverVar in dereferencedAPI.servers[0].variables) {
        serverVars.push(serverVar);
    }
    return serverVars;
}

export function getHttpOperationForSqlVerb(sqlVerbRef, resourceData){

    console.log(`Getting http operation for sql verb...`);

    // get path and verb
    const methodName = sqlVerbRef.split('/').pop();
    const methodObj = resourceData.methods[methodName]
    const operationRef = methodObj.operation.$ref.split('#/paths/').pop();
    const httpVerb = operationRef.split('/').pop()
    const path = operationRef.split('/')[0].replaceAll('~1','/');

    return { 
        path, 
        httpVerb, 
        mediaType: methodObj.response.mediaType,  
        openAPIDocKey: methodObj.response.openAPIDocKey,
        objectKey: methodObj.response.objectKey || false,
        methodName 
    }
}

export function getHttpOperationResponse(dereferencedAPI, path, httpVerb, mediaType, openAPIDocKey, objectKey){

    console.log(`Getting response for ${path}/${httpVerb}...`);

    const schema = dereferencedAPI.paths[path][httpVerb].responses[openAPIDocKey].content[mediaType].schema;

    if(schema.type === 'array'){
        return {
            respProps: dereferencedAPI.paths[path][httpVerb].responses[openAPIDocKey].content[mediaType].schema.items.properties,
            respDescription: dereferencedAPI.paths[path][httpVerb].responses[openAPIDocKey].content[mediaType].schema.items.description || false,
        };
    } else if (schema.type === 'object'){
        return {
            respProps: dereferencedAPI.paths[path][httpVerb].responses[openAPIDocKey].content[mediaType].schema.properties,
            respDescription: dereferencedAPI.paths[path][httpVerb].responses[openAPIDocKey].content[mediaType].schema.description || false,
        };
    } else {
        // Terminate the program as we should never get here
        console.error(`ERROR: Unexpected schema type: ${schema.type} for ${path}/${httpVerb}`);
        process.exit(1);
    }
}

export function cleanDescription(description) {
    if (!description) return '';
    
    // Replace <a> tags with markdown equivalent
    description = description.replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"(?:[^>]*?)>(.*?)<\/a>/gi, '[$2]($1)');

    // Remove <p> tags and replace them with a single space
    description = description.replace(/<\/?p>/gi, ' ');

    // Replace <br> tags with a single space
    description = description.replace(/<br\s*\/?>/gi, ' ');

    // Replace <code> and <pre> tags with markdown code blocks
    description = description.replace(/<(code|pre)>(.*?)<\/\1>/gi, '`$2`');

    // Convert <ul> and <li> tags into a comma-separated list
    description = description.replace(/<\/?ul>/gi, '');
    description = description.replace(/<li>(.*?)<\/li>/gi, '$1, ');

    // Remove <name>, <td>, <tr>, and <table> tags
    description = description.replace(/<\/?(name|td|tr|table)>/gi, '');

    // Replace multiple spaces with a single space
    description = description.replace(/\s+/g, ' ');

    // Escape pipe characters to prevent breaking markdown tables
    description = description.replace(/\|/g, '\\|');

    // Remove any trailing commas, spaces, and line breaks
    description = description.replace(/,s*$/, '').trim();

    description = description.replace(/</g, '{');
    description = description.replace(/>/g, '}');

    return description;
}


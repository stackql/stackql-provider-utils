import pluralize from 'pluralize';
import yaml from 'js-yaml';
import { runQuery } from '@stackql/pgwire-lite';

const sqlCodeBlockStart = '```sql';
const yamlCodeBlockStart = '```yaml';
const codeBlockEnd = '```';
const mdCodeAnchor = "`";

async function executeSQL(connectionOptions, query) {
    try {
        const result = await runQuery(connectionOptions, query);
        // console.info('result:', result);
        return result.data;
    } catch (error) {
        console.error('error executing query:', error.message);
    }
}

function shouldQuoteValue(fieldType) {
    return fieldType === 'string' || fieldType === 'array' || fieldType === 'object';
}

function cleanDescription(description) {
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
    description = description.replace(/,\s*$/, '').trim();

    description = description.replace(/</g, '{');
    description = description.replace(/>/g, '}');

    return description;
}

export async function createResourceIndexContent(
    providerName, 
    serviceName, 
    resourceName, 
    vwResourceName, 
    resourceData, 
    paths, 
    componentsSchemas, 
    componentsRequestBodies,
    dereferencedAPI,
    stackqlConfig = { host: 'localhost', port: 5444, user: 'stackql', database: 'stackql' }
) {
    
    const connectionOptions = {
        ...stackqlConfig,
        debug: false
    };

    const fieldsSql = `DESCRIBE EXTENDED ${providerName}.${serviceName}.${resourceName}`;
    const fields = await executeSQL(connectionOptions, fieldsSql) || [];
    // console.info('fields:', fields);

    let vwFieldsSql;
    let vwFields = [];
    let mergedFields = [];

    if (vwResourceName) {
        vwFieldsSql = `DESCRIBE EXTENDED ${providerName}.${serviceName}.${vwResourceName}`;
        vwFields = await executeSQL(connectionOptions, vwFieldsSql) || [];
        // console.info('vwFields:', vwFields);
        // Merge `fields` into `vwFields` with fallback for missing descriptions
        const mergeFields = (fields, vwFields) => {
            const fieldsMap = new Map(fields.map(f => [f.name, f]));

            return vwFields.map(vwField => {
                const matchingField = fieldsMap.get(vwField.name) || {};

                return {
                    ...vwField,
                    type: vwField.type || matchingField.type || 'text',
                    description: vwField.description || 
                                matchingField.description || 
                                'field from the parent object',
                };
            });
        };

        mergedFields = mergeFields(fields, vwFields);
        // console.info('Merged Fields:', mergedFields);        
    }
    
    // Fetch method descriptions
    const methodsSql = `SHOW EXTENDED METHODS IN ${providerName}.${serviceName}.${resourceName}`;
    const methods = await executeSQL(connectionOptions, methodsSql) || [];    

    // pre process methods to ensure RequiredParams are formatted correctly
    methods.forEach(method => {
        if (method.RequiredParams) {
            const updatedParams = method.RequiredParams
                .split(', ')
                .map(param => {
                    const trimmed = param.trim();
                    return trimmed.includes('-') ? `"${trimmed}"` : trimmed;
                })
                .join(', ');
            method.RequiredParams = updatedParams;
        }
    });
    // console.info('methods:', methods);

    // Start building the markdown content
    let content = `---
title: ${resourceName}
hide_title: false
hide_table_of_contents: false
keywords:
  - ${resourceName}
  - ${serviceName}
  - ${providerName}
  - infrastructure-as-code
  - configuration-as-data
  - cloud inventory
description: Query, deploy and manage ${providerName} resources using SQL
custom_edit_url: null
image: /img/providers/${providerName}/stackql-${providerName}-provider-featured-image.png
---

import CopyableCode from '@site/src/components/CopyableCode/CopyableCode';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Creates, updates, deletes, gets or lists a <code>${resourceName}</code> resource.

## Overview
<table><tbody>
<tr><td><b>Name</b></td><td><code>${resourceName}</code></td></tr>
<tr><td><b>Type</b></td><td>Resource</td></tr>
<tr><td><b>Id</b></td><td><CopyableCode code="${resourceData.id}" /></td></tr>
</tbody></table>

## Fields
`;

    if (fields.length === 0) {
        // no fields
        content += `${mdCodeAnchor}SELECT${mdCodeAnchor} not supported for this resource, use ${mdCodeAnchor}SHOW METHODS${mdCodeAnchor} to view available operations for the resource.\n\n`;
    } else {
        if (mergedFields.length > 0) {
            // we have a view, use tabs
            content +=
`<Tabs
    defaultValue="view"
    values={[
        { label: '${vwResourceName}', value: 'view', },
        { label: '${resourceName}', value: 'resource', },
    ]
}>
<TabItem value="view">

`;
            content += '| Name | Datatype | Description |\n|:-----|:---------|:------------|\n';
            mergedFields.forEach(field => {
                content += `| <CopyableCode code="${field.name}" /> | ${mdCodeAnchor}${field.type}${mdCodeAnchor} | ${cleanDescription(field.description)} |\n`;
            });
            content += '</TabItem>\n';
            content += '<TabItem value="resource">\n';
            content += '\n';
        }
        // normal fields
        content += '| Name | Datatype | Description |\n|:-----|:---------|:------------|\n';
        fields.forEach(field => {
            content += `| <CopyableCode code="${field.name}" /> | ${mdCodeAnchor}${field.type}${mdCodeAnchor} | ${cleanDescription(field.description)} |\n`;
        });
        // close tabs
        if (vwFields.length > 0) {
            content += '</TabItem></Tabs>\n';
        }
    }

    // Check if any methods have optional parameters
    const hasOptionalParams = methods.some(method => {
        const optionalParams = getOptionalParams(method.MethodName, resourceData, dereferencedAPI);
        return optionalParams && optionalParams.trim() !== '';
    });

    // Build methods table header conditionally
    if (hasOptionalParams) {
        content += '\n## Methods\n| Name | Accessible by | Required Params | Optional Params | Description |\n|:-----|:--------------|:----------------|:----------------|:------------|\n';
    } else {
        content += '\n## Methods\n| Name | Accessible by | Required Params | Description |\n|:-----|:--------------|:----------------|:------------|\n';
    }

    // Append methods
    methods.forEach(method => {
        const sqlVerb = method.SQLVerb;
        if (hasOptionalParams) {
            const optionalParams = getOptionalParams(method.MethodName, resourceData, dereferencedAPI);
            content += `| <CopyableCode code="${method.MethodName}" /> | ${mdCodeAnchor}${sqlVerb}${mdCodeAnchor} | <CopyableCode code="${method.RequiredParams}" /> | ${optionalParams || '-'} | ${cleanDescription(method.description)} |\n`;
        } else {
            content += `| <CopyableCode code="${method.MethodName}" /> | ${mdCodeAnchor}${sqlVerb}${mdCodeAnchor} | <CopyableCode code="${method.RequiredParams}" /> | ${cleanDescription(method.description)} |\n`;
        }
    });

    content += '\n<br />\n';

    // Add optional parameters details section
    const optionalParamsDetails = getOptionalParamsDetails(methods, resourceData, dereferencedAPI);
    if (optionalParamsDetails) {
        content += '\n' + optionalParamsDetails;
    }

    // Append SQL examples for each SQL verb
    const sqlVerbs = ['SELECT', 'INSERT', 'UPDATE', 'REPLACE', 'DELETE'];

    sqlVerbs.forEach(sqlVerb => {
        const relevantMethods = methods.filter(method => method.SQLVerb === sqlVerb);

        if (relevantMethods.length === 0) return;

        switch (sqlVerb) {
            case 'SELECT':
                // Pass all SELECT methods for overloaded handling
                const exampleMethod = relevantMethods.sort((a, b) => a.RequiredParams.length - b.RequiredParams.length)[0];
                content += generateSelectExample(providerName, serviceName, resourceName, vwResourceName, exampleMethod, fields, vwFields, relevantMethods);
                break;
            case 'INSERT':
                const insertMethod = relevantMethods.sort((a, b) => a.RequiredParams.length - b.RequiredParams.length)[0];
                content += generateInsertExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI, insertMethod);
                break;
            case 'UPDATE':
                const updateMethod = relevantMethods.sort((a, b) => a.RequiredParams.length - b.RequiredParams.length)[0];
                content += generateUpdateExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI, updateMethod);
                break;
            case 'REPLACE':
                const replaceMethod = relevantMethods.sort((a, b) => a.RequiredParams.length - b.RequiredParams.length)[0];
                content += generateUpdateExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI, replaceMethod, true);                
                break;
            case 'DELETE':
                const deleteMethod = relevantMethods.sort((a, b) => a.RequiredParams.length - b.RequiredParams.length)[0];
                content += generateDeleteExample(providerName, serviceName, resourceName, deleteMethod);
                break;
        }
    });

    return content;
}

function generateSelectExample(providerName, serviceName, resourceName, vwResourceName, exampleMethod, fields, vwFields, allSelectMethods = []) {
    // If only one SELECT method, use the original behavior
    if (allSelectMethods.length <= 1) {
        return generateSingleSelectExample(providerName, serviceName, resourceName, vwResourceName, exampleMethod, fields, vwFields);
    }

    // Multiple SELECT methods - use tabs for overloaded methods
    let retSelectStmt = `
## ${mdCodeAnchor}SELECT${mdCodeAnchor} examples

`;

    // Build tab configuration for overloaded SELECT methods
    const selectTabs = allSelectMethods.map(method => ({
        label: method.MethodName,
        value: method.MethodName
    }));

    retSelectStmt += `<Tabs
    defaultValue="${allSelectMethods[0].MethodName}"
    values={[
${selectTabs.map(tab => `        { label: '${tab.label}', value: '${tab.value}' }`).join(',\n')}
    ]
}>
`;

    // Generate content for each SELECT method tab
    allSelectMethods.forEach(method => {
        retSelectStmt += `<TabItem value="${method.MethodName}">

${cleanDescription(method.description)}

`;

        // Check if there is a view resource, use nested tabs if so
        if (vwFields.length > 0) {
            retSelectStmt += `<Tabs
    defaultValue="view"
    values={[
        { label: '${vwResourceName}', value: 'view', },
        { label: '${resourceName}', value: 'resource', },
    ]
}>
<TabItem value="view">

`;
            // Map over the fields array to create a list of column names
            const vwSelectColumns = vwFields.map(field => field.name).join(',\n');

            // Check if there are required parameters for this specific method
            const vwWhereClause = method.RequiredParams
                ? `WHERE ${method.RequiredParams.split(', ').map(param => `${param} = '{{ ${param} }}'`).join('\nAND ')}`
                : '';

            retSelectStmt += `${sqlCodeBlockStart}
SELECT
${vwSelectColumns}
FROM ${providerName}.${serviceName}.${vwResourceName}
${vwWhereClause};
${codeBlockEnd}

</TabItem>
<TabItem value="resource">

`;
        }

        // resource sql for this specific method
        const selectColumns = fields.map(field => field.name).join(',\n');

        // Check if there are required parameters for this specific method
        const whereClause = method.RequiredParams
            ? `WHERE ${method.RequiredParams.split(', ').map(param => `${param} = '{{ ${param} }}'`).join('\nAND ')}`
            : '';

        retSelectStmt += `${sqlCodeBlockStart}
SELECT
${selectColumns}
FROM ${providerName}.${serviceName}.${resourceName}
${whereClause};
${codeBlockEnd}`;

        if (vwFields.length > 0) {
            retSelectStmt += `
</TabItem>
</Tabs>`;
        }

        retSelectStmt += `
</TabItem>
`;
    });

    retSelectStmt += `</Tabs>
`;

    return retSelectStmt;
}

function generateSingleSelectExample(providerName, serviceName, resourceName, vwResourceName, method, fields, vwFields) {
    // heading and preamble
    let retSelectStmt = `
## ${mdCodeAnchor}SELECT${mdCodeAnchor} examples

${cleanDescription(method.description)}

`;

    // Check if there is a view resource, use tabs if so
    if(vwFields.length > 0) {
        retSelectStmt +=
`<Tabs
    defaultValue="view"
    values={[
        { label: '${vwResourceName}', value: 'view', },
        { label: '${resourceName}', value: 'resource', },
    ]
}>
<TabItem value="view">
`;
    // Map over the fields array to create a list of column names
    const vwSelectColumns = vwFields.map(field => field.name).join(',\n');

    // Check if there are required parameters
    const vwWhereClause = method.RequiredParams
        ? `WHERE ${method.RequiredParams.split(', ').map(param => `${param} = '{{ ${param} }}'`).join('\nAND ')}`
        : '';

    retSelectStmt += `
${sqlCodeBlockStart}
SELECT
${vwSelectColumns}
FROM ${providerName}.${serviceName}.${vwResourceName}
${vwWhereClause};
${codeBlockEnd}
</TabItem>
<TabItem value="resource">

`;
    }

    // resource sql
    // Map over the fields array to create a list of column names
    const selectColumns = fields.map(field => field.name).join(',\n');

    // Check if there are required parameters
    const whereClause = method.RequiredParams
        ? `WHERE ${method.RequiredParams.split(', ').map(param => `${param} = '{{ ${param} }}'`).join('\nAND ')}`
        : '';

    retSelectStmt += `
${sqlCodeBlockStart}
SELECT
${selectColumns}
FROM ${providerName}.${serviceName}.${resourceName}
${whereClause};
${codeBlockEnd}`;

    if(vwFields.length > 0) {
        retSelectStmt += `
</TabItem></Tabs>\n
`
    };

   return retSelectStmt;
}

const readOnlyPropertyNames = [
];

function getSchemaManifest(resourceName, requiredParams, requestBodySchema) {
    const allProps = [];

    // Helper function to recursively process properties in the schema
    function processProperties(properties) {
        const result = [];

        Object.entries(properties).forEach(([key, prop]) => {
            // Handle `allOf` by merging properties
            if (prop.allOf) {
                prop = prop.allOf.reduce((acc, item) => ({
                    ...acc,
                    ...item,
                    properties: {
                        ...acc.properties,
                        ...item.properties
                    },
                    required: Array.from(new Set([...(acc.required || []), ...(item.required || [])]))
                }), {});
            }

            // Exclude readOnly properties
            if (prop.readOnly) return;

            // Determine the property type or default to "string"
            const type = prop.type || "string";

            // Create base property object with name and value
            const baseProperty = {
                name: key,
                value: type
            };

            // Add description if available
            if (prop.description && prop.description.trim()) {
                baseProperty.description = cleanDescription(prop.description);
            }

            // Add default if available
            if (prop.default !== undefined) {
                baseProperty.default = prop.default;
            }

            // Add enum values to description if available
            if (prop.enum && prop.enum.length > 0) {
                const enumValues = prop.enum.map(val => `'${val}'`).join(', ');
                const enumText = `(valid values: ${enumValues})`;
                
                if (baseProperty.description) {
                    baseProperty.description = `${baseProperty.description} ${enumText}`;
                } else {
                    baseProperty.description = enumText;
                }
            }

            if (type === "object" && prop.properties) {
                const nestedProps = processProperties(prop.properties);

                const isFlatObject = nestedProps.every(p => typeof p.value === 'string');
                
                result.push({
                    ...baseProperty,
                    value: isFlatObject
                        ? Object.fromEntries(nestedProps.map(p => [p.name, p.value]))
                        : nestedProps
                });
            } else if (type === "array" && prop.items && prop.items.type === "object" && prop.items.properties) {
                // If array of objects, process items properties as nested value
                const nestedProps = processProperties(prop.items.properties);
                result.push({
                    ...baseProperty,
                    value: nestedProps
                });
            } else {
                // Simple property or array of non-objects
                result.push(baseProperty);
            }
        });

        return result;
    }

    // Add requiredParams as simple properties (these typically don't have descriptions in the schema)
    requiredParams.forEach(param => {
        allProps.push({
            name: param,
            value: "string",
            description: `Required parameter for the ${resourceName} resource.`
        });
    });

    // Process requestBodySchema properties and add to allProps
    if (requestBodySchema?.properties) {
        allProps.push(...processProperties(requestBodySchema.properties));
    }

    // one last pass through allProps to remove any duplicate properties (data__<name> vs <name>)
    const dedupedProps = [];
    const seenNames = new Set();
    const propMap = new Map(); // Store props by name for easier lookup

    // First, create a map of all properties for easy lookup
    allProps.forEach(prop => {
        propMap.set(prop.name, prop);
    });

    allProps.forEach(prop => {
        if (prop.name.startsWith('data__')) {
            const baseName = prop.name.substring(6);
            // Check if we already have the non-prefixed version
            if (!seenNames.has(baseName)) {
                // Check if there's a non-prefixed version
                const nonPrefixedProp = propMap.get(baseName);
                if (!nonPrefixedProp) {
                    // No non-prefixed version exists, keep the data__ version
                    dedupedProps.push(prop);
                    seenNames.add(prop.name);
                }
            }
        } else {
            // Non-prefixed property - check if we need to merge descriptions
            const dataPrefixedProp = propMap.get(`data__${prop.name}`);
            
            if (dataPrefixedProp && dataPrefixedProp.description) {
                // Merge descriptions if both exist
                if (prop.description && dataPrefixedProp.description !== prop.description) {
                    prop.description = `${prop.description} (${dataPrefixedProp.description})`;
                } else if (!prop.description) {
                    // Use the data__ description if no native description exists
                    prop.description = dataPrefixedProp.description;
                }
            }
            
            dedupedProps.push(prop);
            seenNames.add(prop.name);
            // Mark that we've seen this base name to skip any data__ version
            seenNames.add(`data__${prop.name}`);
        }
    });

    return [{
        name: resourceName,
        props: dedupedProps
    }];

}

function replaceAllOf(schema, visited = new Set(), depth = 0) {
    if (!schema || typeof schema !== 'object') return schema;
    
    // Prevent excessive recursion by setting a max depth limit
    const MAX_DEPTH = 20;
    if (depth > MAX_DEPTH) {
        console.warn('Max depth reached, stopping recursion.');
        return schema;
    }

    // Track objects already visited to prevent circular references
    if (visited.has(schema)) {
        console.warn('Circular reference detected, skipping.');
        return schema;
    }
    visited.add(schema);

    // If schema contains `allOf`, merge all elements within it
    if (schema.allOf) {
        schema = schema.allOf.reduce((acc, item) => {
            // Recurse into each `allOf` item with depth tracking and visited nodes
            const mergedItem = replaceAllOf(item, visited, depth + 1);
            return {
                ...acc,
                ...mergedItem,
                properties: {
                    ...acc.properties,
                    ...mergedItem.properties
                },
                required: Array.from(new Set([...(acc.required || []), ...(mergedItem.required || [])]))
            };
        }, {});
    }

    // Recursively apply to properties and other nested schemas
    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = replaceAllOf(schema.properties[key], visited, depth + 1);
        }
    }

    if (schema.items) {
        schema.items = Array.isArray(schema.items)
            ? schema.items.map(item => replaceAllOf(item, visited, depth + 1))
            : replaceAllOf(schema.items, visited, depth + 1);
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        schema.additionalProperties = replaceAllOf(schema.additionalProperties, visited, depth + 1);
    }

    // After processing, remove the schema from the visited set to allow re-processing in a different branch
    visited.delete(schema);

    return schema;
}

function replaceAnyOfOneOf(schema, visited = new Set(), depth = 0) {
    if (!schema || typeof schema !== 'object') return schema;

    // Define a maximum depth to prevent excessive recursion
    const MAX_DEPTH = 20;
    if (depth > MAX_DEPTH) {
        console.warn('Max depth reached, stopping recursion.');
        return schema;
    }

    // Check for circular references using a Set of visited nodes
    if (visited.has(schema)) {
        console.warn('Circular reference detected, skipping.');
        return schema;
    }
    visited.add(schema);

    // Handle `anyOf` by replacing with the first element
    if (schema.anyOf) {
        schema = replaceAnyOfOneOf(schema.anyOf[0], visited, depth + 1); // Recursively process the first option
    }

    // Handle `oneOf` by replacing with the first element
    if (schema.oneOf) {
        schema = replaceAnyOfOneOf(schema.oneOf[0], visited, depth + 1); // Recursively process the first option
    }

    // Recursively apply to properties and other nested schemas
    if (schema.properties) {
        for (const key in schema.properties) {
            schema.properties[key] = replaceAnyOfOneOf(schema.properties[key], visited, depth + 1);
        }
    }

    if (schema.items) {
        schema.items = Array.isArray(schema.items)
            ? schema.items.map(item => replaceAnyOfOneOf(item, visited, depth + 1))
            : replaceAnyOfOneOf(schema.items, visited, depth + 1);
    }

    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        schema.additionalProperties = replaceAnyOfOneOf(schema.additionalProperties, visited, depth + 1);
    }

    // Remove schema from visited set after processing
    visited.delete(schema);

    return schema;
}

function removeReadOnlyProperties(schema, visited = new Set(), depth = 0) {
    if (!schema || typeof schema !== 'object') return schema;

    // Define a maximum depth to prevent excessive recursion
    const MAX_DEPTH = 20;
    if (depth > MAX_DEPTH) {
        console.warn('Max depth reached, stopping recursion.');
        return schema;
    }

    // Check for circular references using a Set of visited nodes
    if (visited.has(schema)) {
        console.warn('Circular reference detected, skipping.');
        return schema;
    }
    visited.add(schema);

    // Check for and remove `readOnly` properties within `properties`
    if (schema.properties) {
        for (const key in schema.properties) {
            const property = schema.properties[key];
            if (property.readOnly) {
                delete schema.properties[key];
            } else {
                // Recursively process nested properties
                schema.properties[key] = removeReadOnlyProperties(property, visited, depth + 1);
            }
        }
    }

    // Recursively process `items` if it's an array schema or contains objects
    if (schema.items) {
        schema.items = Array.isArray(schema.items)
            ? schema.items.map(item => removeReadOnlyProperties(item, visited, depth + 1))
            : removeReadOnlyProperties(schema.items, visited, depth + 1);
    }

    // Recursively process `additionalProperties` if it's an object schema
    if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        schema.additionalProperties = removeReadOnlyProperties(schema.additionalProperties, visited, depth + 1);
    }

    // Remove schema from visited set after processing
    visited.delete(schema);

    return schema;
}

function generateInsertExample(
    providerName, 
    serviceName, 
    resourceName, 
    resourceData, 
    dereferencedAPI, 
    method) {
    try {

        console.log(`processing insert for ${resourceName}...`);

        const requiredParams = method.RequiredParams
            ? method.RequiredParams.split(', ').map(param => param.trim())
            : [];

        // Get operation reference and path
        const operationRef = resourceData.methods[method.MethodName].operation.$ref;
        const operationPathParts = operationRef.replace('#/paths/', '').replace(/~1/g, '/').split('/');
        const operationVerb = operationPathParts.pop();
        const operationPath = operationPathParts.join('/');
        
        console.info("operationPath:", operationPath);
        console.info("operationVerb:", operationVerb);
        
        let requestBodySchema;

        // Try to access the path directly
        let pathObj = dereferencedAPI.paths[operationPath];

        // If the path isn't found directly, iterate to look for a match
        if (!pathObj) {
            pathObj = Object.entries(dereferencedAPI.paths).find(([key]) => key === operationPath)?.[1];
        }

        // Ensure the path and operation (e.g., POST) exist and contain a requestBody
        if (pathObj && pathObj[operationVerb] && pathObj[operationVerb].requestBody) {
            requestBodySchema = pathObj[operationVerb].requestBody.content?.['application/json']?.schema;

            requestBodySchema = replaceAllOf(requestBodySchema);

            requestBodySchema = replaceAnyOfOneOf(requestBodySchema);

            requestBodySchema = removeReadOnlyProperties(requestBodySchema);

            // console.info("Request Body Schema:", requestBodySchema);
        } else {
            console.log("path, operation, or requestBody not found for:", operationPath);
        }

        // Remove "data__" prefix from requiredParams if it exists
        const normalizedRequiredParams = requiredParams.map(field =>
            field.startsWith("data__") ? field.slice("data__".length) : field
        );

        // INSERT column list
        const reqBodyRequiredFieldsColList = (requestBodySchema?.required || []).map(field => `data__${field}`);
        const reqBodyAllFieldsColList = Object.keys(requestBodySchema?.properties || {}).map(field => `data__${field}`);
        
        const requiredInsertFields = Array.from(new Set([...reqBodyRequiredFieldsColList, ...requiredParams]));
        const allInsertFields = Array.from(new Set([...reqBodyAllFieldsColList, ...requiredParams]));

        // INSERT select values
        const reqBodyRequiredFieldsSelectVals = (requestBodySchema?.required || []).map(field => {
            const fieldType = requestBodySchema.properties?.[field]?.type || 'string';
            return shouldQuoteValue(fieldType) ? `'{{ ${field} }}'` : `{{ ${field} }}`;
        });

        const reqBodyAllFieldsSelectVals = Object.keys(requestBodySchema?.properties || {}).map(field => {
            const fieldType = requestBodySchema.properties?.[field]?.type || 'string';
            return shouldQuoteValue(fieldType) ? `'{{ ${field} }}'` : `{{ ${field} }}`;
        });
        
        const requiredSelectValues = Array.from(new Set([
            ...reqBodyRequiredFieldsSelectVals, 
            ...normalizedRequiredParams.map(field => {
                const fieldType = requestBodySchema?.properties?.[field]?.type || 'string';
                return shouldQuoteValue(fieldType) ? `'{{ ${field} }}'` : `{{ ${field} }}`;
            })
        ]));

        const allSelectValues = Array.from(new Set([
            ...reqBodyAllFieldsSelectVals, 
            ...normalizedRequiredParams.map(field => {
                const fieldType = requestBodySchema?.properties?.[field]?.type || 'string';
                return shouldQuoteValue(fieldType) ? `'{{ ${field} }}'` : `{{ ${field} }}`;
            })
        ]));         

        // Check if 'Required Properties' tab should be added
        const shouldAddRequiredTab = requiredInsertFields.length > 0 && requiredInsertFields.length !== allInsertFields.length;

        const yamlManifest = yaml.dump(
            getSchemaManifest(resourceName, requiredParams, requestBodySchema),
            { quotingType: "'", lineWidth: 80, noRefs: true, skipInvalid: true }
        );

        const yamlWithComment = `# Description fields below are for documentation purposes only and are not required in the manifest
${yamlManifest.trim()}`;

        return `
## ${mdCodeAnchor}INSERT${mdCodeAnchor} example

${cleanDescription(method.description)}

<Tabs
    defaultValue="all"
    values={[
        ${shouldAddRequiredTab ? "{ label: 'Required Properties', value: 'required' }," : ""}
        { label: 'All Properties', value: 'all', },
        { label: 'Manifest', value: 'manifest', },
    ]
}>
<TabItem value="all">

${sqlCodeBlockStart}
/*+ create */
INSERT INTO ${providerName}.${serviceName}.${resourceName} (
${allInsertFields.join(',\n')}
)
SELECT 
${allSelectValues.join(',\n')}
;
${codeBlockEnd}
</TabItem>
${shouldAddRequiredTab ? `
<TabItem value="required">

${sqlCodeBlockStart}
/*+ create */
INSERT INTO ${providerName}.${serviceName}.${resourceName} (
${requiredInsertFields.join(',\n')}
)
SELECT 
${requiredSelectValues.join(',\n')}
;
${codeBlockEnd}
</TabItem>
` : ""}
<TabItem value="manifest">

${yamlCodeBlockStart}
${yamlWithComment}
${codeBlockEnd}
</TabItem>
</Tabs>
`;
    } catch (error) {
        console.log('Error generating INSERT example:', error);
        return '';
    }
}

function generateUpdateExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI, method, isReplace = false) {
    try {
        console.log(`processing update for ${resourceName}...`);

        // Get required parameters from the method
        const requiredParams = method.RequiredParams
            ? method.RequiredParams.split(', ').map(param => param.trim())
            : [];

        // Get operation reference and path
        const operationRef = resourceData.methods[method.MethodName].operation.$ref;
        const operationPathParts = operationRef.replace('#/paths/', '').replace(/~1/g, '/').split('/');
        const operationVerb = operationPathParts.pop();
        const operationPath = operationPathParts.join('/');

        // Access the path in the dereferenced API schema
        let pathObj = dereferencedAPI.paths[operationPath];
        if (!pathObj) {
            pathObj = Object.entries(dereferencedAPI.paths).find(([key]) => key === operationPath)?.[1];
        }

        // Retrieve and process requestBodySchema
        let requestBodySchema;
        if (pathObj && pathObj[operationVerb] && pathObj[operationVerb].requestBody) {
            requestBodySchema = pathObj[operationVerb].requestBody.content?.['application/json']?.schema;

            requestBodySchema = replaceAllOf(requestBodySchema);
            requestBodySchema = replaceAnyOfOneOf(requestBodySchema);
            requestBodySchema = removeReadOnlyProperties(requestBodySchema);
        } else {
            console.log("Path, operation, or requestBody not found for:", operationPath);
        }

        const reqBodyRequiredFieldsSetParams = Object.keys(requestBodySchema?.properties || {}).map(field => {
            const fieldType = requestBodySchema.properties?.[field]?.type || 'string';
            if (fieldType === 'string' || fieldType === 'array' || fieldType === 'object') {
                return `${field} = '{{ ${field} }}'`;
            } else {
                return `${field} = {{ ${field} }}`;
            }
        }).join(',\n');

        // Generate WHERE clause: requiredParams only
        const whereClause = requiredParams.map(param => `${param} = '{{ ${param} }}'`).join('\nAND ');

        // Description based on operation type
        let sqlDescription = `${cleanDescription(method.description)}`;

        return `
## ${mdCodeAnchor}${isReplace ? 'REPLACE' : 'UPDATE'}${mdCodeAnchor} example

${sqlDescription}

${sqlCodeBlockStart}
/*+ update */
${isReplace ? 'REPLACE' : 'UPDATE'} ${providerName}.${serviceName}.${resourceName}
SET 
${reqBodyRequiredFieldsSetParams}
WHERE 
${whereClause};
${codeBlockEnd}
`;
    } catch (error) {
        console.log('Error generating UPDATE example:', error);
        return '';
    }
}

function generateDeleteExample(providerName, serviceName, resourceName, method) {
    return `
## ${mdCodeAnchor}DELETE${mdCodeAnchor} example

${cleanDescription(method.description)}

${sqlCodeBlockStart}
/*+ delete */
DELETE FROM ${providerName}.${serviceName}.${resourceName}
WHERE ${method.RequiredParams.split(', ').map(param => `${param} = '{{ ${param} }}'`).join('\nAND ')};
${codeBlockEnd}
`;
}

function getOptionalParams(methodName, resourceData, dereferencedAPI) {
    try {
        // Get the operation reference for this method
        const operationRef = resourceData.methods[methodName]?.operation?.$ref;
        if (!operationRef) {
            return '';
        }

        // Parse the operation reference to get path and verb
        const operationPathParts = operationRef.replace('#/paths/', '').replace(/~1/g, '/').split('/');
        const operationVerb = operationPathParts.pop();
        const operationPath = operationPathParts.join('/');

        // Find the operation in the dereferenced API
        let pathObj = dereferencedAPI.paths[operationPath];
        if (!pathObj) {
            pathObj = Object.entries(dereferencedAPI.paths).find(([key]) => key === operationPath)?.[1];
        }

        if (!pathObj || !pathObj[operationVerb] || !pathObj[operationVerb].parameters) {
            return '';
        }

        // Extract query parameters that are NOT required (these are optional params)
        const queryParams = pathObj[operationVerb].parameters
            .filter(param => param.in === 'query' && !param.required)
            .map(param => `<CopyableCode code="${param.name}" />`)
            .join(', ');

        return queryParams;
    } catch (error) {
        console.log(`Error getting optional params for ${methodName}:`, error);
        return '';
    }
}

function getOptionalParamsDetails(methods, resourceData, dereferencedAPI) {
    try {
        const allOptionalParams = new Map(); // Use Map to avoid duplicates

        methods.forEach(method => {
            // Get the operation reference for this method
            const operationRef = resourceData.methods[method.MethodName]?.operation?.$ref;
            if (!operationRef) {
                return;
            }

            // Parse the operation reference to get path and verb
            const operationPathParts = operationRef.replace('#/paths/', '').replace(/~1/g, '/').split('/');
            const operationVerb = operationPathParts.pop();
            const operationPath = operationPathParts.join('/');

            // Find the operation in the dereferenced API
            let pathObj = dereferencedAPI.paths[operationPath];
            if (!pathObj) {
                pathObj = Object.entries(dereferencedAPI.paths).find(([key]) => key === operationPath)?.[1];
            }

            if (!pathObj || !pathObj[operationVerb] || !pathObj[operationVerb].parameters) {
                return;
            }

            // Extract query parameters that are NOT required, with their details
            pathObj[operationVerb].parameters
                .filter(param => param.in === 'query' && !param.required)
                .forEach(param => {
                    if (!allOptionalParams.has(param.name)) {
                        allOptionalParams.set(param.name, {
                            name: param.name,
                            description: param.description || '-',
                            type: param.schema?.type || '-',
                            default: param.schema?.default !== undefined ? String(param.schema.default) : '-'
                        });
                    }
                });
        });

        if (allOptionalParams.size === 0) {
            return '';
        }

        let detailsContent = `
<details>
<summary>Optional Parameter Details</summary>

| Name | Description | Type | Default |
|------|-------------|------|---------|
`;

        // Sort parameters alphabetically by name
        const sortedParams = Array.from(allOptionalParams.values()).sort((a, b) => a.name.localeCompare(b.name));

        sortedParams.forEach(param => {
            detailsContent += `| <CopyableCode code="${param.name}" /> | ${cleanDescription(param.description)} | ${mdCodeAnchor}${param.type}${mdCodeAnchor} | ${mdCodeAnchor}${param.default}${mdCodeAnchor} |\n`;
        });

        detailsContent += `
</details>
`;

        return detailsContent;
    } catch (error) {
        console.log('Error getting optional params details:', error);
        return '';
    }
}
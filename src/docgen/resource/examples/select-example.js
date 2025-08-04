// src/docgen/resource/examples/select-example.js

export function createSelectExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    // Skip if no resource data or methods
    if (!resourceData || !resourceData.methods) {
        return '';
    }
    
    // Get the methods for SELECT operations
    const selectMethods = getSelectMethods(resourceData);
    if (selectMethods.length === 0) {
        return '';
    }
    
    // Start building the SELECT examples content
    let content = '\n## `SELECT` examples\n\n';
    content += '<Tabs\n';
    content += `    defaultValue="${selectMethods[0].name}"\n`;
    content += '    values={[\n';
    
    // Create the tab values
    for (const method of selectMethods) {
        content += `        { label: '${method.name}', value: '${method.name}' }${method !== selectMethods[selectMethods.length - 1] ? ',' : ''}\n`;
    }
    
    content += '    ]}\n';
    content += '>\n';
    
    // Create tab content for each SELECT method
    for (const method of selectMethods) {
        content += createSelectMethodTab(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    }
    
    content += '</Tabs>\n';
    
    return content;
}

function getSelectMethods(resourceData) {
    // Extract SELECT methods from sqlVerbs
    const selectMethods = [];
    
    if (resourceData.sqlVerbs && resourceData.sqlVerbs.select) {
        for (const methodRef of resourceData.sqlVerbs.select) {
            // Extract method name from reference
            const methodName = methodRef.$ref.split('/').pop();
            if (resourceData.methods[methodName]) {
                selectMethods.push({
                    name: methodName,
                    ...resourceData.methods[methodName]
                });
            }
        }
    }
    
    return selectMethods;
}

function createSelectMethodTab(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    const { name, operation } = method;
    const description = operation.description || '';
    
    let content = `<TabItem value="${name}">\n\n`;
    content += `${description}\n\n`;
    content += '```sql\n';
    content += generateSelectSql(name, providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    content += '```\n';
    content += '</TabItem>\n';
    
    return content;
}

function generateSelectSql(methodName, providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    // Find the method's operation
    const method = resourceData.methods[methodName];
    if (!method || !method.operation) {
        return '-- Method operation not found';
    }
    
    // Get fields that would be returned
    const fields = getResourceFields(resourceData, dereferencedAPI);
    
    // Generate SELECT statement
    let sql = 'SELECT\n';
    
    // Add fields
    if (fields.length > 0) {
        sql += fields.map(field => field.name).join(',\n');
        sql += '\n';
    } else {
        sql += '*\n';
    }
    
    // Add FROM clause
    sql += `FROM ${providerName}.${serviceName}.${resourceName}\n`;
    
    // Add WHERE clause with required parameters
    const requiredParams = getRequiredParams(method.operation);
    
    if (requiredParams.length > 0) {
        sql += 'WHERE ';
        sql += requiredParams.map(param => {
            // Handle "endpoint" specially since it's common
            if (param === 'endpoint') {
                return `${param} = '{{ ${param} }}'`;
            }
            
            // For path parameters, use the name directly
            if (method.operation.parameters && method.operation.parameters.some(p => p.name === param)) {
                return `${param} = '{{ ${param} }}'`;
            }
            
            // For data parameters, strip the "data__" prefix
            if (param.startsWith('data__')) {
                const actualParam = param.substring(6);
                return `${actualParam} = '{{ ${actualParam} }}'`;
            }
            
            return `${param} = '{{ ${param} }}'`;
        }).join('\nAND ');
        sql += ';';
    }
    
    return sql;
}

function getResourceFields(resourceData, dereferencedAPI) {
    // Extract fields from the first method with a response schema
    const methods = Object.values(resourceData.methods);
    
    for (const method of methods) {
        if (method.response && method.response.mediaType === 'application/json' && method.operation) {
            const responseDoc = method.operation.responses && method.operation.responses[method.response.openAPIDocKey];
            
            if (responseDoc && responseDoc.content && responseDoc.content['application/json'] && responseDoc.content['application/json'].schema) {
                return extractFieldsFromSchema(responseDoc.content['application/json'].schema);
            }
        }
    }
    
    return [];
}

function extractFieldsFromSchema(schema) {
    // Handle array responses
    if (schema.type === 'array' && schema.items) {
        if (schema.items.properties) {
            return extractFieldsFromProperties(schema.items.properties);
        }
    }
    
    // Handle direct object responses
    if (schema.properties) {
        return extractFieldsFromProperties(schema.properties);
    }
    
    return [];
}

function extractFieldsFromProperties(properties) {
    return Object.keys(properties).map(name => ({ name }));
}

function getRequiredParams(operation) {
    const requiredParams = [];
    
    // Process path parameters
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (param.required) {
                requiredParams.push(param.name);
            }
        }
    }
    
    return requiredParams;
}
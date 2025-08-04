// src/docgen/resource/examples/update-example.js

export function createUpdateExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    // Skip if no resource data or methods
    if (!resourceData || !resourceData.methods) {
        return '';
    }
    
    // Get the methods for REPLACE/UPDATE operations
    const replaceMethods = getReplaceMethods(resourceData);
    if (replaceMethods.length === 0) {
        return '';
    }
    
    // We'll just use the first REPLACE method for the example
    const method = replaceMethods[0];
    
    // Start building the REPLACE example content
    let content = '\n## `REPLACE` example\n\n';
    content += `${method.operation.description || ''}\n\n`;
    content += '```sql\n';
    content += generateUpdateSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    content += '```\n';
    
    return content;
}

function getReplaceMethods(resourceData) {
    // Extract REPLACE methods from sqlVerbs
    const replaceMethods = [];
    
    if (resourceData.sqlVerbs && resourceData.sqlVerbs.replace) {
        for (const methodRef of resourceData.sqlVerbs.replace) {
            // Extract method name from reference
            const methodName = methodRef.$ref.split('/').pop();
            if (resourceData.methods[methodName]) {
                replaceMethods.push({
                    name: methodName,
                    ...resourceData.methods[methodName]
                });
            }
        }
    }
    
    return replaceMethods;
}

function generateUpdateSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    const { operation } = method;
    
    // Get properties for the UPDATE
    const properties = getUpdateProperties(operation);
    if (properties.length === 0) {
        return '-- No properties found for REPLACE';
    }
    
    // Generate REPLACE statement
    let sql = '/*+ update */\n';
    sql += `REPLACE ${providerName}.${serviceName}.${resourceName}\n`;
    
    // Add SET clause with properties
    sql += 'SET \n';
    sql += properties.map(prop => {
        return `${prop.name} = '{{ ${prop.name} }}'`;
    }).join(',\n');
    sql += '\n';
    
    // Add WHERE clause with primary keys
    const primaryKeys = getPrimaryKeys(operation);
    if (primaryKeys.length > 0) {
        sql += 'WHERE \n';
        sql += primaryKeys.map(key => {
            return `${key} = '{{ ${key} }}'`;
        }).join('\nAND ');
        sql += '\n';
    }
    
    // Add data__name for APIs that require it
    if (resourceData.methods[method.name].operation.requestBody) {
        sql += 'AND data__name = \'{{ data__name }}\'\n';
    }
    
    // Add endpoint
    sql += 'AND endpoint = \'{{ endpoint }}\';';
    
    return sql;
}

function getUpdateProperties(operation) {
    const properties = [];
    
    // Process request body properties
    if (operation.requestBody && operation.requestBody.content && 
        operation.requestBody.content['application/json'] && 
        operation.requestBody.content['application/json'].schema) {
        
        const schema = operation.requestBody.content['application/json'].schema;
        
        if (schema.properties) {
            for (const [propName, propValue] of Object.entries(schema.properties)) {
                // Skip endpoint
                if (propName === 'endpoint') continue;
                
                properties.push({
                    name: propName,
                    required: schema.required && schema.required.includes(propName),
                    type: propValue.type || 'object',
                    description: propValue.description || ''
                });
            }
        }
    }
    
    return properties;
}

function getPrimaryKeys(operation) {
    const primaryKeys = [];
    
    // Look for parameters that are used in the path - these are usually primary keys
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (param.in === 'path' && param.name !== 'endpoint') {
                primaryKeys.push(param.name);
            }
        }
    }
    
    // If no path parameters, assume 'name' is the primary key
    if (primaryKeys.length === 0) {
        primaryKeys.push('name');
    }
    
    return primaryKeys;
}
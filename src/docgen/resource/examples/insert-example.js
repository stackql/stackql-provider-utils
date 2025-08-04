// src/docgen/resource/examples/insert-example.js

export function createInsertExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    // Skip if no resource data or methods
    if (!resourceData || !resourceData.methods) {
        return '';
    }
    
    // Get the methods for INSERT operations
    const insertMethods = getInsertMethods(resourceData);
    if (insertMethods.length === 0) {
        return '';
    }
    
    // We'll just use the first INSERT method for the example
    const method = insertMethods[0];
    
    // Start building the INSERT example content
    let content = '\n## `INSERT` example\n\n';
    content += `${method.operation.description || ''}\n\n`;
    
    // Create tabs for different ways to show the INSERT
    content += '<Tabs\n';
    content += '    defaultValue="all"\n';
    content += '    values={[\n';
    content += '        { label: \'Required Properties\', value: \'required\' },\n';
    content += '        { label: \'All Properties\', value: \'all\', },\n';
    content += '        { label: \'Manifest\', value: \'manifest\', },\n';
    content += '    ]}\n';
    content += '>\n';
    
    // All properties tab
    content += '<TabItem value="all">\n\n';
    content += '```sql\n';
    content += generateInsertSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI, false);
    content += '```\n';
    content += '</TabItem>\n\n';
    
    // Required properties tab
    content += '<TabItem value="required">\n\n';
    content += '```sql\n';
    content += generateInsertSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI, true);
    content += '```\n';
    content += '</TabItem>\n\n';
    
    // Manifest tab
    content += '<TabItem value="manifest">\n\n';
    content += '```yaml\n';
    content += generateManifestYaml(method, resourceName, resourceData, dereferencedAPI);
    content += '```\n';
    content += '</TabItem>\n';
    content += '</Tabs>\n';
    
    return content;
}

function getInsertMethods(resourceData) {
    // Extract INSERT methods from sqlVerbs
    const insertMethods = [];
    
    if (resourceData.sqlVerbs && resourceData.sqlVerbs.insert) {
        for (const methodRef of resourceData.sqlVerbs.insert) {
            // Extract method name from reference
            const methodName = methodRef.$ref.split('/').pop();
            if (resourceData.methods[methodName]) {
                insertMethods.push({
                    name: methodName,
                    ...resourceData.methods[methodName]
                });
            }
        }
    }
    
    return insertMethods;
}

function generateInsertSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI, requiredOnly) {
    const { operation } = method;
    
    // Get properties for the INSERT
    const properties = getInsertProperties(operation, requiredOnly);
    if (properties.length === 0) {
        return '-- No properties found for INSERT';
    }
    
    // Generate INSERT statement
    let sql = '/*+ create */\n';
    sql += `INSERT INTO ${providerName}.${serviceName}.${resourceName} (\n`;
    
    // Add column names (with data__ prefix for request body fields)
    sql += properties.map(prop => {
        if (prop.in === 'body') {
            return `data__${prop.name}`;
        }
        return prop.name;
    }).join(',\n');
    sql += '\n)\n';
    
    // Add SELECT statement with values
    sql += 'SELECT \n';
    sql += properties.map(prop => {
        return `'{{ ${prop.name} }}'`;
    }).join(',\n');
    sql += ',\n';
    sql += "'{{ endpoint }}'";
    sql += '\n;\n';
    
    return sql;
}

function getInsertProperties(operation, requiredOnly) {
    const properties = [];
    
    // Process path parameters
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (param.name !== 'endpoint' && (!requiredOnly || param.required)) {
                properties.push({
                    name: param.name,
                    required: param.required,
                    in: 'path',
                    type: param.schema ? param.schema.type : 'string',
                    description: param.description || ''
                });
            }
        }
    }
    
    // Process request body properties
    if (operation.requestBody && operation.requestBody.content && 
        operation.requestBody.content['application/json'] && 
        operation.requestBody.content['application/json'].schema) {
        
        const schema = operation.requestBody.content['application/json'].schema;
        
        if (schema.properties) {
            for (const [propName, propValue] of Object.entries(schema.properties)) {
                // Skip endpoint
                if (propName === 'endpoint') continue;
                
                const isRequired = schema.required && schema.required.includes(propName);
                
                if (!requiredOnly || isRequired) {
                    properties.push({
                        name: propName,
                        required: isRequired,
                        in: 'body',
                        type: propValue.type || 'object',
                        description: propValue.description || ''
                    });
                }
            }
        }
    }
    
    // Always add name for the resource (if not already included)
    if (!properties.some(p => p.name === 'name')) {
        properties.push({
            name: 'name',
            required: true,
            in: 'body',
            type: 'string',
            description: 'Resource name'
        });
    }
    
    return properties;
}

function generateManifestYaml(method, resourceName, resourceData, dereferencedAPI) {
    // Get all properties for the manifest
    const properties = getInsertProperties(method.operation, false);
    
    let yaml = '# Description fields below are for documentation purposes only and are not required in the manifest\n';
    yaml += `- name: ${resourceName}\n`;
    yaml += '  props:\n';
    
    // Add endpoint parameter
    yaml += '    - name: endpoint\n';
    yaml += '      value: string\n';
    yaml += `      description: Required parameter for the ${resourceName} resource.\n`;
    
    // Add all other properties
    for (const prop of properties) {
        yaml += `    - name: ${prop.name}\n`;
        yaml += `      value: ${prop.type}\n`;
        
        // Add description with required note if applicable
        let description = prop.description || '';
        if (prop.required) {
            description += description ? ` (Required parameter for the ${resourceName} resource.)` : `Required parameter for the ${resourceName} resource.`;
        }
        
        if (description) {
            // Format multi-line descriptions properly
            const descLines = wordWrap(description, 70);
            yaml += '      description: >';
            for (let i = 0; i < descLines.length; i++) {
                if (i === 0) {
                    yaml += `-\n        ${descLines[i]}\n`;
                } else {
                    yaml += `        ${descLines[i]}\n`;
                }
            }
        }
        
        // Add default value if available
        if (prop.default !== undefined) {
            yaml += `      default: ${prop.default}\n`;
        }
    }
    
    return yaml;
}

function wordWrap(text, maxLineLength) {
    if (!text) return [''];
    
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxLineLength) {
            currentLine += (currentLine.length > 0 ? ' ' : '') + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    
    if (currentLine.length > 0) {
        lines.push(currentLine);
    }
    
    return lines;
}
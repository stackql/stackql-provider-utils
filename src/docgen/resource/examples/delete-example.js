// src/docgen/resource/examples/delete-example.js

export function createDeleteExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    // Skip if no resource data or methods
    if (!resourceData || !resourceData.methods) {
        return '';
    }
    
    // Get the methods for DELETE operations
    const deleteMethods = getDeleteMethods(resourceData);
    if (deleteMethods.length === 0) {
        return '';
    }
    
    // We'll just use the first DELETE method for the example
    const method = deleteMethods[0];
    
    // Start building the DELETE example content
    let content = '\n## `DELETE` example\n\n';
    content += `${method.operation.description || ''}\n\n`;
    content += '```sql\n';
    content += generateDeleteSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    content += '```\n';
    
    return content;
}

function getDeleteMethods(resourceData) {
    // Extract DELETE methods from sqlVerbs
    const deleteMethods = [];
    
    if (resourceData.sqlVerbs && resourceData.sqlVerbs.delete) {
        for (const methodRef of resourceData.sqlVerbs.delete) {
            // Extract method name from reference
            const methodName = methodRef.$ref.split('/').pop();
            if (resourceData.methods[methodName]) {
                deleteMethods.push({
                    name: methodName,
                    ...resourceData.methods[methodName]
                });
            }
        }
    }
    
    return deleteMethods;
}

function generateDeleteSql(method, providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    const { operation } = method;
    
    // Generate DELETE statement
    let sql = '/*+ delete */\n';
    sql += `DELETE FROM ${providerName}.${serviceName}.${resourceName}\n`;
    
    // Add WHERE clause with primary keys and required parameters
    const whereConditions = getWhereConditions(operation);
    if (whereConditions.length > 0) {
        sql += 'WHERE ';
        sql += whereConditions.map(condition => {
            return `${condition} = '{{ ${condition} }}'`;
        }).join('\nAND ');
        sql += ';';
    }
    
    return sql;
}

function getWhereConditions(operation) {
    const conditions = [];
    
    // Process required parameters
    if (operation.parameters) {
        for (const param of operation.parameters) {
            if (param.required && param.name !== 'endpoint') {
                conditions.push(param.name);
            }
        }
    }
    
    // Always add endpoint
    conditions.push('endpoint');
    
    return conditions;
}
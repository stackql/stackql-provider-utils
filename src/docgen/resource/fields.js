// src/docgen/resource/fields.js
import { 
    cleanDescription, 
    getHttpOperationForSqlVerb,
    getHttpOperationResponse,
} from '../helpers.js';

const sqlCodeBlockStart = '```sql';
const yamlCodeBlockStart = '```yaml';
const codeBlockEnd = '```';
const mdCodeAnchor = "`";

export function createFieldsSection(resourceData, dereferencedAPI) {

    let content = '## Fields\n';

    if (resourceData.sqlVerbs.select && resourceData.sqlVerbs.select.length > 0) {
        content += '| Name | Datatype | Description |\n|:-----|:---------|:------------|\n';
        for (const selectMethod of resourceData.sqlVerbs.select) {
            const {path, httpVerb, mediaType, openAPIDocKey, objectKey, methodName} = getHttpOperationForSqlVerb(selectMethod.$ref, resourceData);
            const {respProps, respDescription} = getHttpOperationResponse(dereferencedAPI, path, httpVerb, mediaType, openAPIDocKey, objectKey);
            console.info(respDescription);
            console.info(respProps);
            console.info(methodName);
        }
        
    } else {
        // no fields
        content += `${mdCodeAnchor}SELECT${mdCodeAnchor} not supported for this resource, use ${mdCodeAnchor}SHOW METHODS${mdCodeAnchor} to view available operations for the resource.\n\n`;
    }

    return content;

//     if (fields.length === 0) {
//     } else {
//         if (mergedFields.length > 0) {
//             // we have a view, use tabs
//             content +=
// `<Tabs
//     defaultValue="view"
//     values={[
//         { label: '${vwResourceName}', value: 'view', },
//         { label: '${resourceName}', value: 'resource', },
//     ]
// }>
// <TabItem value="view">

// `;
//             
//             mergedFields.forEach(field => {
//                 content += `| <CopyableCode code="${field.name}" /> | ${mdCodeAnchor}${field.type}${mdCodeAnchor} | ${cleanDescription(field.description)} |\n`;
//             });
//             content += '</TabItem>\n';
//             content += '<TabItem value="resource">\n';

    // if (!resourceData || !resourceData.methods) {
    //     return '';
    // }

    // // Extract response schema from the first method with a valid response schema
    // const methods = Object.values(resourceData.methods);
    // let responseSchema = null;

    // for (const method of methods) {
    //     if (method.response && method.response.mediaType === 'application/json' && method.operation) {
    //         const responseDoc = method.operation.responses && method.operation.responses[method.response.openAPIDocKey];
    //         if (responseDoc && responseDoc.content && responseDoc.content['application/json'] && responseDoc.content['application/json'].schema) {
    //             responseSchema = responseDoc.content['application/json'].schema;
    //             break;
    //         }
    //     }
    // }

    // if (!responseSchema) {
    //     return '';
    // }

    // // Extract fields from the schema
    // let fields = [];
    // if (responseSchema.items && responseSchema.items.$ref) {
    //     // Handle array of references
    //     // In a real implementation, we'd resolve the reference, but for now we'll skip
    //     return '';
    // } else if (responseSchema.$ref) {
    //     // Handle direct reference
    //     // In a real implementation, we'd resolve the reference, but for now we'll skip
    //     return '';
    // } else if (responseSchema.properties) {
    //     // Direct properties
    //     fields = extractFieldsFromProperties(responseSchema.properties);
    // }

    // if (fields.length === 0) {
    //     return '';
    // }

    // // Generate the fields section
    // let content = `\n## Fields\n| Name | Datatype | Description |\n|:-----|:---------|:------------|\n`;
    
    // for (const field of fields) {
    //     content += `| <CopyableCode code="${field.name}" /> | \`${field.type}\` | ${field.description} |\n`;
    // }

    // return content;
    return "";
}

// function extractFieldsFromProperties(properties) {
//     const fields = [];
    
//     for (const [name, prop] of Object.entries(properties)) {
//         let type = prop.type || 'object';
        
//         // Handle arrays
//         if (type === 'array' && prop.items) {
//             type = `array[${prop.items.type || 'object'}]`;
//         }
        
//         // Handle enums
//         if (prop.enum) {
//             type = `enum[${type}]`;
//         }
        
//         const description = cleanDescription(prop.description || '');
        
//         fields.push({
//             name,
//             type,
//             description
//         });
//     }
    
//     return fields;
// }
// src/docgen/resource/fields.js
import { 
    getSqlMethodsWithOrderedFields, 
    sanitizeHtml,
} from '../helpers.js';

const mdCodeAnchor = "`";

export function createFieldsSection(resourceData, dereferencedAPI) {
    let content = '## Fields\n\n';

    content += 'The following fields are returned by `SELECT` queries:\n\n';

    // Use the reusable function to get methods with ordered fields
    const methods = getSqlMethodsWithOrderedFields(resourceData, dereferencedAPI, 'select');
    
    if (Object.keys(methods).length > 0) {
        // Create the tabs and markdown content
        const methodNames = Object.keys(methods);
        
        // Create the tab values array for the Tabs component
        const tabValues = methodNames.map(methodName => {
            return `{ label: '${methodName}', value: '${methodName}' }`;
        }).join(',\n        ');
        
        // Start building the Tabs component
        content += `<Tabs
    defaultValue="${methodNames[0]}"
    values={[
        ${tabValues}
    ]}
>\n`;
        
        // Create the TabItems with table content
        for (const methodName of methodNames) {
            const methodData = methods[methodName];
            
            // Start the TabItem
            content += `<TabItem value="${methodName}">\n\n`;
            
            // Add the method description if available
            if (methodData.respDescription && methodData.respDescription.trim().toUpperCase() !== 'OK') {
                content += `${sanitizeHtml(methodData.respDescription)}\n\n`;
            }
            
            // Add the table header
            content += `<table>
<thead>
    <tr>
    <th>Name</th>
    <th>Datatype</th>
    <th>Description</th>
    </tr>
</thead>
<tbody>`;            

            // Add each property as a row in the table
            for (const [propName, propData] of Object.entries(methodData.properties)) {
                content += `\n<tr>
    <td><CopyableCode code="${propName}" /></td>
    <td><code>${propData.type}</code></td>
    <td>${sanitizeHtml(propData.description)}</td>
</tr>`;
            }
            
            content += `\n</tbody>
</table>
`;

            // Close the TabItem
            content += `</TabItem>\n`;
        }
        
        // Close the Tabs component
        content += `</Tabs>\n`;
    } else {
        // no fields
        content += `${mdCodeAnchor}SELECT${mdCodeAnchor} not supported for this resource, use ${mdCodeAnchor}SHOW METHODS${mdCodeAnchor} to view available operations for the resource.\n\n`;
    }

    return content;
}


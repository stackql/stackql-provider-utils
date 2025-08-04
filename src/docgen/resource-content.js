// src/docgen/resource-content.js

import { createOverviewSection } from './resource/overview.js';
import { createFieldsSection } from './resource/fields.js';
import { createMethodsSection } from './resource/methods.js';
import { createExamplesSection } from './resource/examples.js';
 
export async function createResourceIndexContent(
    providerName, 
    serviceName, 
    resourceName, 
    resourceData, 
    dereferencedAPI,
) {
    // Generate each section of the documentation
    const overviewContent = createOverviewSection(resourceName, providerName, serviceName);
    const fieldsContent = createFieldsSection(resourceData, dereferencedAPI);
    // const methodsContent = createMethodsSection(providerName, serviceName, resourceName, vwResourceName, dereferencedAPI);
    // const examplesContent = createExamplesSection(providerName, serviceName, resourceName, resourceData, dereferencedAPI);

    // Combine all sections into the final content
    // return `${overviewContent}${fieldsContent}${methodsContent}${examplesContent}`;
    return `${overviewContent}${fieldsContent}`;
}

// overview
// fields
// methods
// optional param details
// select examples
// insert examples (field manifest)
// update example
// replace examples
// delete examples

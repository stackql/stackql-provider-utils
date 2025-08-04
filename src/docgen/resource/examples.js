// src/docgen/resource/examples.js

import { createSelectExamples } from './examples/select-example.js';
import { createInsertExample } from './examples/insert-example.js';
import { createUpdateExample } from './examples/update-example.js';
import { createDeleteExample } from './examples/delete-example.js';

export function createExamplesSection(providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    let content = '';
    
    // Add SELECT examples
    content += createSelectExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    
    // Add INSERT example
    content += createInsertExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    
    // Add UPDATE/REPLACE example
    content += createUpdateExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    
    // Add DELETE example
    content += createDeleteExample(providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    
    return content;
}
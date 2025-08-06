// src/docgen/resource/examples.js

import { createSelectExamples } from './examples/select-example.js';
import { createInsertExamples } from './examples/insert-example.js';
import { createUpdateExamples } from './examples/update-example.js';
import { createDeleteExamples } from './examples/delete-example.js';
import { createExecExamples } from './examples/exec-example.js';

export function createExamplesSection(providerName, serviceName, resourceName, resourceData, dereferencedAPI) {
    let content = '';
    
    // Add SELECT examples
    content += createSelectExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI);

    // Add INSERT examples
    content += createInsertExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI);
    
    // Add UPDATE examples
    content += createUpdateExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI, false);
    
    // Add REPLACE examples
    content += createUpdateExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI, true);

    // Add DELETE examples
    content += createDeleteExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI);

    // Add EXEC examples
    content += createExecExamples(providerName, serviceName, resourceName, resourceData, dereferencedAPI);    

    return content;
}
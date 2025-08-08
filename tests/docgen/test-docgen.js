import { docgen } from '../../src/index.js';

// Test the documentation generator
async function testDocGen() {
    try {
        const result = await docgen.generateDocs({
            providerName: 'snowflake',
            providerDir: 'tests/docgen/src/snowflake/v00.00.00000',
            outputDir: 'tests/docgen/test-output',
            providerDataDir: 'tests/docgen/provider-data/snowflake',
        });
        
        console.log('Documentation generated successfully:', result);
    } catch (error) {
        console.error('Error generating documentation:', error);
    }
}

testDocGen();
import { docgen } from '../../src/index.js';

// Test the documentation generator
async function testDocGen() {
    try {
        const result = await docgen.generateDocs({
            providerName: 'snowflake',
            providerDir: './src/snowflake/v00.00.00000',
            outputDir: './test-output',
            providerDataDir: './provider-data/snowflake',
            stackqlConfig: {
                host: 'localhost',
                port: 5444,
                user: 'stackql',
                database: 'stackql'
            }
        });
        
        console.log('Documentation generated successfully:', result);
    } catch (error) {
        console.error('Error generating documentation:', error);
    }
}

testDocGen();
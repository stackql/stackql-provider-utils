import { docgen } from '../../src/index.js';

// Get the provider name from command line arguments
async function testDocGen() {
    try {
        // Get provider from command line argument, default to 'snowflake' if not provided
        const args = process.argv.slice(2);
        const providerName = args[0] || 'snowflake';
        
        console.log(`Generating documentation for provider: ${providerName}`);
        
        const result = await docgen.generateDocs({
            providerName: providerName,
            providerDir: providerName === 'google' ? `tests/docgen/src/googleapis.com/v00.00.00000` : `tests/docgen/src/${providerName}/v00.00.00000`,
            outputDir: 'tests/docgen/test-output',
            providerDataDir: `tests/docgen/provider-data/${providerName}`,
        });
        
        console.log('Documentation generated successfully:', result);
    } catch (error) {
        console.error('Error generating documentation:', error);
    }
}

testDocGen();
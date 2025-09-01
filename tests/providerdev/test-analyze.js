import { providerdev } from '../../src/index.js';

// Test the analyze function
async function testAnalyze() {
    try {
        // Get provider from command line argument, default to 'okta' if not provided
        const args = process.argv.slice(2);
        const providerName = args[0] || 'okta';
        
        console.log(`Analyzing OpenAPI specs for provider: ${providerName}`);
        
        const result = await providerdev.analyze({
            inputDir: `tests/providerdev/split-output/${providerName}`,
            outputDir: `tests/providerdev/analyze-output/${providerName}`
        });
        
        console.log('Analysis completed successfully:', result);
    } catch (error) {
        console.error('Error analyzing OpenAPI specs:', error);
    }
}

testAnalyze();
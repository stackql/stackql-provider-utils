import { providerdev } from '../../src/index.js';

// Test the generate function
async function testGenerate() {
    try {
        // Get provider from command line argument, default to 'okta' if not provided
        const args = process.argv.slice(2);
        const providerName = args[0] || 'okta';
        
        console.log(`Generating StackQL provider extensions for: ${providerName}`);
        
        const result = await providerdev.generate({
            inputDir: `tests/providerdev/split-output/${providerName}`,
            outputDir: `tests/providerdev/generate-output/${providerName}`,
            configPath: `tests/providerdev/mapping/${providerName}/all_services.csv`,
            providerId: providerName,
            overwrite: true,
            verbose: true
        });
        
        console.log('Generation completed successfully:', result);
    } catch (error) {
        console.error('Error generating provider extensions:', error);
    }
}

testGenerate();
import { providerdev } from '../../src/index.js';

// Test the split function
async function testSplit() {
    try {
        // Get provider from command line argument, default to 'github' if not provided
        const args = process.argv.slice(2);
        const providerName = args[0] || 'okta';
        const apiDoc = args[1] || 'tests/providerdev/split-source/okta/management-minimal.yaml';
        const svcDiscriminator = args[2] || 'tag';

        console.log(`Splitting OpenAPI doc for provider: ${providerName}`);
        console.log(`API Doc: ${apiDoc}`);
        console.log(`Service Discriminator: ${svcDiscriminator}`);

        const result = await providerdev.split({
            apiDoc: apiDoc,
            providerName: providerName,
            outputDir: `tests/providerdev/split-output/${providerName}`,
            svcDiscriminator: svcDiscriminator,
            overwrite: true,
            verbose: true
        });
        
        console.log('Split operation completed successfully:', result);
    } catch (error) {
        console.error('Error splitting OpenAPI doc:', error);
    }
}

testSplit();
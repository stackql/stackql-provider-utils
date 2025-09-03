# Split Operation

The `split` operation divides a large OpenAPI specification into smaller, service-specific files that are easier to manage and process.

## Overview

Processing large monolithic OpenAPI specifications can be challenging. The `split` operation breaks down these large files into smaller, more manageable pieces based on logical service boundaries. This makes subsequent analysis and generation steps more efficient and helps organize the provider structure.

## Function Signature

```javascript
async function split(options) {
  // Implementation details
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `apiDoc` | string | Yes | Path to the OpenAPI specification file |
| `providerName` | string | Yes | Name of the provider (e.g., 'github', 'aws') |
| `outputDir` | string | Yes | Directory for output files |
| `svcDiscriminator` | string | Yes | Method for determining services ('tag' or 'path') |
| `overwrite` | boolean | No | Whether to overwrite existing files (default: false) |
| `verbose` | boolean | No | Whether to output detailed logs (default: false) |

## Service Discriminators

The `svcDiscriminator` parameter determines how services are identified:

- **tag**: Uses OpenAPI tags to group operations into services. This is ideal for well-organized APIs where operations are properly tagged by service or resource type.

- **path**: Uses URL path patterns to determine service boundaries. This is useful for APIs that follow a consistent URL structure but may not have proper tagging.

## Return Value

The function returns a Promise that resolves to an object containing:

```javascript
{
  serviceCount: number,      // Number of services created
  operationCount: number,    // Total number of operations processed
  outputDirectory: string,   // Path to the output directory
  services: Array<string>    // List of service names created
}
```

## Example Usage

```javascript
import { providerdev } from '@stackql/provider-utils';

async function splitExample() {
  try {
    const result = await providerdev.split({
      apiDoc: './specs/okta/management-minimal.yaml',
      providerName: 'okta',
      outputDir: './output/split/okta',
      svcDiscriminator: 'path',
      overwrite: true,
      verbose: true
    });
    
    console.log(`Split operation completed successfully!`);
    console.log(`Created ${result.serviceCount} services with a total of ${result.operationCount} operations.`);
    console.log(`Output directory: ${result.outputDirectory}`);
    console.log(`Services created: ${result.services.join(', ')}`);
  } catch (error) {
    console.error('Error splitting OpenAPI doc:', error);
  }
}

splitExample();
```

## Output Structure

The split operation creates the following directory structure:

```
outputDir/
├── {providerName}/
│   ├── service1.yaml
│   ├── service2.yaml
│   └── ...
```

Each service file contains only the paths, schemas, and operations relevant to that service.
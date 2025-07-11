# StackQL Provider Utils

A comprehensive toolkit for transforming OpenAPI specs into StackQL providers. Includes parsing, mapping, validation, testing, and documentation generation utilities. Compatible with both Node.js and Deno.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Local Development Setup](#local-development-setup)
- [Testing with Node.js](#testing-with-nodejs)
- [Testing with Deno](#testing-with-deno)
- [Using the Documentation Generator](#using-the-documentation-generator)
- [API Reference](#api-reference)
- [Contributing](#contributing)

## Prerequisites

### For Node.js
- Node.js >= 20
- npm or yarn
- StackQL server (for documentation generation)

### For Deno
- Deno >= 1.30.0
- StackQL server (for documentation generation)

### Installing StackQL

Download and install StackQL from [stackql.io/downloads](https://stackql.io/downloads)

```bash
# macOS
brew install stackql

# Linux
curl -L https://bit.ly/stackql-zip -O && unzip stackql-zip

# Windows
# Download from https://stackql.io/downloads
```

## Installation

### For Node.js Projects

```bash
npm install @stackql/provider-utils
# or
yarn add @stackql/provider-utils
```

### For Deno Projects

```typescript
import { docgen } from "https://deno.land/x/stackql_provider_utils/mod.ts";
```

## Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/stackql/stackql-provider-utils.git
cd stackql-provider-utils
```

2. Install dependencies (Node.js):
```bash
npm install
```

## Testing with Node.js

### 1. Create a Test Script

Create a file `test-docgen.js`:

```javascript
import { docgen } from './src/index.js';

// Test the documentation generator
async function testDocGen() {
    try {
        const result = await docgen.generateDocs({
            providerName: 'myservice',
            providerDir: './test-data/output/src/myservice/v00.00.00000',
            outputDir: './test-output',
            providerDataDir: './test-data/provider-data',
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
```

### 2. Set Up Test Data

Create the required directory structure:

```bash
mkdir -p test-data/output/src/myservice/v00.00.00000/services
mkdir -p test-data/provider-data
```

Add test files:

`test-data/provider-data/headerContent1.txt`:
```
---
title: myservice
hide_title: false
hide_table_of_contents: false
keywords:
  - myservice
  - stackql
  - infrastructure-as-code
  - configuration-as-data
description: Query and manage myservice resources using SQL
---

# myservice Provider

The myservice provider for StackQL allows you to query, deploy, and manage myservice resources using SQL.
```

`test-data/provider-data/headerContent2.txt`:
```
See the [myservice provider documentation](https://myservice.com/docs) for more information.
```

`test-data/output/src/myservice/v00.00.00000/services/example.yaml`:
```yaml
openapi: 3.0.0
info:
  title: Example Service
  version: 1.0.0
paths:
  /examples:
    get:
      operationId: listExamples
      responses:
        '200':
          description: Success
components:
  x-stackQL-resources:
    examples:
      id: myservice.example.examples
      name: examples
      title: Examples
      methods:
        list:
          operation:
            $ref: '#/paths/~1examples/get'
          response:
            mediaType: application/json
            openAPIDocKey: '200'
      sqlVerbs:
        select:
          - $ref: '#/components/x-stackQL-resources/examples/methods/list'
```

### 3. Start StackQL Server

```bash
# In a separate terminal
stackql srv \
  --pgsrv.port=5444 \
  --pgsrv.tls=false \
  --loglevel=INFO
```

### 4. Run the Test

```bash
node test-docgen.js
```

## Testing with Deno

### 1. Create a Test Script

Create a file `test-docgen.ts`:

```typescript
import { docgen } from './src/mod.ts';

// Test the documentation generator
async function testDocGen() {
    try {
        const result = await docgen.generateDocs({
            providerName: 'myservice',
            providerDir: './test-data/output/src/myservice/v00.00.00000',
            outputDir: './test-output',
            providerDataDir: './test-data/provider-data',
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
```

### 2. Run the Test

```bash
# With permissions
deno run --allow-read --allow-write --allow-net test-docgen.ts
```

## Using the Documentation Generator

### Basic Example

```javascript
import { docgen } from '@stackql/provider-utils';

const options = {
    providerName: 'github',
    providerDir: './output/src/github/v00.00.00000',
    outputDir: './docs',
    providerDataDir: './config/provider-data',
    stackqlConfig: {
        host: 'localhost',
        port: 5444,
        user: 'stackql',
        database: 'stackql'
    }
};

const result = await docgen.generateDocs(options);
console.log(`Generated docs for ${result.totalServices} services and ${result.totalResources} resources`);
console.log(`Output location: ${result.outputPath}`);
```

### Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `providerName` | string | Name of the provider (e.g., 'github', 'aws') | Required |
| `providerDir` | string | Path to provider spec directory | Required |
| `outputDir` | string | Directory for generated documentation | Required |
| `providerDataDir` | string | Directory containing provider header files | Required |
| `stackqlConfig` | object | StackQL server connection configuration | See below |

#### StackQL Config Options

```javascript
{
    host: 'localhost',  // StackQL server host
    port: 5444,         // StackQL server port
    user: 'stackql',    // Database user
    database: 'stackql' // Database name
}
```

## Directory Structure Requirements

### Provider Data Directory
```
provider-data/
├── headerContent1.txt    # Provider introduction
├── headerContent2.txt    # Additional provider info
└── stackql-provider-registry.mdx (optional)
```

### Provider Spec Directory
```
output/src/{provider}/v00.00.00000/
├── provider.yaml
└── services/
    ├── service1.yaml
    ├── service2.yaml
    └── ...
```

### Generated Output
```
docs/{provider}-docs/
├── index.md
├── stackql-provider-registry.mdx
└── providers/
    └── {provider}/
        └── {service}/
            ├── index.md
            └── {resource}/
                └── index.md
```

## Running Tests

### Node.js
```bash
npm test
```

### Deno
```bash
deno task test
```

## Troubleshooting

### StackQL Server Connection Issues
- Ensure StackQL server is running: `stackql srv --pgsrv.port=5444`
- Check if port 5444 is available
- Verify connection settings in `stackqlConfig`

### Missing Provider Data
- Ensure `headerContent1.txt` and `headerContent2.txt` exist in provider data directory
- Check file permissions

### Empty Documentation
- Verify provider specs have `x-stackQL-resources` components
- Check that resources have proper method definitions

## API Reference

### `docgen.generateDocs(options)`

Generates documentation for a StackQL provider.

**Parameters:**
- `options` (Object): Configuration options

**Returns:**
- Promise<Object>: Result object containing:
  - `totalServices`: Number of services processed
  - `totalResources`: Number of resources documented
  - `outputPath`: Path to generated documentation

**Example:**
```javascript
const result = await docgen.generateDocs({
    providerName: 'aws',
    providerDir: './providers/src/aws/v00.00.00000',
    outputDir: './documentation',
    providerDataDir: './config/aws',
    stackqlConfig: {
        host: 'localhost',
        port: 5444
    }
});
```

### `docgen.createResourceIndexContent(...)`

Creates markdown content for a single resource. This is a lower-level function used internally by `generateDocs`.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT

## Support

- [StackQL Documentation](https://stackql.io/docs)
- [GitHub Issues](https://github.com/stackql/stackql-provider-utils/issues)
- [StackQL Discord](https://discord.gg/stackql)
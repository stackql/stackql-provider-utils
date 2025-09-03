# Documentation Generation

The `docgen` module provides utilities for generating comprehensive documentation for StackQL providers.

## Overview

After creating a StackQL provider, the next step is to generate documentation that helps users understand the available services, resources, and methods. The `docgen` module automates this process, creating well-structured markdown files that can be used with static site generators like Docusaurus.

## Function Signature

```javascript
async function generateDocs(options) {
  // Implementation details
}
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `providerName` | string | Yes | Name of the provider (e.g., 'github', 'aws') |
| `providerDir` | string | Yes | Path to provider specification directory |
| `outputDir` | string | Yes | Directory for generated documentation |
| `providerDataDir` | string | Yes | Directory containing provider header files |
| `verbose` | boolean | No | Whether to output detailed logs (default: false) |

## Return Value

The function returns a Promise that resolves to an object containing:

```javascript
{
  totalServices: number,     // Number of services documented
  totalResources: number,    // Total number of resources documented
  outputPath: string         // Path to the generated documentation
}
```

## Provider Data Files

The documentation generator requires specific header files in the `providerDataDir`:

- **headerContent1.txt**: Provider introduction and overview content
- **headerContent2.txt**: Additional provider information (e.g., authentication details)

These files should contain markdown content that will be included in the provider's main documentation page.

## Example Usage

```javascript
import { docgen } from '@stackql/provider-utils';

async function generateDocsExample() {
  try {
    const result = await docgen.generateDocs({
      providerName: 'github',
      providerDir: './output/generate/github/v00.00.00000',
      outputDir: './docs/github-docs',
      providerDataDir: './config/provider-data/github',
      verbose: true
    });
    
    console.log(`Documentation generation completed successfully!`);
    console.log(`Documented ${result.totalServices} services with ${result.totalResources} resources.`);
    console.log(`Output directory: ${result.outputPath}`);
  } catch (error) {
    console.error('Error generating documentation:', error);
  }
}

generateDocsExample();
```

## Output Structure

The documentation generator creates a structured set of markdown files:

```
outputDir/
├── {providerName}-docs/
│   ├── index.md                      # Main provider documentation
│   ├── {service1}/
│   │   ├── index.md                  # Service documentation
│   │   ├── {resource1}/
│   │   │   └── index.md              # Resource documentation
│   │   ├── {resource2}/
│   │   │   └── index.md
│   │   └── ...
│   ├── {service2}/
│   │   └── ...
│   └── ...
```

## Documentation Content

### Provider Documentation (index.md)

The main provider documentation includes:
- Provider overview (from headerContent1.txt)
- Authentication instructions
- Available services list
- Additional information (from headerContent2.txt)

### Service Documentation

Service documentation includes:
- Service description
- Available resources list
- Service-specific configuration (if any)

### Resource Documentation

Resource documentation includes:
- Resource description
- Available methods with parameters
- SQL verb mappings
- Example queries
- Request and response details

## Example Header Content Files

### headerContent1.txt

```markdown
---
title: GitHub
hide_title: false
hide_table_of_contents: false
keywords:
  - github
  - stackql
  - infrastructure-as-code
  - configuration-as-data
description: Query and manage GitHub resources using SQL
---

# GitHub Provider

The GitHub provider for StackQL allows you to query and manage GitHub resources using SQL. This provider supports repositories, issues, pull requests, users, and more.
```

### headerContent2.txt

```markdown
## Authentication

GitHub requires a Personal Access Token (PAT) for authentication. You can create one in your GitHub account settings under Developer Settings > Personal Access Tokens.

Set your token as an environment variable:

```bash
export GITHUB_TOKEN="your_token_here"
```

For more information, see the [GitHub API documentation](https://docs.github.com/en/rest).
```

## Integrating with Docusaurus

The generated documentation is designed to work with [Docusaurus](https://docusaurus.io/), a popular static site generator.

1. Create a Docusaurus site:
```bash
npx create-docusaurus@latest website classic
```

2. Copy the generated documentation to the docs folder:
```bash
cp -r ./docs/{providerName}-docs/* ./website/docs/
```

3. Update the Docusaurus configuration to include the provider documentation:
```javascript
// docusaurus.config.js
module.exports = {
  // ...other config
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          path: 'docs',
          routeBasePath: 'docs',
        },
        // ...
      },
    ],
  ],
};
```

4. Build and serve the documentation site:
```bash
cd website
yarn start # or npm start
```

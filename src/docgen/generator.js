// src/docgen/generator.js

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { createResourceIndexContent } from './resource-content.js';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as deno_openapi_dereferencer from "@stackql/deno-openapi-dereferencer";

export async function generateDocs(options) {
    const {
        providerName,
        providerDir,        // e.g., 'output/src/heroku/v00.00.00000'
        outputDir,          // e.g., 'docs'
        providerDataDir,    // e.g., 'config/provider-data'
    } = options;

    console.log(`documenting ${providerName}...`);

    const docsDir = path.join(outputDir, `${providerName}-docs`);
   
    // Clean existing docs
    fs.existsSync(`${docsDir}/index.md`) && fs.unlinkSync(`${docsDir}/index.md`);
    fs.existsSync(`${docsDir}/providers`) && fs.rmSync(`${docsDir}/providers`, { recursive: true, force: true });

    // Check for provider data files
console.log(providerDataDir);
try {
    const files = fs.readdirSync(providerDataDir);
    console.log('Files in providerDataDir:', files);
} catch (err) {
    console.error('Error reading providerDataDir:', err.message);
}




    const headerContent1Path = path.join(providerDataDir, 'headerContent1.txt');
    const headerContent2Path = path.join(providerDataDir, 'headerContent2.txt');
    const mdxPath = path.join(providerDataDir, 'stackql-provider-registry.mdx');

    if (!fs.existsSync(headerContent1Path) || !fs.existsSync(headerContent2Path)) {
        throw new Error(`Missing headerContent1.txt or headerContent2.txt in ${providerDataDir}`);
    }

    const headerContent1 = fs.readFileSync(headerContent1Path, 'utf8');
    const headerContent2 = fs.readFileSync(headerContent2Path, 'utf8');

    // Initialize counters
    let servicesForIndex = [];
    let totalServicesCount = 0;
    let totalResourcesCount = 0;

    // Process services
    const serviceDir = path.join(providerDir, 'services');
    console.log(`Processing services in ${serviceDir}...`);
    const serviceFiles = fs.readdirSync(serviceDir).filter(file => path.extname(file) === '.yaml');

    for (const file of serviceFiles) {
        const serviceName = path.basename(file, '.yaml').replace(/-/g, '_');
        console.log(`Processing service: ${serviceName}`);
        servicesForIndex.push(serviceName);
        const filePath = path.join(serviceDir, file);
        totalServicesCount++;
        const serviceFolder = `${docsDir}/providers/${providerName}/${serviceName}`;
        await createDocsForService(filePath, providerName, serviceName, serviceFolder);
    }

    console.log(`Processed ${totalServicesCount} services`);

    // Count total resources
    totalResourcesCount = fs.readdirSync(`${docsDir}/providers/${providerName}`, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => fs.readdirSync(`${docsDir}/providers/${providerName}/${dirent.name}`).length)
        .reduce((a, b) => a + b, 0);

    console.log(`Processed ${totalResourcesCount} resources`);

    // Create provider index
    servicesForIndex = [...new Set(servicesForIndex)];
    servicesForIndex.sort();

    const half = Math.ceil(servicesForIndex.length / 2);
    const firstColumnServices = servicesForIndex.slice(0, half);
    const secondColumnServices = servicesForIndex.slice(half);

    const indexContent = `${headerContent1}

:::info Provider Summary

<div class="row">
<div class="providerDocColumn">
<span>total services:&nbsp;<b>${totalServicesCount}</b></span><br />
<span>total resources:&nbsp;<b>${totalResourcesCount}</b></span><br />
</div>
</div>

:::

${headerContent2}

## Services
<div class="row">
<div class="providerDocColumn">
${servicesToMarkdown(providerName, firstColumnServices)}
</div>
<div class="providerDocColumn">
${servicesToMarkdown(providerName, secondColumnServices)}
</div>
</div>
`;

    // Write index
    const indexPath = path.join(docsDir, 'index.md');
    fs.writeFileSync(indexPath, indexContent);
    console.log(`Index file created at ${indexPath}`);

    // Copy MDX file if exists
    if (fs.existsSync(mdxPath)) {
        fs.copyFileSync(mdxPath, path.join(docsDir, 'stackql-provider-registry.mdx'));
        console.log(`MDX file copied`);
    }

    return {
        totalServices: totalServicesCount,
        totalResources: totalResourcesCount,
        outputPath: docsDir
    };
}

// Process each service sequentially
async function createDocsForService(yamlFilePath, providerName, serviceName, serviceFolder) {

    const data = yaml.load(fs.readFileSync(yamlFilePath, 'utf8'));

    // Create a new SwaggerParser instance
    let parser = new SwaggerParser();
    const api = await parser.parse(yamlFilePath); 
    const ignorePaths = ["$.components.x-stackQL-resources"];
    let dereferencedAPI;

    try {
        dereferencedAPI = await deno_openapi_dereferencer.dereferenceApi(api, "$", ignorePaths);
        dereferencedAPI = await deno_openapi_dereferencer.flattenAllOf(dereferencedAPI);
    } catch (error) {
        console.error("error in dereferencing or flattening:", error);
    }

    // Create service directory
    if (!fs.existsSync(serviceFolder)) {
        fs.mkdirSync(serviceFolder, { recursive: true });
    }

    const resourcesObj = data.components['x-stackQL-resources'];

    if (!resourcesObj) {
        console.warn(`No resources found in ${yamlFilePath}`);
        return;
    }

    const resources = [];
    for (let resourceName in resourcesObj) {
    
        let resourceData = resourcesObj[resourceName];
        if (!resourceData.id) {
            console.warn(`No 'id' defined for resource: ${resourceName} in service: ${serviceName}`);
            continue;
        }
    
        resources.push({
            name: resourceName,
            resourceData,
            dereferencedAPI
        });
    }    

    // Process service index
    const serviceIndexPath = path.join(serviceFolder, 'index.md');
    const serviceIndexContent = await createServiceIndexContent(providerName, serviceName, resources);
    fs.writeFileSync(serviceIndexPath, serviceIndexContent);

    // Split into columns and process resources one by one
    const halfLength = Math.ceil(resources.length / 2);
    const firstColumn = resources.slice(0, halfLength);
    const secondColumn = resources.slice(halfLength);

    // Process each resource in first column
    for (const resource of firstColumn) {
        await processResource(providerName, serviceFolder, serviceName, resource);
    }

    // Process each resource in second column
    for (const resource of secondColumn) {
        await processResource(providerName, serviceFolder, serviceName, resource);
    }

    console.log(`Generated documentation for ${serviceName}`);
}

async function processResource(providerName, serviceFolder, serviceName, resource) {
    console.log(`Processing resource: ${resource.name}`);
    
    const resourceFolder = path.join(serviceFolder, resource.name);
    if (!fs.existsSync(resourceFolder)) {
        fs.mkdirSync(resourceFolder, { recursive: true });
    }

    const resourceIndexPath = path.join(resourceFolder, 'index.md');
    const resourceIndexContent = await createResourceIndexContent(
        providerName, 
        serviceName, 
        resource.name, 
        resource.resourceData, 
        resource.dereferencedAPI,
    );
    fs.writeFileSync(resourceIndexPath, resourceIndexContent);

    // After writing the file, force garbage collection if available (optional)
    if (global.gc) {
        global.gc();
    }
}

async function createServiceIndexContent(providerName, serviceName, resources) {
    const totalResources = resources.length; // Calculate the total resources

    // Sort resources alphabetically by name
    resources.sort((a, b) => a.name.localeCompare(b.name));

    const halfLength = Math.ceil(totalResources / 2);
    const firstColumnResources = resources.slice(0, halfLength);
    const secondColumnResources = resources.slice(halfLength);

    // Generate the HTML for resource links in the first column
    const firstColumnLinks = generateResourceLinks(providerName, serviceName, firstColumnResources);

    // Generate the HTML for resource links in the second column
    const secondColumnLinks = generateResourceLinks(providerName, serviceName, secondColumnResources);

    // Create the markdown content for the service index
    // You can customize this content as needed
    return `---
title: ${serviceName}
hide_title: false
hide_table_of_contents: false
keywords:
  - ${serviceName}
  - ${providerName}
  - stackql
  - infrastructure-as-code
  - configuration-as-data
  - cloud inventory
description: Query, deploy and manage ${providerName} resources using SQL
custom_edit_url: null
image: /img/providers/${providerName}/stackql-${providerName}-provider-featured-image.png
---

${serviceName} service documentation.

:::info Service Summary

<div class="row">
<div class="providerDocColumn">
<span>total resources:&nbsp;<b>${totalResources}</b></span><br />
</div>
</div>

:::

## Resources
<div class="row">
<div class="providerDocColumn">
${firstColumnLinks}
</div>
<div class="providerDocColumn">
${secondColumnLinks}
</div>
</div>`;
}

function generateResourceLinks(providerName, serviceName, resources) {
    // Generate resource links for the service index
    const resourceLinks = resources.map((resource) => {
        return `<a href="/providers/${providerName}/${serviceName}/${resource.name}/">${resource.name}</a>`;
    });
    return resourceLinks.join('<br />\n');
}

// Function to convert services to markdown links
function servicesToMarkdown(providerName, servicesList) {
    return servicesList.map(service => `<a href="/providers/${providerName}/${service}/">${service}</a><br />`).join('\n');
}
// src/docgen/resource/overview.js
import { 
    getIndefiniteArticle, 
} from '../helpers.js';

export function createOverviewSection(resourceName, providerName, serviceName) {

  let content = `--- 
title: ${resourceName}
hide_title: false
hide_table_of_contents: false
keywords:
  - ${resourceName}
  - ${serviceName}
  - ${providerName}
  - infrastructure-as-code
  - configuration-as-data
  - cloud inventory
description: Query, deploy and manage ${providerName} resources using SQL
custom_edit_url: null
image: /img/providers/${providerName}/stackql-${providerName}-provider-featured-image.png
---

import CopyableCode from '@site/src/components/CopyableCode/CopyableCode';
import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Creates, updates, deletes, gets or lists ${getIndefiniteArticle(resourceName)} <code>${resourceName}</code> resource.

## Overview
<table><tbody>
<tr><td><b>Name</b></td><td><code>${resourceName}</code></td></tr>
<tr><td><b>Type</b></td><td>Resource</td></tr>
<tr><td><b>Id</b></td><td><CopyableCode code="${providerName}.${serviceName}.${resourceName}" /></td></tr>
</tbody></table>

`;
    return content;
}

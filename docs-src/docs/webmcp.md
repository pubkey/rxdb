---
title: Local-First with WebMCP
slug: webmcp.html
description: Connect your RxDB databases directly to AI Agents via Chrome's Model Context Protocol (WebMCP).
image: /headers/webmcp.jpg
---

import {Steps} from '@site/src/components/steps';
import {VideoBox} from '@site/src/components/video-box';
import {Tabs} from '@site/src/components/tabs';
import {QuoteBlock} from '@site/src/components/quoteblock';

# Local-First with WebMCP

:::note Beta Status

The WebMCP plugin is currently in **Beta**. APIs and behaviors are subject to change as the official [W3C WebMCP specification](https://webmachinelearning.github.io/webmcp/) and browser implementations evolve.
:::


## What is WebMCP?

[WebMCP](https://developer.chrome.com/blog/webmcp-epp) (Web Model Context Protocol) is an experimental browser API that allows your web application to seamlessly expose "tools" for AI Agents. WebMCP is an adaptation of the Model Context Protocol (MCP) standardized for use within web browsers, currently incubated through the W3C Web Machine Learning community group.

When an AI Agent is active, it can discover these tools and call them programmatically with arguments as defined by a strict JSON Schema, via the `navigator.modelContext` API.


<center>
<br />
<VideoBox videoId="d2B009ZTDxY" title="Expose your apps to AI: WebMCP" duration="1:46" />
<br />
<br />
</center>

**Browser Support**: [WebMCP](https://github.com/webmachinelearning/webmcp) is currently in an early preview phase. As of early 2025, it can be tested in Chrome Canary (version 145/146+) by enabling the "WebMCP for testing" flag at `chrome://flags`. Industry observers anticipate formal browser announcements for broader rollout towards 2026.

## Why Local-First Database Tools work great with WebMCP

WebMCP is uniquely powerful when paired with local-first databases like RxDB:
- **Zero Latency**: Agents query data instantly from the local database on the user's device.
- **Offline Capable**: Because the data and the API are local, AI Agents can assist users completely offline.
- **Privacy First**: Sensitive user data can stay on the device while still being queryable by the on-device AI model.
- **Direct Access**: Agents can bypass the UI entirely and find exactly what they need with complex Mango queries.

### Example Use Cases

Exposing your local database to AI agents unlocks new user experiences:
- **Grocery Shopping List**: An agent can move items between lists (e.g., "Move all drinks from Shop A to Shop B") or add ingredients based on recipes ("Add everything I need to bake a cheesecake to the list").
- **Online Shop**: An agent searches your local catalog for items based on complex criteria, such as "Find all in-stock items cheaper than $50".
- **Geotracking App**: Using the RxDB continuous queries and observables (`rxdb_wait_changes`), an agent monitors live tracking data to notify the user when a specific object starts moving.

<QuoteBlock
  author="Vijay Kumar"
  year="2026"
  sourceLink="https://abvijaykumar.medium.com/webmcp-web-model-context-protocol-agents-are-learning-to-browse-better-22fcefc981d7"
>WebMCP essentially adds a second layer to the web, one that’s designed for machines to use programmatically, not just for humans to see.</QuoteBlock>

## The RxDB WebMCP Plugin

RxDB provides a plugin `rxdb/plugins/webmcp` that lets you expose your collections to WebMCP with just a single function call.

The plugin dynamically reads your RxDB schema to assemble a prompt description and the tool's `inputSchema` so the AI knows exactly what data shapes are available and how to query them. It automatically registers the following WebMCP tools for each tracked collection:

**Read Operations**:
- `rxdb_query`: Run complex Mango NoSQL queries against the local database (`find().exec()`).
- `rxdb_count`: Count the number of documents matching a specific query (`count().exec()`).
- `rxdb_changes`: Fetch the replication changestream since a given checkpoint.
- `rxdb_wait_changes`: Listen to live UI updates by pausing until a matching document changes occurs.

**Write Operations**:
- `rxdb_insert`: Insert new documents into the local collection.
- `rxdb_upsert`: Overwrite existing documents or insert them if they don't exist.
- `rxdb_delete`: Remove items from the local database by ID.

*(Note: State-modifying tools like insert/upsert/delete can be disabled via the [`readOnly`](#readonly-default-false) option).*

### Quick Start

<Steps>

#### Add the plugin

First, ensure the plugin is added to your RxDB configuration:

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBWebMCPPlugin } from 'rxdb/plugins/webmcp';

addRxPlugin(RxDBWebMCPPlugin);
```

#### Register Collections

Then, whenever your database is initialized, activate WebMCP on the whole database or specific collections:

```ts
// Expose all collections in the DB to WebMCP (Read-only by default)
db.registerWebMCP();

// Or expose only a specific collection:
db.collections.humans.registerWebMCP();
```

</Steps>

### Logs and Errors

Both `registerWebMCP` methods (`db.registerWebMCP()` and `db.collections.humans.registerWebMCP()`) return an object containing two RxJS Subjects: `log$` and `error$`.

You can subscribe to these to monitor the AI agent's actions:

```ts
const { log$, error$ } = db.registerWebMCP();

log$.subscribe(info => {
    // Log all tool calls, arguments, and responses
    console.log('WebMCP Agent Action', info);
});

error$.subscribe(err => {
    // Audit failed tool executions
    console.error('WebMCP Agent Error', err);
});
```

### Tooling

To aid in debugging and developing WebMCP features, you can use the [Model Context Protocol (MCP) tool inspector](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd) browser extension. This extension allows you to view all registered tools, their schemas, and test invoking them manually before integrating an AI Agent.

### Options

The `registerWebMCP` method accepts an optional object:

#### `readOnly` (default: `false`)

By default, WebMCP allows modifier tools.
If you explicitly want the agent to only be able to query the database, enable `readOnly`. 

```ts
db.registerWebMCP({
    readOnly: true 
});
```

This skips registering `rxdb_insert`, `rxdb_upsert`, and `rxdb_delete` tools.

#### `awaitReplicationsInSync` (default: `true`)

Because [replications](./replication.md) pull remote data into the local RxDB asynchronously, an AI Agent's query might miss data if a replication is still catching up. By default, WebMCP query invocations await (`awaitInSync()`) all running replications for that collection before returning the query results.

Set this to `false` if you want to allow queries without waiting for replication to be in sync.

```ts
db.registerWebMCP({
    awaitReplicationsInSync: false
});
```

> [!WARNING]
> If the application is offline and the replication is configured to retry infinitely, querying WebMCP with this option enabled may hang indefinitely while awaiting replication sync. Use wisely.

### Pro Tip: Schema Descriptions for Better LLM Results

Because WebMCP sends your collection's JSON schema directly to the AI Agent, the LLM uses the schema to understand the data model. Providing detailed descriptions for your properties significantly improves the LLM's ability to construct valid and accurate queries.

<Tabs>

#### Good Example

```ts
const productSchema = {
    version: 0,
    title: 'Product',
    primaryKey: 'sku',
    type: 'object',
    properties: {
        sku: {
            type: 'string',
            maxLength: 100,
            description: 'The Stock Keeping Unit identifier. Consists of a category prefix and a 6-digit number.'
        },
        price: {
            type: 'number',
            description: 'The price of the product in Euro (€). Must be a positive value.'
        }
    },
    required: ['sku', 'price']
};
```

#### Bad Example

```ts
const productSchema = {
    version: 0,
    title: 'Product',
    primaryKey: 'sku',
    type: 'object',
    properties: {
        sku: {
            type: 'string',
            maxLength: 100
        },
        price: {
            type: 'number'
        }
    },
    required: ['sku', 'price']
};
```

</Tabs>

## Follow up

To learn more about WebMCP and see it in action, check out these resources:
- [WebMCP Chrome Developer Blog Post](https://developer.chrome.com/blog/webmcp-epp?hl=en)
- [RxDB WebMCP Quickstart Repository](https://github.com/pubkey/rxdb-quickstart)
- [Live WebMCP RxDB Demo](https://pubkey.github.io/rxdb-quickstart/)

## FAQ

<details>
    <summary>What is WebMCP?</summary>
    <div>
        WebMCP (Web Model Context Protocol) is an experimental browser API that allows your web application to seamlessly expose "tools" for AI Agents. It acts as a standardized translation layer between your application's functionality and LLMs running within the browser, enabling natural language interactions with your web application's data. Wait for formal browser support for use in production environments.
    </div>
</details>

<details>
    <summary>How to mix the RxDB WebMCP with own WebMCP tools?</summary>
    <div>
        You can easily mix the RxDB WebMCP tools with your own tools. Since <code>db.registerWebMCP()</code> internally just calls <code>navigator.modelContext.registerTool()</code>, you can simply call this native method yourself to register any additional tools that interact with your frontend logic, external APIs, or other non-database components.
    </div>
</details>

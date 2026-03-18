---
title: RxDB Viewer - Remote Database Inspection
slug: viewer.html
description: Inspect and manage your RxDB database remotely with the Viewer plugin. Browse collections, run queries, edit documents and observe live changes through a WebRTC connection.
---

import {Steps} from '@site/src/components/steps';

# RxDB Viewer

The RxDB Viewer plugin provides a browser-based UI to inspect and manage any RxDB database remotely. It connects to your running application over WebRTC, so no additional server infrastructure is required. Data flows directly between your app and the viewer in a peer-to-peer connection.

## Features

- Browse all collections with document counts
- View collection schemas
- Run Mango queries with sorting
- Observe queries for live-updating results via RxDB's reactive system
- Create, edit and delete documents
- Export collections as JSON
- Syntax-highlighted JSON document viewer

## How it Works

The viewer plugin starts a lightweight WebRTC signaling process inside your application. When you open the viewer HTML page in a browser and paste the connection parameters, a direct peer-to-peer connection is established. All database operations (queries, writes, deletes) are sent as messages over this WebRTC data channel.

Because it uses WebRTC, the viewer works across different machines on the same network, across the internet (via the signaling server), and even between different JavaScript runtimes (Node.js, browser, React Native).

## Installation

```ts
import {
    getDatabaseConnectionParams
} from 'rxdb/plugins/viewer';
```

## Usage

<Steps>

## Get connection parameters

Call `getDatabaseConnectionParams()` with your database instance. The viewer server starts lazily on the first call and is cached for subsequent calls.

```ts
import { getDatabaseConnectionParams } from 'rxdb/plugins/viewer';

const connectionParams = getDatabaseConnectionParams(myRxDatabase);
console.log(JSON.stringify(connectionParams, null, 2));
// {
//   "topic": "rxdb-viewer-abc123...",
//   "signalingServerUrl": "wss://signaling.rxdb.info/",
//   "databaseName": "mydb"
// }
```

You can pass options to customize the signaling server or topic:

```ts
const connectionParams = getDatabaseConnectionParams(myRxDatabase, {
    signalingServerUrl: 'wss://my-signaling-server.com/',
    topic: 'my-custom-topic'
});
```

## Open the viewer

The viewer is a standalone HTML page bundled with the plugin. You can serve it from your application or open it directly. It is located at `node_modules/rxdb/dist/plugins/viewer/viewer.html`.

## Connect

Paste the connection parameters JSON into the viewer's connection form and click **Connect**. The viewer establishes a WebRTC peer-to-peer connection to your application and loads the database structure.

</Steps>

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `signalingServerUrl` | `string` | `wss://signaling.rxdb.info/` | WebSocket URL of the signaling server used to establish the WebRTC connection |
| `topic` | `string` | Auto-generated | A unique room identifier. Both sides must use the same topic to connect. |
| `webSocketConstructor` | `WebSocket` constructor | Global `WebSocket` | Custom WebSocket implementation, useful in Node.js environments. |

## Automatic Lifecycle

The viewer server is managed automatically:

- **Lazy start**: The server is created on the first call to `getDatabaseConnectionParams()` and cached per database.
- **Auto-close**: When the database is closed (via `database.close()`), the viewer server shuts down automatically, closing all WebRTC connections and cleaning up subscriptions.
- **Shared instance**: Multiple calls to `getDatabaseConnectionParams()` for the same database return the same connection parameters.

## Using `startRxDBViewer()` directly

If you need access to the `ViewerState` object (for example, to manually close the viewer before the database closes), you can use `startRxDBViewer()`:

```ts
import { startRxDBViewer } from 'rxdb/plugins/viewer';

const viewerState = await startRxDBViewer(myRxDatabase, {
    signalingServerUrl: 'wss://signaling.rxdb.info/'
});

// The connection params are available on the state
console.log(viewerState.connectionParams);

// Manually close the viewer
await viewerState.close();
```

## Viewer Capabilities

Once connected, the viewer UI supports these operations:

**Browsing**: The left sidebar lists all collections with document counts. Click a collection to load its documents in a table view. Click any row to see the full document JSON in the detail panel.

**Querying**: Enter a [Mango query](./rx-query.md) in the query bar and press Run. Click column headers to sort. Example queries:

```json
{ "selector": { "age": { "$gt": 18 } } }
```

```json
{ "selector": { "name": { "$regex": "^A" } }, "limit": 10 }
```

**Observing**: Click **Observe** to start a live query subscription. The Query Observer panel at the bottom shows all active subscriptions with their result counts and last update times. Results update in real-time as documents change in the database.

**Editing**: Click **+ Add** to create a new document (pre-filled from the collection schema). Select a document and click **Edit** to modify it. Click **Delete** to remove it.

**Exporting**: Click **Export** to download all documents in the current collection as a JSON file.

## Security Considerations

The viewer grants full read and write access to the connected database. Keep the connection parameters private. Anyone with the topic and signaling server URL can connect to your database.

For production use, consider:
- Using a private signaling server instead of the default public one
- Generating unique topics per session
- Only enabling the viewer in development or debug builds

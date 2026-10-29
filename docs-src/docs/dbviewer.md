---
title: Database Viewer - Inspect and Edit RxDB Data in a Devtool
slug: dbviewer.html
description: Mount the RxDB database viewer to inspect collections, run Mango queries, edit documents and watch replication live, over a running database or a JSON dump.
image: /headers/dbviewer.jpg
---

import {Tabs} from '@site/src/components/tabs';
import {BetaBlock} from '@site/src/components/beta-block';

# Database Viewer

With the `dbviewer` plugin you can inspect and edit the data of a running [RxDB](https://rxdb.info/) database from inside your own application. The viewer mounts into any DOM element and renders a full devtool: a data grid with a Mango query bar, a JSON view, a document detail drawer, and panels for schema analysis, query analysis, [replication](./replication.md), the change stream and storage statistics. It works over a live [RxDatabase](./rx-database.md) and over a static dump created with the [json-dump plugin](./json-import-export.md).

<BetaBlock since="17.7.0" />

<p align="center">
  <img src="./files/dbviewer.png" alt="RxDB database viewer devtool" width="760" />
</p>

Key features:

- **Data grid and JSON view**: Browse documents of any [RxCollection](./rx-collection.md), paginated at 100 rows per page, with multi-select, inline editing and an Observe mode, on by default, that updates the result live as documents change.
- **Mango query bar**: Run MongoDB-style (Mango) selectors against a collection, with history and favourites. The input also accepts relaxed JavaScript object syntax like `{ name: 'foo' }`, unquoted keys and single quotes are converted to JSON. Syntax errors show the exact character position and previous results stay visible.
- **Document drawer**: Shows fields, internals (`_rev`, `_meta.lwt`), [attachments](./rx-attachment.md) with inline image previews, and a WILL RUN block that previews the exact call before you apply staged edits: `insert()` for new documents, `incrementalPatch()` with only the changed fields for edits.
- **Live activity map**: Draws the database as a map from app to collections to remote endpoints. Write, query and replication events flow as glyph particles, each collection node shows a 60 second sparkline and its cached [RxQuery](./rx-query.md) count. No document contents are drawn, only names, counts and rates, so the screen is safe to share.
- **Schema panel**: Samples documents and shows per-field type shares, presence percentages and value details, plus violations against the declared [schema](./rx-schema.md). A toggle switches to the declared JSON schema itself.
- **Explain button**: Explains the current query with the used index, an execution plan derived from the [query planner](./query-optimizer.md) and findings like missing compound indexes or `$regex` full scans.
- **Changes and replication feeds**: A network-tab style list of all writes with a unified diff per change, and per-collection pull/push states with a live feed of replicated documents.
- **Storage panel**: Engine, document counts, tombstones and attachment bytes per collection.
- **Cleanup tool**: Shows per collection how many tombstones could be purged and how much of the stored data that is, and runs a [cleanup](./cleanup.md) when the cleanup plugin is loaded.

The live activity map shows the write, query and replication flow of the database in realtime:

<p align="center">
  <img src="./files/dbviewer-live-map.png" alt="RxDB database viewer live activity map" width="760" />
</p>

The Explain button analyzes the current query with the index, the execution plan and findings:

<p align="center">
  <img src="./files/dbviewer-explain.png" alt="RxDB database viewer query explain view" width="760" />
</p>

The cleanup tool shows how many tombstones a [cleanup](./cleanup.md) could purge:

<p align="center">
  <img src="./files/dbviewer-cleanup.png" alt="RxDB database viewer cleanup tool" width="760" />
</p>

Below 640px the viewer switches to stacked touch screens with the same collections and tools:

<p align="center">
  <img src="./files/dbviewer-phone.png" alt="RxDB database viewer phone layout" width="300" />
</p>

## How it works

The plugin itself contains no UI code. `mountRxDBViewer()` creates an iframe that loads the viewer page, a single self-contained html file hosted at [rxdb.info/dbviewer/index.html](https://rxdb.info/dbviewer/index.html), and serves the database to it over `postMessage`. This keeps the whole viewer UI out of the rxdb build, so the plugin adds only the small bridge to your bundle. Data access, the [query planner](./query-optimizer.md) analysis and the event streams run in your application window, the page inside the iframe is plain UI and never gets direct access to the database object.

When your app has to work without network access, download the page once and serve it from your own origin, see [Self-Hosting the Viewer Page](#self-hosting-the-viewer-page).

## Usage

Mount the viewer into an element and remove it when you are done:

```ts
import { createRxDatabase } from 'rxdb';
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';

const db = await createRxDatabase({
    name: 'mydb',
    storage: someStorage
});

const viewer = mountRxDBViewer({
    database: db,
    parent: document.getElementById('viewer-panel')
});

// later
viewer.remove();
```

You can also register the plugin to get a `launchDbViewer()` method on the database:

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBDbViewerPlugin } from 'rxdb/plugins/dbviewer';
addRxPlugin(RxDBDbViewerPlugin);

const viewer = db.launchDbViewer({ parent: document.body });
```

### Usage with Frameworks

In a framework component, mount the viewer when the component appears and call `remove()` when it is destroyed. The `close$` observable tells the host when the close icon was clicked, the host then decides what closing means, for example hiding the panel.

<Tabs>

### Angular

```ts
import {
    AfterViewInit, Component, ElementRef,
    NgZone, OnDestroy, ViewChild, inject
} from '@angular/core';
import { mountRxDBViewer, RxDBViewerHandle } from 'rxdb/plugins/dbviewer';
import { DatabaseService } from '../services/database.service';

@Component({
    selector: 'db-viewer',
    template: '<div #viewerHost style="height: 500px"></div>'
})
export class DbViewerComponent implements AfterViewInit, OnDestroy {
    private dbService = inject(DatabaseService);
    private zone = inject(NgZone);
    private viewerHandle?: RxDBViewerHandle;
    @ViewChild('viewerHost') viewerHost!: ElementRef<HTMLElement>;

    ngAfterViewInit() {
        // mounting outside of the angular zone keeps the
        // viewer updates out of change detection
        this.zone.runOutsideAngular(() => {
            this.viewerHandle = mountRxDBViewer({
                database: this.dbService.db,
                parent: this.viewerHost.nativeElement
            });
        });
    }
    ngOnDestroy() {
        if (this.viewerHandle) {
            this.viewerHandle.remove();
        }
    }
}
```

A complete integration with an "Open DB Viewer" toggle and the `close$` wiring is in the [angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular).

### React

```tsx
import { useEffect, useRef } from 'react';
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';
import { getDatabase } from './database';

export function DbViewer() {
    const hostRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let removed = false;
        let handle: ReturnType<typeof mountRxDBViewer> | undefined;
        getDatabase().then(db => {
            if (removed || !hostRef.current) {
                return;
            }
            handle = mountRxDBViewer({
                database: db,
                parent: hostRef.current
            });
        });
        return () => {
            removed = true;
            if (handle) {
                handle.remove();
            }
        };
    }, []);
    return <div ref={hostRef} style={{ height: 500 }} />;
}
```

### Vue

```html
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';
import { getDatabase } from './database';

const viewerHost = ref(null);
let handle;

onMounted(async () => {
    const db = await getDatabase();
    handle = mountRxDBViewer({
        database: db,
        parent: viewerHost.value
    });
});
onUnmounted(() => {
    if (handle) {
        handle.remove();
    }
});
</script>

<template>
    <div ref="viewerHost" style="height: 500px"></div>
</template>
```

### Svelte

```html
<script>
import { onMount } from 'svelte';
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';
import { getDatabase } from './database';

let viewerHost;

onMount(() => {
    let handle;
    getDatabase().then(db => {
        handle = mountRxDBViewer({
            database: db,
            parent: viewerHost
        });
    });
    return () => {
        if (handle) {
            handle.remove();
        }
    };
});
</script>

<div bind:this={viewerHost} style="height: 500px"></div>
```

</Tabs>


## Options

```ts
const viewer = mountRxDBViewer({
    /**
     * The live database to inspect.
     * Either database or dump must be given.
     */
    database: db,
    /**
     * (optional) A static export created with db.exportJSON().
     * Opens the viewer in read-only dump mode.
     */
    dump: myDumpJson,
    /**
     * (optional) Filename shown in the dump banner.
     */
    dumpFilename: 'mydb-2026-08-05.json',
    /**
     * (optional) Element the viewer is mounted into.
     * [default=document.body]
     */
    parent: someElement,
    /**
     * (optional) Rows per page in grids and results.
     * [default=100]
     */
    pageSize: 100,
    /**
     * (optional) Renders a close icon in the top bar.
     * Clicking it emits on the close$ observable of the handle,
     * the host decides what closing means.
     * [default=false]
     */
    showCloseButton: true,
    /**
     * (optional) Url of the viewer page that is loaded
     * into the iframe. Point this to a self-hosted copy
     * when your app must work without network access.
     * [default='https://rxdb.info/dbviewer/index.html']
     */
    viewerUrl: 'https://example.com/dbviewer.html'
});

viewer.close$.subscribe(() => {
    // hide the panel that contains the viewer
});
```

## Self-Hosting the Viewer Page

By default the iframe loads the viewer page from `https://rxdb.info/dbviewer/index.html`. When your app must work offline, or your security policy forbids loading pages from other origins, serve the page from your own origin instead. The page is one self-contained html file without further assets, so self-hosting is a file copy:

1. **Get the file**. Download it once from [rxdb.info/dbviewer/index.html](https://rxdb.info/dbviewer/index.html), or build it from the rxdb repository with `npm run build:dbviewer`, which writes it to `docs-src/static/dbviewer/index.html`.
2. **Serve it as a static asset** of your app, for example as `public/dbviewer.html`. The page must be served over http(s), a `file://` url does not work because `postMessage` needs an origin.
3. **Point the plugin at it** with the `viewerUrl` option:

```ts
const viewer = mountRxDBViewer({
    database: db,
    viewerUrl: 'https://example.com/dbviewer.html'
});
```

The [angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular) does this in its `postinstall` script: it copies the built page into `src/assets/dbviewer.html` and mounts with `viewerUrl: 'assets/dbviewer.html'`.

Keep in mind that the page and the plugin talk over a versioned `postMessage` protocol. When you update rxdb, refresh your self-hosted copy so both sides match.

## Remote Pairing over WebRTC

When the database runs on a device you cannot attach a debugger to, for example a phone in field testing, pair the hosted viewer page with that device over WebRTC. In the app, connect the database and open the returned url in any browser:

```ts
import { connectRxDBViewer } from 'rxdb/plugins/dbviewer';

const viewer = await connectRxDBViewer({
    database: db,
    /**
     * (optional) The pairing room id. Everyone who knows it
     * gets FULL read and write access to the database,
     * so treat it like a password.
     * [default=a random 18 character token]
     */
    roomId: 'a-long-random-id',
    /**
     * (optional) Url of the WebRTC signaling server.
     * The default server is for tryouts only, in production
     * you run your own, see the replication-webrtc docs.
     * [default='wss://signaling.rxdb.info/']
     */
    signalingServerUrl: 'wss://example.com/signaling',
    /**
     * (optional) Url of the hosted viewer page.
     * [default='https://rxdb.info/dbviewer/index.html']
     */
    viewerUrl: 'https://example.com/dbviewer.html'
});

// the full url to open the viewer with, for example
// https://rxdb.info/dbviewer/index.html#room=abc...&signaling=...
console.log(viewer.url);

// later: stop serving the database
await viewer.close();
```

The url carries the room id and the signaling server in its hash, so the page connects on open without further input. Opening the page without a hash shows the same connect form for manual entry:

<p align="center">
  <img src="./files/dbviewer-connect.png" alt="RxDB database viewer WebRTC connect form" width="760" />
</p>

The full devtool works over the channel: grids, queries, edits, the explain view and the live feeds, because it speaks the same bridge protocol as the iframe mount.

The signaling server only brokers the connection, the data itself flows directly between the browser and the device. You can run your own signaling server with `startSignalingServerSimplePeer()`, see the [WebRTC replication docs](./replication-webrtc.md).

## Dump mode

When you cannot reach the device that runs the database, work from an export instead. On the device, run `await db.exportJSON()` with the [json-dump plugin](./json-import-export.md), save the result, and open it in the viewer:

```ts
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';

mountRxDBViewer({
    dump: exportedJson,
    dumpFilename: 'mydb-2026-08-05.json'
});
```

A persistent banner states that the data is read-only and frozen at export time. Editing, Observe mode, the Live map and the feeds are disabled with a "not available on a dump" hint. The grid, queries, the Schema panel and the Storage counts work fully. A dump file can also be opened at runtime from the Settings screen.

## Editing is explicit

The viewer never writes silently. Edits in the grid or the drawer are staged first, and the WILL RUN block always shows the exact call that Apply changes will execute. Edits of an existing document run `incrementalPatch()` with only the changed fields, so [middleware hooks](./middleware.md) of the insert path never fire for an update:

```ts
// applied on save, nothing has run yet
await mydb.todos.findOne("a1b2c3").incrementalPatch({
  "title": "Buy milk (2%)"
})
```

New documents run `insert()`. When a write fails, for example because the [schema validation](./schema-validation.md) rejects the document, the error shows as a popup with the parameters of the [RxError](./errors.md) serialized as JSON.

Deleting documents opens a confirmation that states the blast radius: how many documents match, that deletes replicate to connected peers, and that tombstones remain until [cleanup](./cleanup.md). The delete button stays disabled until you type the collection name.

## Limitations

- The viewer renders into the DOM, so it runs in browsers, Electron renderers and webviews, but not in plain Node.js.
- By default the viewer page is loaded from rxdb.info, which needs network access on first load. For offline apps, [host the page yourself](#self-hosting-the-viewer-page) and set `viewerUrl`.
- Sorting in the grid orders the current page, not the whole collection, because arbitrary fields are not guaranteed to be indexed.
- The reads counter of the Live map is derived from the query cache counters, so reads that bypass the cache are not counted.
- Remote pairing to a database on another device is not part of this plugin yet. Use [dump mode](#dump-mode) or the [remote storage](./rx-storage-remote.md) instead.

## FAQ

<details>
    <summary>Can I inspect an RxDB database in production?</summary>

Yes. The viewer is a normal plugin and mounts wherever you decide to render it, for example behind a feature flag or an admin route. Keep in mind that everyone who can open the viewer can read and edit all data of the local database.

</details>

<details>
    <summary>Does the dbviewer plugin increase my build size?</summary>

No, not in a relevant way. The viewer UI is a hosted static page that loads inside an iframe, only the mount function and the postMessage bridge are part of the rxdb build. Apps that never call `mountRxDBViewer()` do not load the page at all.

</details>

<details>
    <summary>Can the viewer page read my database when I do not open it?</summary>

No. The page only receives data through the postMessage bridge that `mountRxDBViewer()` attaches, and the bridge only answers requests of the iframe it created. Without a mount there is no iframe and no bridge.

</details>

<details>
    <summary>Does the viewer work with any RxStorage?</summary>

Yes. The viewer talks to the database through the normal query API, so every [RxStorage](./rx-storage.md) works. The Storage panel additionally counts tombstones through the storage instance, which works on all official storages.

</details>

<details>
    <summary>Does the viewer show replications that start after mounting?</summary>

Yes. The Replication panel polls for states created with `replicateRxCollection()` or one of the replication plugins in the same JavaScript context, so states that start later are picked up automatically.

</details>

## Follow Up

- Start with the [RxDB Quickstart](./quickstart.md)
- Learn how to [export and import JSON dumps](./json-import-export.md)
- Read about [dev-mode](./dev-mode.md) checks during development
- Expose your data to AI agents with the [WebMCP plugin](./webmcp.md)
- If you have not done so yet, leave a star at the [RxDB GitHub repo ⭐](/code/)

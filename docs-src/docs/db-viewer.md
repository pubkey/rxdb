---
title: Database Viewer - Inspect and Edit RxDB Data in a Devtool
slug: db-viewer.html
description: Mount the RxDB database viewer to inspect collections, run Mango queries, edit documents and watch replication live, over a running database or a JSON dump.
image: /headers/db-viewer.jpg
---

import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';
import {BetaBlock} from '@site/src/components/beta-block';
import {CenteredImage} from '@site/src/components/centered-image';

# Database Viewer

In a local-first app the data lives on the user's device and not on a server where you can just log in and look at it. With the `dbviewer` plugin you get a devtool over a running [RxDB](https://rxdb.info/) database, either locally in your app or remotely connected to your user's device. You can browse every [RxCollection](./rx-collection.md), run queries, edit documents and watch [replication](./replication.md).

<BetaBlock since="17.7.0" />

<CenteredImage src="./files/dbviewer.png" alt="RxDB database viewer devtool" width={760} zoomable />

## Quick Start

Mount the viewer into any element of your app:

```ts
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';

mountRxDBViewer({
    database: myDatabase,
    parent: document.getElementById('viewer-panel')
});
```

The [Usage](#usage) section shows how to load it lazily and how to use it with Angular, React, Vue and Svelte.

There are three ways to open the viewer:

- **Mount it into your app** with `mountRxDBViewer()`.
- **Connect from another browser** with `connectRxDBViewer()`. The viewer page pairs with your app over WebRTC, which is useful when the app runs on a phone.
- **Open a JSON dump** that was created with the [json-dump plugin](./json-import-export.md). This works when you cannot reach the device at all.

All three show the same UI.

## What the Viewer Shows

### Browse and Query

- **Data grid and JSON view**: Lists the documents of a collection with `limit` (default: 20) and `skip` inputs and a sort dropdown. The sort is part of the query, so clicking a column header sorts the whole collection and not only the current page. The grid only renders the visible rows, so a limit of `10k` does not slow down the page. Live mode is on by default and updates the result whenever a matching document changes.
- **Mango query bar**: Runs MongoDB-style (Mango) selectors with a history and favorites. You do not have to write strict JSON, `{ done: false }` with unquoted keys and single quotes works too. When the selector has a syntax error, the viewer shows the character position and keeps the previous results visible.
- **Document drawer**: Shows the fields, the internals (`_rev`, `_meta.lwt`) and the [attachments](./rx-attachment.md) of a document, with inline previews for images. A JSON tab lets you edit the whole document as raw JSON. The primary key is protected against accidental changes.
- **System collections**: The internal store, the [local documents](./rx-local-document.md) and the collections behind [RxState](./rx-state.md) are listed in a SYSTEM group. You can browse, query and export them, but editing is disabled.

### Analyze

- **Schema panel**: Samples documents and shows for each field which types it has and in how many documents it is present. Documents that do not match the declared [schema](./rx-schema.md) are listed as violations.
- **Explain button**: Shows which index the current query uses and the execution plan from the [query planner](./query-optimizer.md). It also points out problems like a missing compound index or a `$regex` that has to scan all documents.
- **Live activity map**: Draws your app, its collections and the remote endpoints as a map, and every write, query and replication event moves along it. Each collection shows a 60 second sparkline and the number of cached [RxQuery](./rx-query.md) instances. The map only contains names, counts and rates, never document contents, so you can share your screen while it is open.
- **Changes and replication feeds**: The Changes feed lists the writes of a collection like the network tab of the browser devtools, with a diff per change. You can download it as a JSON array. The Replication panel shows the pull and push state of each replication and the documents that are replicated.

Live activity map:

<CenteredImage src="./files/dbviewer-live-map.png" alt="RxDB database viewer live activity map" width={760} zoomable />

Explain view:

<CenteredImage src="./files/dbviewer-explain.png" alt="RxDB database viewer query explain view" width={760} zoomable />

### Maintain

- **Storage panel**: Shows the storage engine and, per collection, the number of documents, tombstones and attachment bytes.
- **Cleanup tool**: Shows per collection how many deleted documents could be purged and how much of the stored data that is. When the [cleanup plugin](./cleanup.md) is added, you can run the cleanup from here.
- **Export tool**: Downloads the database as one JSON file. You can pick the collections and set a selector per collection, so only the matching documents end up in the file.

Cleanup tool:

<CenteredImage src="./files/dbviewer-cleanup.png" alt="RxDB database viewer cleanup tool" width={760} zoomable />

## Usage

<Steps>

### Mount the Viewer

Call `remove()` when you no longer need the viewer.

```ts
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';

const viewer = mountRxDBViewer({
    database: myDatabase,
    parent: document.getElementById('viewer-panel')
});

// later
viewer.remove();
```

### Load It Lazily

Importing `mountRxDBViewer` adds about `13 kB` (gzip) to your bundle, and including `connectRxDBViewer` with its WebRTC connection adds about `48 kB` (gzip). Load it with a dynamic `import()` when the viewer is opened, so it is not part of the initial page load.

```ts
import type { RxDatabase } from 'rxdb';

async function openViewer(myDatabase: RxDatabase, parent: HTMLElement) {
    const { mountRxDBViewer } = await import('rxdb/plugins/dbviewer');
    return mountRxDBViewer({ database: myDatabase, parent });
}
```

</Steps>

If you prefer a method on the database, add the plugin and call `launchDbViewer()`:

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBDbViewerPlugin } from 'rxdb/plugins/dbviewer';
addRxPlugin(RxDBDbViewerPlugin);

const viewer = myDatabase.launchDbViewer({ parent: document.body });
```

### Usage with Frameworks

Mount the viewer when the component is rendered and call `remove()` when it is destroyed. The viewer does not close itself. With `showCloseButton` set, a click on the close icon emits on `close$` and your app decides what to do, for example hide the panel.

<Tabs>

### Angular

```ts
import {
    AfterViewInit, Component, ElementRef,
    NgZone, OnDestroy, ViewChild, inject
} from '@angular/core';
import type { RxDBViewerHandle } from 'rxdb/plugins/dbviewer';
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
        // Mounting outside of the Angular zone keeps the
        // viewer updates out of change detection. The dynamic
        // import() keeps the plugin out of the main bundle.
        this.zone.runOutsideAngular(async () => {
            const { mountRxDBViewer } = await import('rxdb/plugins/dbviewer');
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

The [Angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular) has a complete integration with an "Open DB Viewer" toggle and the `close$` wiring.

### React

```tsx
import { useEffect, useRef } from 'react';
import type { RxDBViewerHandle } from 'rxdb/plugins/dbviewer';
import { getDatabase } from './database';

export function DbViewer() {
    const hostRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let removed = false;
        let handle: RxDBViewerHandle | undefined;
        (async () => {
            // The dynamic import() keeps the plugin out of the main bundle.
            const { mountRxDBViewer } = await import('rxdb/plugins/dbviewer');
            const myDatabase = await getDatabase();
            if (removed || !hostRef.current) {
                return;
            }
            handle = mountRxDBViewer({
                database: myDatabase,
                parent: hostRef.current
            });
        })();
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
import { getDatabase } from './database';

const viewerHost = ref(null);
let removed = false;
let handle;

onMounted(async () => {
    // The dynamic import() keeps the plugin out of the main bundle.
    const { mountRxDBViewer } = await import('rxdb/plugins/dbviewer');
    const myDatabase = await getDatabase();
    if (removed) {
        return;
    }
    handle = mountRxDBViewer({
        database: myDatabase,
        parent: viewerHost.value
    });
});
onUnmounted(() => {
    removed = true;
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
import { getDatabase } from './database';

let viewerHost;

onMount(() => {
    let removed = false;
    let handle;
    (async () => {
        // The dynamic import() keeps the plugin out of the main bundle.
        const { mountRxDBViewer } = await import('rxdb/plugins/dbviewer');
        const myDatabase = await getDatabase();
        if (removed) {
            return;
        }
        handle = mountRxDBViewer({
            database: myDatabase,
            parent: viewerHost
        });
    })();
    return () => {
        removed = true;
        if (handle) {
            handle.remove();
        }
    };
});
</script>

<div bind:this={viewerHost} style="height: 500px"></div>
```

</Tabs>

## How It Works

The plugin itself contains no UI code. `mountRxDBViewer()` creates an iframe that loads the viewer page from [rxdb.info/db-viewer/index.html](https://rxdb.info/db-viewer/index.html) and then serves the database to that iframe over `postMessage`. The page is one self-contained HTML file.

So the UI is not part of your bundle, only the small bridge is. The page inside the iframe never gets access to the database object. Queries, the query plan analysis and the event streams run in your application window, and the page only receives the results.

## Options

```ts
const viewer = mountRxDBViewer({
    /**
     * The live database to inspect.
     * Either database or dump must be given.
     */
    database: myDatabase,
    /**
     * (optional) A static export created with exportJSON().
     * Opens the viewer in read-only dump mode.
     */
    dump: myDumpJson,
    /**
     * (optional) Filename shown in the dump banner.
     */
    dumpFilename: 'my-database-2026-08-05.json',
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
     * Clicking it emits on the close$ observable of the handle.
     * The viewer stays mounted until remove() is called.
     * [default=false]
     */
    showCloseButton: true,
    /**
     * (optional) Url of the viewer page that is loaded
     * into the iframe. Point this to a self-hosted copy
     * when your app must work without network access.
     * [default='https://rxdb.info/db-viewer/index.html']
     */
    viewerUrl: 'https://example.com/dbviewer.html'
});

viewer.close$.subscribe(() => {
    // hide the panel that contains the viewer
});
```

## Remote Pairing over WebRTC

When the app runs on a device you cannot attach a debugger to, for example a phone in field testing, call `connectRxDBViewer()` in the app and open the returned url in any browser:

```ts
import { connectRxDBViewer } from 'rxdb/plugins/dbviewer';

const viewer = await connectRxDBViewer({
    database: myDatabase,
    /**
     * (optional) The pairing room id. Everyone who knows it
     * gets FULL read and write access to the database,
     * so treat it like a password.
     * [default=a random 18 character token]
     */
    roomId: 'a-long-random-id',
    /**
     * (optional) Url of the WebRTC signaling server.
     * The default server is for tryouts only. In production
     * you run your own, see the replication-webrtc docs.
     * [default='wss://signaling.rxdb.info/']
     */
    signalingServerUrl: 'wss://example.com/signaling',
    /**
     * (optional) Url of the hosted viewer page.
     * [default='https://rxdb.info/db-viewer/index.html']
     */
    viewerUrl: 'https://example.com/dbviewer.html'
});

// The full url to open the viewer with, for example
// https://rxdb.info/db-viewer/index.html#room=abc...&signaling=...
console.log(viewer.url);

// later: stop serving the database
await viewer.close();
```

The url contains the room id and the signaling server in its hash, so the page connects as soon as it is opened. When you open the page without a hash, it shows a form where you enter the values by hand. A room id must have at least 6 characters, otherwise [`DVW3`](./errors.md#DVW3) is thrown.

<CenteredImage src="./files/dbviewer-connect.png" alt="RxDB database viewer WebRTC connect form" width={760} zoomable />

All features work over WebRTC because it uses the same bridge protocol as the iframe mount. The signaling server only brokers the connection, the data flows directly between your browser and the device. You can run your own signaling server with `startSignalingServerSimplePeer()` as described in the [WebRTC replication docs](./replication-webrtc.md).

The [Angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular) puts this behind a debug flag. When you open the app with `?debug=dbviewer-webrtc`, it connects the database and logs the pairing url to the console.

## Dump Mode

When you cannot reach the device at all, for example when a user sends you their data with a bug report, work with an export. On the device, call `await myDatabase.exportJSON()` from the [json-dump plugin](./json-import-export.md), save the result and open it in the viewer:

```ts
import { mountRxDBViewer } from 'rxdb/plugins/dbviewer';

mountRxDBViewer({
    dump: exportedJson,
    dumpFilename: 'my-database-2026-08-05.json'
});
```

The grid, the queries, the Schema panel and the storage counts work the same as with a live database. Editing, Live mode, the activity map and the feeds need a running database, so they are disabled and show a "not available on a dump" hint. You can also open a dump file at runtime from the Export/Import tool.

## Self-Hosting the Viewer Page

When your app has to run offline or your Content Security Policy does not allow pages from other origins, serve the viewer page from your own origin. Because the page is one self-contained HTML file, self-hosting is just a file copy:

1. **Get the file**. Download it once from [rxdb.info/db-viewer/index.html](https://rxdb.info/db-viewer/index.html), or build it from the RxDB repository with `npm run build:dbviewer`, which writes it to `docs-src/static/db-viewer/index.html`.
2. **Serve it as a static asset** of your app, for example as `public/dbviewer.html`. It has to be served over http(s). A `file://` url does not work because `postMessage` needs an origin.
3. **Set the `viewerUrl` option** to the url of your copy:

```ts
const viewer = mountRxDBViewer({
    database: myDatabase,
    viewerUrl: 'https://example.com/dbviewer.html'
});
```

The [Angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular) does this in its `postinstall` script. It copies the built page to `src/assets/dbviewer.html` and mounts the viewer with `viewerUrl: 'assets/dbviewer.html'`.

The page and the plugin talk over a versioned protocol, so update your self-hosted copy whenever you update RxDB.

## Limitations

- The viewer renders into the DOM. It runs in browsers, Electron renderers and webviews, but not in plain Node.js.
- With the default `viewerUrl`, the first load needs network access to rxdb.info. For offline apps, [host the page yourself](#self-hosting-the-viewer-page).
- The reads counter of the activity map is derived from the query cache counters. Reads that bypass the cache are not counted.

## FAQ

<details>
    <summary>Can I inspect an RxDB database in production?</summary>

Yes. The viewer is a normal plugin and is only shown where you mount it, for example behind a feature flag or an admin route. Keep in mind that everyone who can open the viewer can read and edit all data of the local **[RxDatabase](./rx-database.md)**.

</details>

<details>
    <summary>Does the RxDB database viewer increase my bundle size?</summary>

Only a little. The UI is a hosted page that loads inside an iframe, so only the mount function and the bridge are part of your bundle, which is about `13 kB` (gzip). With a dynamic `import()` the plugin is not loaded at all until you open the viewer.

</details>

<details>
    <summary>Can the viewer page read my database when I do not open it?</summary>

No. The page only receives data over the bridge that `mountRxDBViewer()` or `connectRxDBViewer()` creates.

</details>

<details>
    <summary>Does the database viewer work with any RxStorage?</summary>

Yes. The viewer reads the data through the normal query API, so it works with every **[RxStorage](./rx-storage.md)**. To count tombstones, the Storage panel also reads from the storage instance, which works with all official storages.

</details>

<details>
    <summary>Does the viewer show replications that start after it was mounted?</summary>

Yes. The Replication panel polls for replication states created with `replicateRxCollection()` or one of the **[replication plugins](./replication.md)** in the same JavaScript context.

</details>

<details>
    <summary>Does the RxDB database viewer show encrypted fields in plain text?</summary>

Yes. The viewer reads documents through the RxDB query API and not from the raw storage, so fields that are stored with the **[encryption plugin](./encryption.md)** show up decrypted. The same goes for [key compression](./key-compression.md): you see the normal field names and not the compressed keys. Keep this in mind before you share your screen or open the viewer on a production device.

</details>

<details>
    <summary>Can I use the database viewer with React Native or Capacitor?</summary>

Yes. In a **[Capacitor](./capacitor-database.md)** app the code runs in a webview, so you can mount the viewer directly. **[React Native](./react-native-database.md)** has no DOM, so `mountRxDBViewer()` does not work there. Instead, call `connectRxDBViewer()` in the app and open the pairing url in a browser on your machine. This needs a WebRTC implementation in the React Native JavaScript context, for example from `react-native-webrtc`. When that is not possible, export the data and use the [dump mode](#dump-mode).

</details>

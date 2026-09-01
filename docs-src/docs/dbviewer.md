---
title: Database Viewer - Inspect and Edit RxDB Data in a Devtool
slug: dbviewer.html
description: Mount the RxDB database viewer to inspect collections, run Mango queries, edit documents and watch replication live, over a running database or a JSON dump.
image: /headers/dbviewer.jpg
---

# Database Viewer

With the `dbviewer` plugin you can inspect and edit the data of a running [RxDB](https://rxdb.info/) database from inside your own application. The viewer mounts into any DOM element and renders a full devtool: a data grid with a Mango query bar, a JSON view, a document detail drawer, and panels for schema analysis, query analysis, [replication](./replication.md), the change stream and storage statistics. It works over a live [RxDatabase](./rx-database.md) and over a static dump created with the [json-dump plugin](./json-import-export.md).

Key features:

- **Data grid and JSON view**: Browse documents of any [RxCollection](./rx-collection.md), paginated at 100 rows per page, with multi-select, inline editing and an Observe mode, on by default, that updates the result live as documents change.
- **Mango query bar**: Run MongoDB-style (Mango) selectors against a collection, with history and favourites. The input also accepts relaxed JavaScript object syntax like `{ name: 'foo' }`, unquoted keys and single quotes are converted to JSON. Syntax errors show the exact character position and previous results stay visible.
- **Document drawer**: Shows fields, internals (`_rev`, `_meta.lwt`), [attachments](./rx-attachment.md) with inline image previews, and a WILL RUN block that previews the exact call before you apply staged edits: `insert()` for new documents, `incrementalPatch()` with only the changed fields for edits.
- **Live activity map**: Draws the database as a map from app to collections to remote endpoints. Write, query and replication events flow as glyph particles, each collection node shows a 60 second sparkline and its cached [RxQuery](./rx-query.md) count. No document contents are drawn, only names, counts and rates, so the screen is safe to share.
- **Schema panel**: Samples documents and shows per-field type shares, presence percentages and value details, plus violations against the declared [schema](./rx-schema.md). A toggle switches to the declared JSON schema itself.
- **Query lab**: Explains a query with the used index, an execution plan derived from the [query planner](./query-optimizer.md) and findings like missing compound indexes or `$regex` full scans.
- **Changes and replication feeds**: A network-tab style list of all writes with a unified diff per change, and per-collection pull/push states with a live feed of replicated documents.
- **Storage panel**: Engine, document counts, tombstones and attachment bytes per collection, with a button to run a [cleanup](./cleanup.md) when the cleanup plugin is loaded.

## Usage

The viewer ships as a normal plugin without any framework dependency. Mount it into an element and remove it when you are done:

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
    showCloseButton: true
});

viewer.close$.subscribe(() => {
    // hide the panel that contains the viewer
});
```

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
- Sorting in the grid orders the current page, not the whole collection, because arbitrary fields are not guaranteed to be indexed.
- The reads counter of the Live map is derived from the query cache counters, so reads that bypass the cache are not counted.
- Remote pairing to a database on another device is not part of this plugin yet. Use [dump mode](#dump-mode) or the [remote storage](./rx-storage-remote.md) instead.

## FAQ

<details>
    <summary>Can I inspect an RxDB database in production?</summary>

Yes. The viewer is a normal plugin and mounts wherever you decide to render it, for example behind a feature flag or an admin route. Keep in mind that everyone who can open the viewer can read and edit all data of the local database.

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

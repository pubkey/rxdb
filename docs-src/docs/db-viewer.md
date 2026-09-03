---
title: Database Viewer and Editor for RxDB
slug: db-viewer.html
description: Inspect and edit a running RxDB database in the browser with a data grid, Mango query bar, schema analysis, query explain, replication and change feeds.
image: /headers/db-viewer.jpg
---

# Database Viewer

With the `db-viewer` plugin you can open a **database viewer** for a running [RxDatabase](./rx-database.md) inside your app. It reads the data of the live database, so you see the same documents your code sees, including the ones written a millisecond ago.

Key features:

- **Data grid and JSON view** with a [Mango query](./rx-query.md) bar, sorting and paging at 100 rows per page.
- **Document drawer** that stages your edits and previews the exact `upsert()` call before anything is written.
- **Live activity map** that draws the database as app, collections and remote, with per collection write rates over the last 60 seconds.
- **Schema panel** that samples the stored documents and reports what they actually contain next to what the [schema](./rx-schema.md) declares.
- **Query lab** that explains which index a query used, how many documents it examined and what it discarded.
- **Replication and Changes panels** that show what crossed the wire and the diff of every write.
- **Storage panel** with document counts, tombstone counts and a button to run the [cleanup](./cleanup.md).

## How it works

The UI is **not** part of your bundle. It is a single static HTML file that is
published with the RxDB docs, and the plugin loads it into an iframe:

```
your app                          iframe (rxdb.info)
┌───────────────────────────┐     ┌───────────────────────────┐
│ RxDatabase                │     │ the viewer UI             │
│ rxdb/plugins/db-viewer  ──┼────▶│ asks for documents,       │
│   the bridge              │◀────┼─  counts, schema, plans   │
└───────────────────────────┘     └───────────────────────────┘
        postMessage, inside the same browser
```

Only the bridge ships in your app. It is around **9 KB gzipped**, because it
contains no UI at all: no stylesheet, no fonts, no components. Everything the
viewer draws it had to ask the bridge for over `postMessage`.

**Your data never leaves the browser.** `postMessage` is a call between two
documents in the same browser, not a network request, and the viewer page makes
no request of its own once it has loaded. The page is served from rxdb.info, and
that is the only thing that is fetched.

## Installation

```ts
import { mountRxDBDbViewer } from 'rxdb/plugins/db-viewer';
```

## Usage

Mount the database viewer on a database and it renders as a full screen overlay:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { mountRxDBDbViewer } from 'rxdb/plugins/db-viewer';

const db = await createRxDatabase({
    name: 'heroesdb',
    storage: getRxStorageLocalstorage()
});
await db.addCollections({
    heroes: { schema: heroSchema }
});

const dbViewer = mountRxDBDbViewer(db);
```

To render it into your own element instead, pass a `target`:

```ts
const dbViewer = mountRxDBDbViewer(db, {
    target: document.querySelector('#rxdb-panel')
});
```

Call `dbViewer.destroy()` to close it again. Mounting twice for the same database returns the database viewer that is already open.

You can also add the plugin and use the `mountDbViewer()` method on the database:

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBDbViewerPlugin } from 'rxdb/plugins/db-viewer';
addRxPlugin(RxDBDbViewerPlugin);

const dbViewer = db.mountDbViewer();
```

## Options

```ts
mountRxDBDbViewer(db, {
    // where the database viewer is mounted, changes only the chrome of the top bar
    surface: 'tab', // 'tab' | 'embedded' | 'tanstack' | 'dump'
    // element to render into, defaults to a full screen overlay
    target: myElement,
    // rows per page in every grid and result list
    pageSize: 100,
    // set when reading a static export instead of a live database
    dump: { fileName: 'heroesdb-2026-08-05.json', exportedAt: Date.now() },
    // state of a remote connection, for example over WebRTC
    connection: { state: 'local' },
    // where the UI is loaded from, see "Hosting the UI yourself"
    viewerUrl: 'https://rxdb.info/html/db-viewer.html'
});
```

When `dump` is set, or when `connection` reports a read-only remote, every writing action is disabled and says so in its tooltip. Counts, Schema, Query lab and Storage keep working.

## Editing documents

Rows open in the drawer, the checkbox selects without opening it. Editing a field in the drawer, or double clicking a cell in the grid, stages the change instead of writing it. The **WILL RUN** block shows the exact call with the changed lines highlighted, and only `Apply changes` runs it.

Deleting more than one document at once states the blast radius first: how many of how many documents match, that the deletes replicate to connected peers, and that tombstones remain until cleanup runs. The delete button stays disabled until you type the collection name.

## What the Live map shows

The Live map draws names, counts and rates, never document contents, so the screen stays safe to share. Every colour is paired with a glyph: `+` insert, `~` update, `-` delete, `?` query, `◆` live query result, `↑` `↓` push and pull. Above roughly 200 events per second a lane becomes a moving band and the exact rate is printed beside it, so the picture stays readable with motion disabled.

Reads and live query emits are derived from the query cache rather than from a dedicated event stream, so their counters update once per second.

## Hosting the UI yourself

Loading the page from rxdb.info means the viewer does not work offline, and a
strict [content security policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
can block the iframe. For both cases, serve the file yourself.

The page is one self contained file with no further requests, so downloading it
next to your other static assets is enough:

```bash
curl -o public/db-viewer.html https://rxdb.info/html/db-viewer.html
```

```ts
mountRxDBDbViewer(db, {
    viewerUrl: '/db-viewer.html'
});
```

Re-download it when you update RxDB. The plugin appends `?version=` to the URL,
and a page that is older than the plugin can refuse to talk to it.

When you keep the default, your `frame-src` must allow `https://rxdb.info`.

## Limitations

- The database viewer needs a DOM. Calling `mountRxDBDbViewer()` in Node.js throws the error code `DBV1`.
- The UI is loaded over the network on first open. Host it yourself when your app has to work offline.
- Because the UI runs in another document, it cannot subscribe to an [RxQuery](./rx-query.md) directly. `Observe` re-runs the query whenever a write to that collection is reported, instead of receiving the query results themselves.
- Below 640 pixels the rail and the tool panels do not fit. The database viewer switches to three stacked screens that are read-only.
- Leadership is only known when the [leader election](./leader-election.md) plugin is added. RxDB does not publish a roster of the other open instances, so the Instances panel reports this instance only.
- The Changes and Replication feeds keep their most recent entries in memory. Nothing the database viewer records is written back into the database.
- Tombstone counts and the cleanup button need the [cleanup](./cleanup.md) plugin.

## FAQ

<details>
<summary>Does my data get sent to rxdb.info?</summary>

No. The only thing that comes from rxdb.info is the HTML file of the UI. Your
documents are passed to it with `postMessage`, which is a call between two
documents inside your browser and never touches the network. The page makes no
request of its own after it has loaded, and it carries no analytics.

</details>

<details>
<summary>Does the database viewer slow down my app?</summary>

It subscribes to the change stream of the database and polls the query cache once per second. Both are cheap. Ship it behind a flag anyway so it is not bundled into production builds.

</details>

<details>
<summary>Can I inspect a database that runs on another device?</summary>

Yes. Pass a `connection` describing the remote peer and the database viewer shows the connection stages while it pairs, a banner with the transport and the write mode once it is connected, and a diagnosis if it fails. When peer to peer traffic is blocked, export the data with [exportJSON()](./json-import-export.md) on the device and open the file with the `dump` option instead.

</details>

<details>
<summary>Why does the Live map use different colours than the Replication panel?</summary>

The map uses one violet for push and pull so that replication reads as a single flow, while the Replication and Changes panels colour each direction separately. The glyphs `↑` and `↓` are the same in both places.

</details>

## Follow Up

- Start with the [Quickstart](./quickstart.md).
- Read about [RxQuery](./rx-query.md) to write the selectors the query bar takes.
- Read about [cleanup](./cleanup.md) to understand what the Storage panel purges.
- Read about [dev-mode](./dev-mode.md) for the other checks that run while developing.
- Check the [RxDB GitHub repo](/code/) and leave a star ⭐

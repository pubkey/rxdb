---
title: Devtool - Database Viewer and Editor for RxDB
slug: devtool.html
description: Inspect and edit a running RxDB database in the browser with a data grid, Mango query bar, schema analysis, query explain, replication and change feeds.
image: /headers/devtool.jpg
---

# Devtool

With the `devtool` plugin you can open a **database viewer** for a running [RxDatabase](./rx-database.md) inside your app. It reads the data of the live database, so you see the same documents your code sees, including the ones written a millisecond ago.

Key features:

- **Data grid and JSON view** with a [Mango query](./rx-query.md) bar, sorting and paging at 100 rows per page.
- **Document drawer** that stages your edits and previews the exact `upsert()` call before anything is written.
- **Live activity map** that draws the database as app, collections and remote, with per collection write rates over the last 60 seconds.
- **Schema panel** that samples the stored documents and reports what they actually contain next to what the [schema](./rx-schema.md) declares.
- **Query lab** that explains which index a query used, how many documents it examined and what it discarded.
- **Replication and Changes panels** that show what crossed the wire and the diff of every write.
- **Storage panel** with document counts, tombstone counts and a button to run the [cleanup](./cleanup.md).

The whole UI ships inside the plugin. There are no external stylesheets, no font files and no network requests.

## Installation

```ts
import { mountRxDBDevtool } from 'rxdb/plugins/devtool';
```

## Usage

Mount the devtool on a database and it renders as a full screen overlay:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { mountRxDBDevtool } from 'rxdb/plugins/devtool';

const db = await createRxDatabase({
    name: 'heroesdb',
    storage: getRxStorageLocalstorage()
});
await db.addCollections({
    heroes: { schema: heroSchema }
});

const devtool = mountRxDBDevtool(db);
```

To render it into your own element instead, pass a `target`:

```ts
const devtool = mountRxDBDevtool(db, {
    target: document.querySelector('#rxdb-panel')
});
```

Call `devtool.destroy()` to close it again. Mounting twice for the same database returns the devtool that is already open.

You can also add the plugin and use the `mountDevtool()` method on the database:

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBDevtoolPlugin } from 'rxdb/plugins/devtool';
addRxPlugin(RxDBDevtoolPlugin);

const devtool = db.mountDevtool();
```

## Options

```ts
mountRxDBDevtool(db, {
    // where the devtool is mounted, changes only the chrome of the top bar
    surface: 'tab', // 'tab' | 'embedded' | 'tanstack' | 'dump'
    // element to render into, defaults to a full screen overlay
    target: myElement,
    // rows per page in every grid and result list
    pageSize: 100,
    // set when reading a static export instead of a live database
    dump: { fileName: 'heroesdb-2026-08-05.json', exportedAt: Date.now() },
    // state of a remote connection, for example over WebRTC
    connection: { state: 'local' }
});
```

When `dump` is set, or when `connection` reports a read-only remote, every writing action is disabled and says so in its tooltip. Counts, Schema, Query lab and Storage keep working.

## Editing documents

Rows open in the drawer, the checkbox selects without opening it. Editing a field in the drawer, or double clicking a cell in the grid, stages the change instead of writing it. The **WILL RUN** block shows the exact call with the changed lines highlighted, and only `Apply changes` runs it.

Deleting more than one document at once states the blast radius first: how many of how many documents match, that the deletes replicate to connected peers, and that tombstones remain until cleanup runs. The delete button stays disabled until you type the collection name.

## What the Live map shows

The Live map draws names, counts and rates, never document contents, so the screen stays safe to share. Every colour is paired with a glyph: `+` insert, `~` update, `-` delete, `?` query, `◆` live query result, `↑` `↓` push and pull. Above roughly 200 events per second a lane becomes a moving band and the exact rate is printed beside it, so the picture stays readable with motion disabled.

Reads and live query emits are derived from the query cache rather than from a dedicated event stream, so their counters update once per second.

## Limitations

- The devtool needs a DOM. Calling `mountRxDBDevtool()` in Node.js throws the error code `DVT1`.
- Below 640 pixels the rail and the tool panels do not fit. The devtool switches to three stacked screens that are read-only.
- Leadership is only known when the [leader election](./leader-election.md) plugin is added. RxDB does not publish a roster of the other open instances, so the Instances panel reports this instance only.
- The Changes and Replication feeds keep their most recent entries in memory. Nothing the devtool records is written back into the database.
- Tombstone counts and the cleanup button need the [cleanup](./cleanup.md) plugin.

## FAQ

<details>
<summary>Does the devtool slow down my app?</summary>

It subscribes to the change stream of the database and polls the query cache once per second. Both are cheap. Ship it behind a flag anyway so it is not bundled into production builds.

</details>

<details>
<summary>Can I inspect a database that runs on another device?</summary>

Yes. Pass a `connection` describing the remote peer and the devtool shows the connection stages while it pairs, a banner with the transport and the write mode once it is connected, and a diagnosis if it fails. When peer to peer traffic is blocked, export the data with [exportJSON()](./rx-database.md#exportjson) on the device and open the file with the `dump` option instead.

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

---
title: Electric-SQL Replication Plugin for RxDB
slug: replication-electric-sql.html
description: Sync data from PostgreSQL to RxDB using Electric-SQL. Stream shapes from your database to client-side collections with real-time updates.
---

import {Steps} from '@site/src/components/steps';

# Electric-SQL Replication Plugin for RxDB

<p align="center">
  <img src="./files/icons/electric-sql.svg" alt="Electric-SQL" height="60" className="img-padding img-in-text-right" />
</p>

The **Electric-SQL Replication Plugin** for RxDB synchronizes data from a PostgreSQL database to RxDB collections using [Electric-SQL](https://electric-sql.com/) (also known as Electric). Electric provides a read-path sync layer that streams "shapes" (subsets of your PostgreSQL data) to client applications in real-time via HTTP.

Under the hood, this plugin is powered by the RxDB [Sync Engine](./replication.md). It uses Electric's HTTP API for incremental pulls with offset-based checkpointing and Electric's live mode for real-time change detection.

## Key Features

- **PostgreSQL to client sync** using Electric's shape-based streaming
- **Incremental pull** with offset-based checkpoint tracking
- **Real-time updates** via Electric's live long-polling mode
- **Offline-first** with RxDB's built-in retry and conflict handling
- **No external client dependency** required: communicates with Electric over plain HTTP
- **Flexible push** via user-provided handlers for writing back to PostgreSQL

## How It Works

Electric-SQL provides a read-path sync layer between PostgreSQL and clients. Data flows as:

1. **PostgreSQL** stores the source of truth
2. **Electric** watches for changes and provides an HTTP shape API
3. **RxDB** pulls shapes from Electric and stores them locally

For writes, Electric does not include a built-in write path. You must provide your own backend API (REST, GraphQL, etc.) that writes to PostgreSQL. Once the write is committed to PostgreSQL, Electric syncs the change to all connected clients.

## Setting Up RxDB with Electric-SQL

<Steps>

### Prerequisites

You need a running Electric-SQL service connected to your PostgreSQL database. See the [Electric-SQL documentation](https://electric-sql.com/docs) for setup instructions.

### Install RxDB

```bash
npm install rxdb
```

### Create an RxDB Database and Collection

Create an RxDB database and add a collection whose schema matches your PostgreSQL table structure. The primary key must match the table's primary key column.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';

const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageMemory()
});

await db.addCollections({
    items: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id:    { type: 'string', maxLength: 100 },
                name:  { type: 'string' },
                value: { type: 'number' }
            },
            required: ['id', 'name']
        }
    }
});
```

### Start Replication

Connect your RxDB collection to Electric-SQL. The `url` should point to your Electric shape endpoint, and `params.table` specifies the PostgreSQL table to sync.

```ts
import { replicateElectricSQL } from 'rxdb/plugins/replication-electric-sql';

const replicationState = replicateElectricSQL({
    collection: db.items,
    replicationIdentifier: 'items-electric',
    url: 'http://localhost:3000/v1/shape',
    params: {
        table: 'items'
    },
    live: true,
    pull: {
        batchSize: 100
    }
});

replicationState.error$.subscribe(err => console.error('[replication]', err));
await replicationState.awaitInitialReplication();
```

### Add a Push Handler (Optional)

Since Electric-SQL only provides a read path, you need to supply your own push handler to write changes back to your PostgreSQL database through your backend API.

```ts
import { replicateElectricSQL } from 'rxdb/plugins/replication-electric-sql';

const replicationState = replicateElectricSQL({
    collection: db.items,
    replicationIdentifier: 'items-electric',
    url: 'http://localhost:3000/v1/shape',
    params: {
        table: 'items'
    },
    live: true,
    pull: {
        batchSize: 100
    },
    push: {
        async handler(rows) {
            const conflicts = [];
            for (const row of rows) {
                const response = await fetch('https://your-backend.com/api/items', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(row.newDocumentState)
                });
                if (!response.ok) {
                    // handle conflict: fetch current server state and add to conflicts
                }
            }
            return conflicts;
        },
        batchSize: 10
    }
});
```

</Steps>


## Configuration Options

### Shape Parameters

Use the `params` object to configure the Electric shape. You can filter rows with a `where` clause or select specific columns:

```ts
const replicationState = replicateElectricSQL({
    collection: db.items,
    replicationIdentifier: 'items-electric',
    url: 'http://localhost:3000/v1/shape',
    params: {
        table: 'items',
        where: 'status=\'active\'',
        columns: 'id,name,value',
        replica: 'full'
    },
    pull: {}
});
```

### Custom Headers

Pass custom HTTP headers for authentication or other purposes:

```ts
const replicationState = replicateElectricSQL({
    // ...
    headers: {
        'Authorization': 'Bearer your-token'
    },
    pull: {}
});
```

### Custom Fetch Function

Provide a custom fetch implementation, for example when using a custom HTTP client or when running in an environment without a global `fetch`:

```ts
const replicationState = replicateElectricSQL({
    // ...
    fetch: myCustomFetch,
    pull: {}
});
```

## Handling Deletes

Electric-SQL reports physical deletes from PostgreSQL. The plugin maps Electric's `delete` operations to RxDB's soft-delete mechanism by setting `_deleted: true` on the document. If your PostgreSQL table uses soft deletes (a boolean column), those are synced as regular field updates.

## Follow Up

- **Replication API Reference:** Learn the core concepts and lifecycle hooks: [Replication](./replication.md)
- **Electric-SQL Documentation:** [electric-sql.com/docs](https://electric-sql.com/docs)
- **Offline-First Guide:** Caching, retries, and conflict strategies: [Local-First](./articles/local-first-future.md)
- **Community:** Questions or feedback? Join our Discord: [Chat](./chat)

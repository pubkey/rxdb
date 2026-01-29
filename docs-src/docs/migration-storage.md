---
title: Migration Storage
slug: migration-storage.html
description: Effortlessly migrate your data between storages in RxDB using the Storage Migration plugin. Retain your documents when switching storages or major versions.
image: /headers/migration-storage.jpg
---

# Storage Migration

The storage migration plugin can be used to migrate all data from one existing RxStorage into another. This is useful when:

- You want to migrate from one [RxStorage](./rx-storage.md) to another one.
- You want to migrate to a new major RxDB version while keeping the previous saved data. This function only works from the previous major version upwards. Do not use it to migrate like rxdb v9 to v14.

<!-- TODO this was inherited from PouchDB, we should remove this in the future and also migrate deleted documents. -->
The storage migration **drops deleted documents** and filters them out during the migration.

:::warning Do never change the schema while doing a storage migration

When you migrate between storages, you might want to change the schema in the same process. You should never do that because it will lead to problems afterwards and might make your database unusable.

When you also want to change your schema, first run the storage migration and afterwards run a normal [schema migration](./migration-schema.md).
:::

## Usage

Lets say you want to migrate from [LocalStorage RxStorage](./rx-storage-localstorage.md) to the [IndexedDB RxStorage](./rx-storage-indexeddb.md).

```ts
import { migrateStorage } from 'rxdb/plugins/migration-storage';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';
import { getRxStorageLocalstorage } from 'rxdb-old/plugins/storage-localstorage';

// create the new RxDatabase
const db = await createRxDatabase({
    name: dbLocation,
    storage: getRxStorageIndexedDB(),
    multiInstance: false
});

await migrateStorage({
    database: db as any,
    /**
     * Name of the old database,
     * using the storage migration requires that the
     * new database has a different name.
     */
    oldDatabaseName: 'myOldDatabaseName',
    oldStorage: getRxStorageLocalstorage(), // RxStorage of the old database
    batchSize: 500, // batch size
    parallel: false, // <- true if it should migrate all collections in parallel. False (default) if should migrate in serial
    afterMigrateBatch: (input: AfterMigrateBatchHandlerInput) => {
        console.log('storage migration: batch processed');
    }
});
```

:::note
Only collections that exist in the new database at the time you call migrateStorage() will have their data migrated.

- If your old database had collections `['users', 'posts', 'comments']` but your new database only defines `['users', 'posts']`, then only users and posts data will be migrated.
- Any collections missing from the new database will simply be skipped - no data for them will be read or written.

This allows you to selectively migrate only certain collections if desired, by choosing which collections to define before invoking `migrateStorage()`.
:::

## Migrate from a previous RxDB major version

To migrate from a previous RxDB major version, you have to install the 'old' RxDB in the `package.json`

```json
{
    "dependencies": {
        "rxdb-old": "npm:rxdb@14.17.1",
    }
}
```

Then you can run the migration by providing the old storage:

```ts
/* ... */
import { migrateStorage } from 'rxdb/plugins/migration-storage';
import { getRxStorageLocalstorage } from 'rxdb-old/plugins/storage-localstorage'; // <- import from the old RxDB version

await migrateStorage({
    database: db as any,
    /**
     * Name of the old database,
     * using the storage migration requires that the
     * new database has a different name.
     */
    oldDatabaseName: 'myOldDatabaseName',
    oldStorage: getRxStorageLocalstorage(), // RxStorage of the old database
    batchSize: 500, // batch size
    parallel: false,
    afterMigrateBatch: (input: AfterMigrateBatchHandlerInput) => {
        console.log('storage migration: batch processed');
    }
});
/* ... */
```

## Disable Version Check on [RxDB Premium 👑](/premium/)

RxDB Premium has a check in place that ensures that you do not accidentally use the wrong RxDB core and 👑 Premium version together which could break your database state. 
This can be a problem during migrations where you have multiple versions of RxDB in use and it will throw the error `Version mismatch detected`.
You can disable that check by importing and running the `disableVersionCheck()` function from RxDB Premium.

```ts
// RxDB Premium v15 or newer:
import {
    disableVersionCheck
} from 'rxdb-premium-old/plugins/shared';
disableVersionCheck();


// RxDB Premium v14:

// for esm
import {
    disableVersionCheck
} from 'rxdb-premium-old/dist/es/shared/version-check.js';
disableVersionCheck();

// for cjs
import {
    disableVersionCheck
} from 'rxdb-premium-old/dist/lib/shared/version-check.js';
disableVersionCheck();
```

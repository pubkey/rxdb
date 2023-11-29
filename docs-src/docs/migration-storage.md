---
title: Migration Storage
slug: migration-storage.html
---

# Storage Migration

The storage migration plugin can be used to migrate all data from one existing RxStorage into another. This is useful when:

- You want to migration from one [RxStorage](./rx-storage.md) to another one.
- You want to migrate to a new major RxDB version while keeping the previous saved data. This function only works from the previous major version upwards. Do not use it to migrate like rxdb v9 to v14.

The storage migration **drops deleted documents** and filters them out during the migration.


## Usage

Lets say you want to migrate from LokiJs to the [Dexie.js](./rx-storage-dexie.md) RxStorage.

```ts
import { migrateStorage } from 'rxdb/plugins/migration-storage';
import {
    getRxStorageLoki
} from 'rxdb/plugins/storage-loki';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// create the new RxDatabase
const db = await createRxDatabase<RxStylechaseCollections>({
    name: dbLocation,
    storage: getRxStorageDexie(),
    multiInstance: false
});

await migrateStorage(
    db as any,
    /**
     * Name of the old database,
     * using the storage migration requires that the
     * new database has a different name.
     */
    'myOldDatabaseName',
    getRxStorageLoki(), // RxStorage of the old database
    500, // batch size
    // 
    (input: AfterMigrateBatchHandlerInput) => {
        console.log('storage migration: batch processed');
    }
);
```


## Migrate from a previous RxDB major version

To migrate from a previous RxDB major version, you have to install the 'old' RxDB in the `package.json`

```json
{
    "dependencies": {
        "rxdb-old": "npm:rxdb@14.17.1",
    }
}
```

The you can run the migration by providing the old storage:

```ts
/* ... */
import { migrateStorage } from 'rxdb/plugins/migration-storage';
import {
    getRxStorageLoki
} from 'rxdb-old/plugins/storage-loki'; // <- import from the old RxDB version

await migrateStorage(
    db as any,
    /**
     * Name of the old database,
     * using the storage migration requires that the
     * new database has a different name.
     */
    'myOldDatabaseName',
    getRxStorageLoki(), // RxStorage of the old database
    500, // batch size
    // 
    (input: AfterMigrateBatchHandlerInput) => {
        console.log('storage migration: batch processed');
    }
);
/* ... */
```

## Disable Version Check on [👑 RxDB Premium](/premium)

RxDb Premium has a check in place that ensures that you do not accidentially use the wrong RxDB core and 👑 Premium version together which could break your database state. 
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




``````

# Sharding RxStorage

> Improve RxDB read and write performance by splitting data across multiple storage shards using the sharding RxStorage wrapper plugin.

import {PremiumBlock} from '@site/src/components/premium-block';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_BROWSER_SHARDING_INDEXEDDB, PERFORMANCE_BROWSER_INDEXEDDB } from '@site/src/components/performance-data';

# Sharding RxStorage

With the sharding plugin, you can improve the write and query times of **some** `RxStorage` implementations.
For example on [slow IndexedDB](./slow-indexeddb.md), a performance gain of **30-50% on reads**, and **25% on writes** can be achieved by using multiple IndexedDB Stores instead of putting all documents into the same store.

The sharding plugin works as a wrapper around any other `RxStorage`. The sharding plugin will automatically create multiple shards per storage instance and it will merge and split read and write calls to it.

<PremiumBlock />

## Using the sharding plugin

```ts
import {
    getRxStorageSharding
} from 'rxdb-premium/plugins/storage-sharding';

import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

/**
 * First wrap the original RxStorage with the sharding RxStorage.
 */
const shardedRxStorage = getRxStorageSharding({

    /**
     * Here we use the localStorage RxStorage,
     * it is also possible to use any other RxStorage instead.
     */
    storage: getRxStorageLocalstorage()
});

/**
 * Add the sharding options to your schema.
 * Changing these options will require a data migration.
 */
const mySchema = {
    /* ... */
    sharding: {
        /**
         * Amount of shards per RxStorage instance.
         * Depending on your data size and query patterns, the optimal shard amount may differ.
         * Do a performance test to optimize that value.
         * 10 Shards is a good value to start with.
         * 
         * IMPORTANT: Changing the value of shards is not possible on a already existing database state,
         * you will lose access to  your data.
         */
        shards: 10,
        /**
         * Sharding mode,
         * you can either shard by collection or by database.
         * For most cases you should use 'collection' which will shard on the collection level.
         * For example with the IndexedDB RxStorage, it will then create multiple stores per IndexedDB database
         * and not multiple IndexedDB databases, which would be slower.
         */
        mode: 'collection'
    }
    /* ... */
}

/**
 * Create the RxDatabase with the wrapped RxStorage. 
 */
const database = await createRxDatabase({
    name: 'mydatabase',
    storage: shardedRxStorage
});

```

## Performance

The Sharding RxStorage wrapper can improve performance, especially when using an underlying storage that has bottlenecks with large single stores like IndexedDB. Below is a comparison.

<PerformanceChart
  data={[
    PERFORMANCE_BROWSER_SHARDING_INDEXEDDB,
    PERFORMANCE_BROWSER_INDEXEDDB
  ]}
  title="Sharding vs Normal IndexedDB Performance"
/>

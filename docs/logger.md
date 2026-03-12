# RxDB Logger Plugin - Track & Optimize

> Take control of your RxDatabase logs. Monitor every write, query, or attachment retrieval to swiftly diagnose and fix performance bottlenecks.

# RxDB Logger Plugin

With the logger plugin you can log all operations to the [storage layer](./rx-storage.md) of your [RxDatabase](./rx-database.md).

This is useful to debug performance problems and for monitoring with Application Performance Monitoring (APM) tools like **Bugsnag**, **Datadog**, **Elastic**, **Sentry** and others.

Notice that the logger plugin is not part of the RxDB core, it is part of [RxDB Premium 👑](/premium/).

  

## Using the logger plugin

The logger is a wrapper that can be wrapped around any [RxStorage](./rx-storage.md). Once your storage is wrapped, you can create your database with the wrapped storage and the logging will automatically happen.

```ts

import {
    wrappedLoggerStorage
} from 'rxdb-premium/plugins/logger';
import {
    getRxStorageIndexedDB
} from 'rxdb-premium/plugins/storage-indexeddb';

// wrap a storage with the logger
const loggingStorage = wrappedLoggerStorage({
    storage: getRxStorageIndexedDB({})
});

// create your database with the wrapped storage
const db = await createRxDatabase({
    name: 'mydatabase',
    storage: loggingStorage
});

// create collections etc...
```

## Specify what to be logged

By default, the plugin will log all operations and it will also run a `console.time()/console.timeEnd()` around each operation. You can specify what to log so that your logs are less noisy. For this you provide a settings object when calling `wrappedLoggerStorage()`.

```ts
const loggingStorage = wrappedLoggerStorage({
    storage: getRxStorageIndexedDB({}),
    settings: {
        // can used to prefix all log strings, default=''
        prefix: 'my-prefix',

        /**
         * Be default, all settings are true.
         */

        // if true, it will log timings with console.time() and console.timeEnd()
        times: true,

        // if false, it will not log meta storage instances like used in replication
        metaStorageInstances: true,

        // operations
        bulkWrite: true,
        findDocumentsById: true,
        query: true,
        count: true,
        info: true,
        getAttachmentData: true,
        getChangedDocumentsSince: true,
        cleanup: true,
        close: true,
        remove: true
    }
});
```

## Using custom logging functions

With the logger plugin you can also run custom log functions for all operations.

```ts
const loggingStorage = wrappedLoggerStorage({
    storage: getRxStorageIndexedDB({}),
    onOperationStart: (operationsName, logId, args) => void,
    onOperationEnd: (operationsName, logId, args) => void,
    onOperationError: (operationsName, logId, args, error) => void
});
```

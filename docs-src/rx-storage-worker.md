# Worker RxStorage

With the worker plugin, you can put the `RxStorage` of your database inside of a WebWorker (in browsers) or a Worker Thread (in node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the perceived performance of your application. RxDB uses [threads.js](https://github.com/andywer/threads.js/) to create the Worker process an to communicate with it.

## On the worker process

```ts
// worker.ts

import { wrappedWorkerRxStorage } from 'rxdb/plugins/worker';
import { getRxStorageLoki } from 'rxdb/plugins/lokijs';

wrappedWorkerRxStorage({
    /**
     * You can wrap any implementation of the RxStorage interface
     * into a worker.
     * Here we use the LokiJS RxStorage.
     */
    storage: getRxStorageLoki()
});
```


## On the main process

```ts
import {
    createRxDatabase
} from 'rxdb';
import { getRxStorageWorker } from 'rxdb/plugins/worker';
import { RxStorageLokiStatics } from 'rxdb/plugins/lokijs';


const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        {
            /**
             * The static methods of the RxStorage that is also
             * used inside of the worker process.
             */
            statics: RxStorageLokiStatics,
            /**
             * Contains any value that can be used as parameter
             * to the Worker constructor of thread.js
             * Most likely you want to put the path to the worker.js file in here.
             * 
             * @link https://github.com/andywer/threads.js/
             */
            workerInput: 'path/to/worker.js'
        }
    )
});
```

## Pre-build workers

In the browsers, the `worker.js` must be a self containing JavaScript file that contains all dependencies in a bundle.
To make it easier for you, RxDB ships with [pre-bundles worker files](https://github.com/pubkey/rxdb/tree/master/dist/workers) that are ready to use.
You can copy them to a location where it can be served from the webserver and then use their path to create the `RxDatabase`

```ts
import {
    createRxDatabase
} from 'rxdb';
import { getRxStorageWorker } from 'rxdb/plugins/worker';
import { RxStorageLokiStatics } from 'rxdb/plugins/lokijs';
const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        {
            statics: RxStorageLokiStatics,
            /**
             * Path to where the copied file from node_modules/rxdb/dist/workers
             * is reachable from the webserver.
             */
            workerInput: '/lokijs-incremental-indexeddb.worker.js'
        }
    )
});
```


## One worker per database

Each call to `getRxStorageWorker()` will create a different worker instance so that when you have more then one `RxDatabase`, each database will have its own JavaScript worker process.

To reuse the worker instance in more than one `RxDatabase`, you can store the output of `getRxStorageWorker()` into a variable an use that one. Reusing the worker can decrease the initial page load, but you might get slower database operations.

```ts
// Call getRxStorageWorker() exactly once
const workerStorage = getRxStorageWorker({
    statics: RxStorageLokiStatics,
    workerInput: 'path/to/worker.js'
});

// use the same storage for both databases.
const databaseOne = await createRxDatabase({
    name: 'database-one',
    storage: workerStorage
});
const databaseTwo = await createRxDatabase({
    name: 'database-two',
    storage: workerStorage
});

```




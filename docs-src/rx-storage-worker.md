# Worker RxStorage

With the worker plugin, you can put the `RxStorage` of your database inside of a WebWorker (in browsers) or a Worker Thread (in node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the percieved performance of your application. RxDB uses [threads.js](https://github.com/andywer/threads.js/) to create the Worker process an to communicate with it.

In theory you can put any `RxStorage` implementation into a worker. For now this is only tested with the [LokiJS RxStorage](./rx-storage-lokijs.md).



## On the worker process

```ts
// worker.ts

import { wrappedRxStorage } from 'rxdb/plugins/worker';
import { getRxStorageLoki } from 'rxdb/plugins/lokijs';

wrappedRxStorage(
    /**
     * You can wrap any implementation of the RxStorage interface
     * into a worker.
     * Here we use the LokiJS RxStorage.
     */
    storage: getRxStorageLoki()
);
```


## On the main process

```ts
import {
    createRxDatabase
} from 'rxdb/plugins/core';
import { getRxStorageWorker } from 'rxdb/plugins/worker';
import { RxStorageLokiStatics } from 'rxdb/plugins/lokijs';


const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        /**
         * The static methods of the RxStorage that is also
         * used inside of the worker process.
         */
        RxStorageLokiStatics,
        {
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



--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./replication-couchdb.md)

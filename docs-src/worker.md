# Worker

With the worker plugin, you can put the `RxStorage` of your database inside of a WebWorker (in browsers) or a Worker Thread (in node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the percieved performance of your application.



## On the worker process

```ts
import { getRxStorageLoki } from 'rxdb/plugins/lokijs';
import { wrappedRxStorage } from 'rxdb/plugins/worker';

const storage = getRxStorageLoki();
wrappedRxStorage(
    storage
);
```


## On the main process

```ts
import {
    createRxDatabase
} from 'rxdb/plugins/core';
import { getRxStorageWorker } from 'rxdb/plugins/worker';
import { getRxStorageLoki } from 'rxdb/plugins/lokijs';


const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        getRxStorageLoki(),
        {

            workerInput: 'path/to/worker.js'
        }
    )
});
```

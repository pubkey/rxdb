---
title: Turbocharge RxDB with Worker RxStorage
slug: rx-storage-worker.html
description: Offload RxDB queries to WebWorkers or Worker Threads, freeing the main thread and boosting performance. Experience smoother apps with Worker RxStorage.
image: /headers/rx-storage-worker.jpg
---

# Worker RxStorage

With the worker plugin, you can put the [RxStorage](./rx-storage.md) of your database inside of a WebWorker (in browsers) or a Worker Thread (in node.js). By doing so, you can take CPU load from the main process and move it into the worker's process which can improve the perceived performance of your application. Notice that for browsers, it is recommended to use the [SharedWorker](./rx-storage-shared-worker.md) instead to get a better performance.

:::note Premium
This plugin is part of [RxDB Premium 👑](/premium/). It is not part of the default RxDB module.
:::

## On the worker process

```ts
// worker.ts

import { exposeWorkerRxStorage } from 'rxdb-premium/plugins/storage-worker';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

exposeWorkerRxStorage({
    /**
     * You can wrap any implementation of the RxStorage interface
     * into a worker.
     * Here we use the IndexedDB RxStorage.
     */
    storage: getRxStorageIndexedDB()
});
```


## On the main process

```ts
import {
    createRxDatabase
} from 'rxdb';
import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        {
            /**
             * Contains any value that can be used as parameter
             * to the Worker constructor of thread.js
             * Most likely you want to put the path to the worker.js file in here.
             * 
             * @link https://developer.mozilla.org/en-US/docs/Web/API/Worker/Worker
             */
            workerInput: 'path/to/worker.js',
            /**
             * (Optional) options
             * for the worker.
             */
            workerOptions: {
                type: 'module',
                credentials: 'omit'
            }
        }
    )
});
```

## Pre-build workers

The `worker.js` must be a self containing JavaScript file that contains all dependencies in a bundle.
To make it easier for you, RxDB ships with pre-bundles worker files that are ready to use.
You can find them in the folder `node_modules/rxdb-premium/dist/workers` after you have installed the [RxDB Premium 👑 Plugin](/premium/). From there you can copy them to a location where it can be served from the webserver and then use their path to create the `RxDatabase`.

Any valid `worker.js` JavaScript file can be used both, for normal Workers and SharedWorkers.


```ts
import {
    createRxDatabase
} from 'rxdb';
import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';
const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageWorker(
        {
            /**
             * Path to where the copied file from node_modules/rxdb/dist/workers
             * is reachable from the webserver.
             */
            workerInput: '/indexeddb.worker.js'
        }
    )
});
```

## Building a custom worker

The easiest way to bundle a custom `worker.js` file is by using webpack. Here is the webpack-config that is also used for the prebuild workers:

```ts
// webpack.config.js
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const projectRootPath = path.resolve(
    __dirname,
    '../../' // path from webpack-config to the root folder of the repo
);
const babelConfig = require(path.join(projectRootPath, 'babel.config'));
const baseDir = './dist/workers/'; // output path
module.exports = {
    target: 'webworker',
    entry: {
        'my-custom-worker': baseDir + 'my-custom-worker.js',
    },
    output: {
        filename: '[name].js',
        clean: true,
        path: path.resolve(
            projectRootPath,
            'dist/workers'
        ),
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader',
                    options: babelConfig
                }
            }
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.mjs', '.mts']
    },
    optimization: {
        moduleIds: 'deterministic',
        minimize: true,
        minimizer: [new TerserPlugin({
            terserOptions: {
                format: {
                    comments: false,
                },
            },
            extractComments: false,
        })],
    }
};
```

## One worker per database

Each call to `getRxStorageWorker()` will create a different worker instance so that when you have more than one `RxDatabase`, each database will have its own JavaScript worker process.

To reuse the worker instance in more than one `RxDatabase`, you can store the output of `getRxStorageWorker()` into a variable and use that one. Reusing the worker can decrease the initial page load, but you might get slower database operations.

```ts
// Call getRxStorageWorker() exactly once
const workerStorage = getRxStorageWorker({
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


## Passing in a Worker instance

Instead of setting an url as `workerInput`, you can also specify a function that returns a new `Worker` instance when called.

```ts
getRxStorageWorker({
    workerInput: () => new Worker('path/to/worker.js')
})
```

This can be helpful for environments where the worker is build dynamically by the bundler. For example in angular you would create a `my-custom.worker.ts` file that contains a custom build worker and then import it. 

```ts
const storage = getRxStorageWorker({
    workerInput: () => new Worker(new URL('./my-custom.worker', import.meta.url)),
});
```

```ts
//> my-custom.worker.ts
import { exposeWorkerRxStorage } from 'rxdb-premium/plugins/storage-worker';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

exposeWorkerRxStorage({
    storage: getRxStorageIndexedDB()
});
```

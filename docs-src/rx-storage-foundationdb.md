# RxStorage FoundationDB (beta)

To use RxDB on the server side, the [FoundationDB](https://www.foundationdb.org/) [RxStorage](./rx-storage.md) provides a way of having a secure, fault-tolerant and performant storage.

## Installation

- Install the [FoundationDB client cli](https://apple.github.io/foundationdb/getting-started-linux.html) which is used to communicate with the FoundationDB cluster.
- Install the [FoundationDB node bindings npm module](https://www.npmjs.com/package/foundationdb) via `npm install foundationdb --save`. If the latest version does not work for you, you should use the same version as stated in the `storage-foundationdb` job of the RxDB CI `main.yml`.


## Usage

```typescript
import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageFoundationDB
} from 'rxdb/plugins/storage-foundationdb';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageFoundationDB({
        /**
         * Version of the API of the FoundationDB cluster..
         * FoundationDB is backwards compatible across a wide range of versions,
         * so you have to specify the api version.
         * If in doubt, set it to 620.
         */
        apiVersion: 620,
        /**
         * Path to the FoundationDB cluster file.
         * (optional)
         * If in doubt, leave this empty to use the default location.
         */
        clusterFile: '/path/to/fdb.cluster',
        /**
         * Amount of documents to be fetched in batch requests.
         * You can change this to improve performance depending on
         * your database access patterns.
         * (optional)
         * [default=50]
         */
        batchSize: 50
    })
});
```

## Multi Instance

Because FoundationDB does not offer a [changestream](https://forums.foundationdb.org/t/streaming-data-out-of-foundationdb/683/2), it is not possible to use the same cluster from more then one Node.js process at the same time. For example you cannot spin up multiple servers with RxDB databases that all use the same cluster. There might be workarounds to create something like a FoundationDB changestream and you can make a Pull Request if you need that feature.

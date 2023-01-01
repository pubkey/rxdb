# RxStorage Localstorage Meta Optimizer

The [RxStorage](./rx-storage.md) Localstorage Meta Optimizer is a wrapper around any other RxStorage. The wrapper uses the original RxStorage for normal collection documents. But to optimize the initial page load time, it uses [localstorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage?retiredLocale=de) to store the plain key-value metadata that RxDB needs to create databases and collections. This plugin can only be used in browsers.

Depending on your database usage and the collection amount, this can save about 200 milliseconds on the initial pageload. It is recommended to use this when you create more then 4 RxCollections.

**NOTICE:** This plugin is part of [RxDB premium](https://rxdb.info/premium.html). It is not part of the default RxDB module.

## Usage

The meta optimizer gets wrapped around any other RxStorage. It will then automatically detect if an RxDB internal storage instance is created, and replace that with a localstorage based instance.

```ts
import {
    getLocalstorageMetaOptimizerRxStorage
} from 'rxdb-premium/plugins/localstorage-meta-optimizer';

import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';


/**
 * First wrap the original RxStorage with the optimizer.
 */
const optimizedRxStorage = getLocalstorageMetaOptimizerRxStorage({

    /**
     * Here we use the dexie.js RxStorage,
     * it is also possible to use any other RxStorage instead.
     */
    storage: getRxStorageDexie()
});

/**
 * Create the RxDatabase with the wrapped RxStorage. 
 */
const database = await createRxDatabase({
    name: 'mydatabase',
    storage: optimizedRxStorage
});

```

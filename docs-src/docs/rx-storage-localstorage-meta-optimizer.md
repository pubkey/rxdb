---
title: Fastest RxDB Starts - Localstorage Meta Optimizer
slug: rx-storage-localstorage-meta-optimizer.html
description: Wrap any RxStorage with localStorage metadata to slash initial load by up to 200ms. Unlock speed with this must-have RxDB Premium plugin.
image: /headers/rx-storage-localstorage-meta-optimizer.jpg
---

# RxStorage Localstorage Meta Optimizer

The [RxStorage](./rx-storage.md) Localstorage Meta Optimizer is a wrapper around any other RxStorage. The wrapper uses the original RxStorage for normal collection documents. But to optimize the initial page load time, it uses [localstorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage?retiredLocale=de) to store the plain key-value metadata that RxDB needs to create databases and collections. This plugin can only be used in browsers.

Depending on your database usage and the collection amount, this can save about 200 milliseconds on the initial pageload. It is recommended to use this when you create more than 4 [RxCollections](./rx-collection.md).

:::note Premium
This plugin is part of [RxDB Premium 👑](/premium/). It is not part of the default RxDB module.
:::

## Usage

The meta optimizer gets wrapped around any other RxStorage. It will than automatically detect if an RxDB internal storage instance is created, and replace that with a [localstorage](./articles/localstorage.md) based instance.

```ts
import {
    getLocalstorageMetaOptimizerRxStorage
} from 'rxdb-premium/plugins/storage-localstorage-meta-optimizer';

import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';


/**
 * First wrap the original RxStorage with the optimizer.
 */
const optimizedRxStorage = getLocalstorageMetaOptimizerRxStorage({

    /**
     * Here we use the IndexedDB RxStorage,
     * it is also possible to use any other RxStorage instead.
     */
    storage: getRxStorageIndexedDB()
});

/**
 * Create the RxDatabase with the wrapped RxStorage. 
 */
const database = await createRxDatabase({
    name: 'mydatabase',
    storage: optimizedRxStorage
});

```

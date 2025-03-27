---
title: RxDB LocalStorage - The Easiest Way to Persist Data in Your Web App
slug: rx-storage-localstorage.html
description: Discover how to quickly set up RxDB's LocalStorage-based storage as the recommended default. Learn its benefits, limitations, and why it’s perfect for demos, prototypes, and lightweight applications.
---

import {Steps} from '@site/src/components/steps';

# RxStorage LocalStorage

RxDB can persist data in various ways. One of the simplest methods is using the browser’s built-in [LocalStorage](./articles/localstorage.md). This storage engine allows you to store and retrieve RxDB documents directly from the browser without needing additional plugins or libraries.

> **Recommended Default for using RxDB in the Browser**
>
> We highly recommend using LocalStorage for a quick and easy RxDB setup, especially when you want a minimal project configuration. For professional projects, the [IndexedDB RxStorage](./rx-storage-indexeddb.md) is recommended in most cases.


## Key Benefits

1. **Simplicity**: No complicated configurations or external dependencies - LocalStorage is already built into the browser.
2. **Fast for small Datasets**: Writing and Reading small sets of data from localStorage is really fast as shown in [these benchmarks](./articles/localstorage-indexeddb-cookies-opfs-sqlite-wasm.md#performance-comparison).
4.  **Ease of Setup**: Just import the plugin, import it, and pass `getRxStorageLocalstorage()` into `createRxDatabase()`. That’s it!

## Limitations

While LocalStorage is the easiest way to get started, it does come with some constraints:

1. **Limited Storage Capacity**: Browsers often limit LocalStorage to around [5 MB per domain](./articles/localstorage.md#understanding-the-limitations-of-local-storage), though exact limits vary.
2. **Synchronous Access**: LocalStorage operations block the main thread. This is usually fine for small amounts of data but can cause performance bottlenecks with heavier use.

Despite these limitations, LocalStorage remains a great default option for smaller projects, prototypes, or cases where you need the absolute simplest way to persist data in the browser.

## How to use the LocalStorage RxStorage with RxDB

<Steps>

### Import the Storage
```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
```

### Create a Database
```ts
const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageLocalstorage()
});
```

### Add a Collection

```ts
await db.addCollections({
  tasks: {
    schema: {
      title: 'tasks schema',
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        done: { type: 'boolean' }
      },
      required: ['id', 'title', 'done']
    }
  }
});
```

### Insert a document

```ts
await db.tasks.insert({ id: 'task-01', title: 'Get started with RxDB' });
```

### Query documents
```ts
const nonDoneTasks = await db.tasks.find({
    selector: {
        done: {
            $eq: false
        }
    }
}).exec();
```

</Steps>



## Mocking the LocalStorage API for testing in Node.js

While the `localStorage` API only exists in browsers, your can the LocalStorage based storage in Node.js by using the mock that comes with RxDB.
This is intended to be used in unit tests or other test suites:

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import {
    getRxStorageLocalstorage,
    getLocalStorageMock
} from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageLocalstorage({
        localStorage: getLocalStorageMock()
    })
});

```

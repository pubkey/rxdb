---
title: Expo Filesystem RxStorage for React Native
slug: rx-storage-expo-filesystem.html
description: A high-performance RxStorage for React Native and Expo apps based on the expo-opfs library.
image: /headers/rx-storage-expo-filesystem.jpg
---

import PerformanceNode from '@site/src/components/performance-node';

# Expo Filesystem RxStorage

:::note Beta Status
This RxStorage is currently in **beta**.
:::

The Expo Filesystem [RxStorage](./rx-storage.md) for RxDB is built on top of the [expo-opfs](https://www.npmjs.com/package/expo-opfs) library, bringing blazing-fast Origin Private File System (OPFS) capabilities to React Native and Expo applications.
It stores data in plain files and achieves vastly superior performance compared to traditional React Native storage solutions like Async Storage or SQLite.

### Pros

- **Extreme Performance**: Significantly faster than SQLite and Async Storage in React Native.
- **Easy Integration**: Drops right into any Expo or React Native project.
- Uses native C++ JSI bindings via `expo-opfs` for minimal bridging overhead.

### Cons

- It is part of the [RxDB Premium 👑](/premium/) plugin that must be purchased.

<PerformanceNode />

## Installation

First, you need to install the `expo-opfs` dependency:

```bash
npx expo install expo-opfs
```

## Usage

You can import either the **Asynchronous** or **Synchronous** storage from the `rxdb-premium` package.

### Asynchronous API

For standard usage in React Native and Expo, use the asynchronous storage plugin:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageExpoAsync } from 'rxdb-premium/plugins/storage-filesystem-expo';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageExpoAsync(),
    multiInstance: false // Usually false in React Native as there is only one JavaScript process
});
/* ... */
```

### Synchronous API

If your React Native architecture (such as custom worklets or specific background threads) allows synchronous file operations, you can use the sync version for maximum performance:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageExpoSync } from 'rxdb-premium/plugins/storage-filesystem-expo';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageExpoSync(),
    multiInstance: false
});
/* ... */
```

## Performance

Because `expo-opfs` bypasses the standard React Native bridge and utilizes direct JSI bindings to access file handlers, operations like inserting large batches of documents or executing complex queries are handled with minimal overhead. This makes it one of the absolute fastest local storage engines available for React Native.

Here is a performance comparison of the **Expo Filesystem RxStorage** compared to the **SQLite RxStorage** (using `expo-sqlite`), tested with RxDB's internal performance testing suite (3000 documents, 4 collections):

| Operation (Time in ms) | OPFS Sync (Worker) | OPFS Async (Main Thread) | SQLite (expo-sqlite) |
| --- | --- | --- | --- |
| **Time to first insert** | 123.36 | 89.15 | 177.45 |
| **Insert 500 documents** | 113.02 | 117.00 | 66.64 |
| **Find by IDs (3000)** | 342.30 | 320.83 | 252.21 |
| **Serial inserts (50)** | 36.05 | 108.13 | 483.93 |
| **Serial find by ID (50)** | 33.79 | 27.29 | 162.33 |
| **Find by query** | 301.47 | 307.27 | 100.18 |
| **Find by query (Parallel 4)** | 311.11 | 306.73 | 176.99 |
| **4x count** | 5.23 | 8.21 | 29.19 |
| **Property access** | 78.18 | 84.04 | 95.13 |

As you can see, the **Expo Filesystem RxStorage** significantly outperforms SQLite in many critical areas, particularly in serial operations, counting, and initial setup time, making it exceptionally well-suited for high-performance React Native applications.

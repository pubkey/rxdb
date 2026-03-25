---
title: Expo Filesystem RxStorage for React Native
slug: rx-storage-filesystem-expo.html
description: A high-performance RxStorage for React Native and Expo apps based on the expo-opfs library.
image: /headers/rx-storage-filesystem-expo.jpg
---

import {BetaBlock} from '@site/src/components/beta-block';
import {PremiumBlock} from '@site/src/components/premium-block';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_EXPO, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

# Expo Filesystem RxStorage

<BetaBlock since="17.0.0" />

The Expo Filesystem [RxStorage](./rx-storage.md) for RxDB is built on top of the [expo-opfs](https://www.npmjs.com/package/expo-opfs) library, bringing blazing-fast Origin Private File System (OPFS) capabilities to React Native and Expo applications.
It stores data in plain files and achieves vastly superior performance compared to traditional React Native storage solutions like Async Storage or SQLite.

### Pros

- **Extreme Performance**: Significantly faster than SQLite and Async Storage in React Native.
- **Easy Integration**: Drops right into any Expo or React Native project.
- Uses native C++ JSI bindings via `expo-opfs` for minimal bridging overhead.

<PremiumBlock />

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

<PerformanceChart title="Expo Storages" data={PERFORMANCE_DATA_EXPO} metrics={PERFORMANCE_METRICS} />

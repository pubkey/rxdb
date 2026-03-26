# Expo Filesystem RxStorage for React Native

> A high-performance RxStorage for React Native and Expo apps based on the expo-file-system library.

import {BetaBlock} from '@site/src/components/beta-block';
import {PremiumBlock} from '@site/src/components/premium-block';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_EXPO, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

# Expo Filesystem RxStorage

<BetaBlock since="17.0.0" />

The Expo Filesystem [RxStorage](./rx-storage.md) for RxDB is built on top of the [expo-file-system](https://docs.expo.dev/versions/latest/sdk/filesystem/) library, bringing blazing-fast direct filesystem capabilities to React Native and Expo applications.
It stores data in plain files and achieves vastly superior performance compared to traditional React Native storage solutions like Async Storage or SQLite.

### Pros

- **Extreme Performance**: Significantly faster than SQLite and Async Storage in React Native.
- **Easy Integration**: Drops right into any Expo or React Native project.
- Directly utilizes the Expo FileSystem for minimum overhead without relying on an intermediate database engine.

<PremiumBlock />

## Installation

> **Note:** This storage plugin requires at least **Expo SDK 54** or the equivalent React Native `expo-file-system` version to function.

First, you need to install the `expo-file-system` dependency:

```bash
npx expo install expo-file-system
```

## Usage

You can import either the **Asynchronous** or **Synchronous** storage from the `rxdb-premium` package.

### Asynchronous API

For standard usage in React Native and Expo, use the asynchronous storage plugin:

```ts
import { createRxDatabase } from 'rxdb';
import {
    getRxStorageExpoAsync
} from 'rxdb-premium/plugins/storage-filesystem-expo';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageExpoAsync(),
    // Usually false in React Native as there is only one JavaScript process
    multiInstance: false
});
/* ... */
```

### Synchronous API

Because the expo filesystem also has a sync API, you can utilize that which has faster writes but slower reads.

```ts
import { createRxDatabase } from 'rxdb';
import {
    getRxStorageExpoSync
} from 'rxdb-premium/plugins/storage-filesystem-expo';

const myRxDatabase = await createRxDatabase({
    name: 'exampledb',
    storage: getRxStorageExpoSync(),
    multiInstance: false
});
/* ... */
```

## How it works (vs. SQLite)

When using SQLite in React Native, every read and write operation has to go through multiple stages: the JavaScript query must be sent to the native side, translated into a SQL string, parsed and planned by the SQLite engine, and then finally executed on disk. For data retrieval, the SQLite rows must then be mapped back into JavaScript objects. This overhead can be significant, especially when handling many operations or large batches of documents.

In contrast, the **Expo Filesystem RxStorage** skips the relational SQL database engine entirely and instead runs on RxDB's own highly-optimized NoSQL storage engine. While document data is efficiently stored via raw file read and write operations using `expo-file-system`, the storage maintains proper indexing and an advanced query engine directly in JavaScript. Because there is no SQL parsing, complex native query planning, or relational mapping involved, this makes reading, writing, and querying data significantly faster. It operates closer to the hardware and handles bulk document serialization dynamically using highly optimized UTF-8 decoding.

## Performance of Expo Filesystem vs SQLite

Because of this streamlined, direct-to-filesystem approach, operations like inserting large batches of documents or executing complex queries are handled with minimal overhead. This makes it one of the absolute fastest local storage engines available for React Native.

Here is a performance comparison of the **Expo Filesystem RxStorage** compared to the **SQLite RxStorage** (using `expo-sqlite`), tested with RxDB's internal performance testing suite (3000 documents, 4 collections):

<PerformanceChart title="Expo Storages" data={PERFORMANCE_DATA_EXPO} metrics={PERFORMANCE_METRICS} />

## Using with Plain React Native (Bare Workflow)

You can also use this storage in a plain React Native project that does not use the Expo framework. To use Expo modules in a bare React Native app, you must first install the `expo` package to provide the underlying infrastructure:

```bash
npx install-expo-modules@latest
npx expo install expo-file-system
```

*(Note for iOS: You may need to run `npx pod-install` after installation so the native dependencies are linked correctly)*

### Permissions

The `expo-file-system` module requires certain permissions on Android to interact with the filesystem. 

**For Expo Projects:**
Installing the module will automatically add the required permissions during the build process. You do not need to configure these manually.

**For Plain React Native (Bare Workflow) Projects:**
You must manually add the following permissions to your `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.INTERNET" />
```

On iOS, no additional permissions or setup are necessary for standard filesystem access.

## FAQ

<details>
<summary>Why is SQLite slow in React-Native?</summary>

In React Native, SQLite suffers from translation overhead. Every operation requires sending JavaScript queries to the native side, translating them into SQL statements, running the native query planner, and mapping the relational rows back into JavaScript objects. For bulk operations, this parsing and mapping causes noticeable performance degradation.

</details>

<details>
<summary>Which database works best with React Native/Expo for performance?</summary>

A NoSQL document store that avoids relational SQL overhead provides the fastest performance. RxDB paired with the Expo Filesystem RxStorage skips the SQLite engine entirely. It stores documents directly as plain JSON text appended to files, resulting in superior read and write speeds.

</details>

<details>
<summary>How can I optimize database queries in React Native?</summary>

You can optimize queries by using proper indexing to prevent full database scans. Switching from a relational SQL database to a local-first NoSQL database that queries directly against raw file data removes the translation steps between JavaScript objects and the storage layer, reducing query resolution times.

</details>

<details>
<summary>How do I handle large datasets efficiently in React-Native?</summary>

You should use a storage engine that supports fast bulk writes. The Expo Filesystem RxStorage manages large batches of documents by serializing them dynamically using highly optimized UTF-8 decoding, writing the entire batch directly to the filesystem in one continuous operation rather than parsing individual SQL insert statements.

</details>

<details>
<summary>How to improve performance with offline caching in React Native?</summary>

Use an offline-first database like RxDB to maintain a persistent local replica of your data on the device filesystem. Read operations resolve instantly from the local cache, while background replication synchronizes data modifications with your remote server asynchronously.

</details>

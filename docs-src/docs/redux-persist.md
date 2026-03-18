---
title: Redux-Persist
slug: redux-persist.html
description: Persist Redux state into RxDB with the redux-persist plugin. Works with any RxDB storage backend and supports offline-first applications.
---

# Redux-Persist

The RxDB redux-persist plugin provides a [redux-persist](https://github.com/rt2zz/redux-persist) compatible storage engine backed by an [RxCollection](./rx-collection.md). This lets you persist your Redux store state into RxDB, so your application benefits from RxDB's storage flexibility, offline-first support, and multi-tab capabilities.

## Installation

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBReduxPersistPlugin } from 'rxdb/plugins/redux-persist';
addRxPlugin(RxDBReduxPersistPlugin);
```

## Setup

The plugin stores Redux state as key-value pairs in a given RxCollection. You need to create a collection with the correct schema, then pass it to `getRxStorageReduxPersist()`.

### 1. Create the collection

Use the provided `REDUX_PERSIST_SCHEMA` or define your own schema with a `key` (string, primaryKey) and `value` (string) field.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { REDUX_PERSIST_SCHEMA } from 'rxdb/plugins/redux-persist';

const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageMemory()
});

await db.addCollections({
    reduxstate: {
        schema: REDUX_PERSIST_SCHEMA
    }
});
```

### 2. Create the storage engine

```ts
import { getRxStorageReduxPersist } from 'rxdb/plugins/redux-persist';

const reduxPersistStorage = getRxStorageReduxPersist(db.reduxstate);
```

### 3. Configure redux-persist

```ts
import { createStore } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';

const persistConfig = {
    key: 'root',
    storage: reduxPersistStorage
};

const persistedReducer = persistReducer(persistConfig, rootReducer);
const store = createStore(persistedReducer);
const persistor = persistStore(store);
```

## Using a custom schema

You can define your own collection schema instead of using `REDUX_PERSIST_SCHEMA`. The only requirements are:
- A `key` field of type `string` set as the `primaryKey`
- A `value` field of type `string`

```ts
const customSchema = {
    version: 0,
    primaryKey: 'key',
    type: 'object',
    properties: {
        key: {
            type: 'string',
            maxLength: 512  // increase if your persist keys are long
        },
        value: {
            type: 'string'
        }
    },
    required: ['key', 'value']
};

await db.addCollections({
    reduxstate: { schema: customSchema }
});
```

## Using a different storage backend

Because the plugin operates on an RxCollection, you get automatic support for any [RxStorage](./rx-storage.md) backend. Switching from in-memory to IndexedDB, SQLite, or any other storage requires no changes to the redux-persist configuration.

```ts
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage()
});
```

## API

### getRxStorageReduxPersist()

```ts
function getRxStorageReduxPersist(
    collection: RxCollection<ReduxPersistDocType>
): RxDBReduxPersistStorage;
```

Takes an [RxCollection](./rx-collection.md) and returns a storage object with `getItem()`, `setItem()`, and `removeItem()` methods compatible with redux-persist.

### REDUX_PERSIST_SCHEMA

A ready-to-use [RxJsonSchema](./rx-schema.md) for the key-value collection used by the plugin.

### RxDBReduxPersistStorage

```ts
type RxDBReduxPersistStorage = {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
};
```

### ReduxPersistDocType

```ts
type ReduxPersistDocType = {
    key: string;
    value: string;
};
```

## Full example

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { addRxPlugin } from 'rxdb';
import {
    RxDBReduxPersistPlugin,
    getRxStorageReduxPersist,
    REDUX_PERSIST_SCHEMA
} from 'rxdb/plugins/redux-persist';
import { createStore } from 'redux';
import { persistStore, persistReducer } from 'redux-persist';

addRxPlugin(RxDBReduxPersistPlugin);

// Create database and collection
const db = await createRxDatabase({
    name: 'myapp',
    storage: getRxStorageLocalstorage()
});
await db.addCollections({
    reduxstate: { schema: REDUX_PERSIST_SCHEMA }
});

// Create the redux-persist storage engine
const storage = getRxStorageReduxPersist(db.reduxstate);

// Set up Redux with persistence
const persistConfig = { key: 'root', storage };
const persistedReducer = persistReducer(persistConfig, rootReducer);
const store = createStore(persistedReducer);
const persistor = persistStore(store);
```

---
title: Installation
slug: install.html
description: Learn how to install RxDB via npm, configure polyfills, and fix global variable errors in Angular or Webpack for a seamless setup.
image: /headers/install.jpg
---

import {InstallTabs} from '@site/src/components/install-tabs';

# Install RxDB

## npm

To install the latest release of `rxdb` and its dependencies and save it to your `package.json`, run:

<InstallTabs packageName="rxdb" />

## peer-dependency

You also need to install the peer-dependency `rxjs` if you have not installed it before.

<InstallTabs packageName="rxjs" />

## polyfills

RxDB is coded with ES8 and transpiled to ES5. This means you have to install [polyfills](https://developer.mozilla.org/en-US/docs/Glossary/Polyfill) to support older browsers. For example you can use [core-js](https://github.com/zloirock/core-js) with:

```bash
npm i core-js --save
```

If you need polyfills, you have to import them in your code.

```typescript
import 'core-js/stable';
```

## Polyfill the `global` variable

When you use RxDB with [Angular](./articles/angular-database.md) or other **Webpack** based frameworks, you might get the error `Uncaught ReferenceError: global is not defined`.
This is because some dependencies of RxDB assume a Node.js-specific `global` variable that is not added to browser runtimes by some bundlers.
You have to add them manually, like we do [here](https://github.com/pubkey/rxdb/blob/master/examples/angular/src/polyfills.ts).

```ts
(window as any).global = window;
(window as any).process = {
    env: { DEBUG: undefined },
};
```

## Project Setup and Configuration

In the [examples](https://github.com/pubkey/rxdb/tree/master/examples) folder you can find CI tested projects for different frameworks and use cases, while in the [/config](https://github.com/pubkey/rxdb/tree/master/config) folder base configuration files for Webpack, Rollup, Mocha, Karma, TypeScript are exposed.

Consult [package.json](https://github.com/pubkey/rxdb/blob/master/package.json) for the versions of the packages supported.

## Installing the latest RxDB build

If you need the latest development state of RxDB, add it as git dependency into your `package.json`.

```json
  "dependencies": {
      "rxdb": "git+https://git@github.com/pubkey/rxdb.git#commitHash"
  }
```

Replace `commitHash` with the hash of the latest [build-commit](https://github.com/pubkey/rxdb/search?q=build&type=Commits).

## Import

To import `rxdb`, add this to your JavaScript file to import the default bundle that contains the RxDB core:

```typescript
import {
  createRxDatabase,       // ./rx-database.md
  /* ... */
} from 'rxdb';
```

## Import Reference

RxDB has three kinds of import paths:

- `rxdb` (or `rxdb/plugins/core`): the core functions and all TypeScript types.
- `rxdb/plugins/<name>`: the open-source plugins.
- `rxdb-premium/plugins/<name>`: the [premium plugins 👑](/premium/).

### Core Functions

```ts
import {
    createRxDatabase,
    addRxPlugin,
    removeRxDatabase,
    isRxDatabase,
    isRxCollection,
    isRxDocument,
    isRxQuery,
    toTypedRxJsonSchema
} from 'rxdb';
```

### TypeScript Types

All types are exported from `rxdb`. Use `import type` so that they do not end up in your bundle.

```ts
import type {
    RxDatabase,
    RxCollection,
    RxDocument,
    RxQuery,
    RxJsonSchema,
    RxStorage,
    RxConflictHandler,
    ExtractDocumentTypeFromTypedRxJsonSchema,
    ReplicationPullHandler,
    ReplicationPushHandler
} from 'rxdb';
```

How to combine these types is shown in the [TypeScript tutorial](./tutorials/typescript.md).

### Storages

| Storage | Import |
| --- | --- |
| [Memory](./rx-storage-memory.md) | `import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';` |
| [LocalStorage](./rx-storage-localstorage.md) | `import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';` |
| [Dexie.js](./rx-storage-dexie.md) | `import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';` |
| [SQLite Trial](./rx-storage-sqlite.md) | `import { getRxStorageSQLiteTrial } from 'rxdb/plugins/storage-sqlite';` |
| [MongoDB](./rx-storage-mongodb.md) | `import { getRxStorageMongoDB } from 'rxdb/plugins/storage-mongodb';` |
| [DenoKV](./rx-storage-denokv.md) | `import { getRxStorageDenoKV } from 'rxdb/plugins/storage-denokv';` |
| [FoundationDB](./rx-storage-foundationdb.md) | `import { getRxStorageFoundationDB } from 'rxdb/plugins/storage-foundationdb';` |
| [Remote](./rx-storage-remote.md) | `import { getRxStorageRemote } from 'rxdb/plugins/storage-remote';` |
| [Electron IpcRenderer](./electron.md) | `import { getRxStorageIpcRenderer } from 'rxdb/plugins/electron';` |
| [IndexedDB 👑](./rx-storage-indexeddb.md) | `import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';` |
| [OPFS 👑](./rx-storage-opfs.md) | `import { getRxStorageOPFS, getRxStorageOPFSMainThread } from 'rxdb-premium/plugins/storage-opfs';` |
| [SQLite 👑](./rx-storage-sqlite.md) | `import { getRxStorageSQLite } from 'rxdb-premium/plugins/storage-sqlite';` |
| [Expo Filesystem 👑](./rx-storage-filesystem-expo.md) | `import { getRxStorageExpoAsync } from 'rxdb-premium/plugins/storage-filesystem-expo';` |
| [Node.js Filesystem 👑](./rx-storage-filesystem-node.md) | `import { getRxStorageFilesystemNode } from 'rxdb-premium/plugins/storage-filesystem-node';` |
| [Worker 👑](./rx-storage-worker.md) | `import { getRxStorageWorker } from 'rxdb-premium/plugins/storage-worker';` |
| [SharedWorker 👑](./rx-storage-shared-worker.md) | `import { getRxStorageSharedWorker } from 'rxdb-premium/plugins/storage-worker';` |
| [Sharding 👑](./rx-storage-sharding.md) | `import { getRxStorageSharding } from 'rxdb-premium/plugins/storage-sharding';` |

For unit tests, use the [Memory RxStorage](./rx-storage-memory.md). It needs no setup and all data is gone when the process ends. When your tests need a fresh database per test, give each database a random name with `randomToken()` from `rxdb`. More testing patterns are on the [testing page](./testing.md).

### Common Plugins

```ts
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
import { RxDBLocalDocumentsPlugin } from 'rxdb/plugins/local-documents';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBAttachmentsPlugin } from 'rxdb/plugins/attachments';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';
import { replicateRxCollection, RxReplicationState } from 'rxdb/plugins/replication';
```

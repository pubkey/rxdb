---
title: RxDB - Local Ionic Storage with Encryption, Compression & Sync
slug: ionic-storage.html
description: The best Ionic storage solution? RxDB empowers your hybrid apps with offline-first capabilities, secure encryption, data compression, and seamless data syncing to any backend.
image: /headers/ionic-storage.jpg
---


# RxDB - Local Ionic Storage with Encryption, Compression & Sync


When building **Ionic** apps, developers face the challenge of choosing a robust **Ionic storage** mechanism that supports:
- **Offline-First** usage
- **Data Encryption** to protect sensitive content
- **Compression** to reduce storage usage and improve performance
- **Seamless Sync** with any backend for real-time updates

[RxDB](https://rxdb.info/) (Reactive Database) offers all these features in a single, [local-first](./local-first-future.md) database solution tailored to **Ionic** and other hybrid frameworks. Keep reading to learn how RxDB solves the most common storage pitfalls in hybrid app development while providing unmatched flexibility.

<br />
<center>
    <a href="https://rxdb.info/">
        <img src="../files/icons/ionic.svg" alt="Ionic Database Storage" width="120" />
    </a>
</center>
<br />

## Why RxDB for Ionic Storage?

### 1. Offline-Ready NoSQL Storage
[Offline functionality](../offline-first.md) is crucial for modern mobile applications, particularly when devices encounter unreliable or slow networks. RxDB stores all data **locally** so your Ionic app can run seamlessly without needing a continuous internet connection. When a network is available again, RxDB automatically synchronizes changes with your backend - no extra code required.

### 2. Powerful Encryption
Securing on-device data is paramount when handling sensitive information. RxDB includes [encryption plugins](../encryption.html) that let you:
- **Encrypt** data fields at rest with AES
- Invalidate data access by simply withholding the password
- Keep your users' data confidential, even if the device is stolen

This built-in encryption sets RxDB apart from many other Ionic storage options that lack integrated security.

### 3. Built-In Data Compression
Large or repetitive data can significantly slow down devices with minimal memory. RxDB's [key-compression](../key-compression.md) feature decreases document size stored on the device, improving overall performance by:
- Reducing disk usage
- Accelerating queries
- Minimizing network overhead when syncing

### 4. Real-Time Sync & Conflict Handling
In addition to functioning fully offline, RxDB supports advanced [replication](../replication.md) options. Your Ionic app can instantly sync updates with any backend ([CouchDB](../replication-couchdb.md), [Firestore](../replication-firestore.md), [GraphQL](../replication-graphql.md), or [custom REST](../replication-http.md)), maintaining a [real-time](./realtime-database.md) user experience. Plus, RxDB handles [conflicts](../transactions-conflicts-revisions.md) gracefully - meaning less worry about clashing user edits.

<p align="center">
  <img src="../files/database-replication.png" alt="database replication" width="200" />
</p>

### 5. Easy to Adopt and Extend
RxDB runs with a **NoSQL** approach and integrates seamlessly into [Ionic Angular](https://ionicframework.com/docs/angular/overview) or other frameworks you might use with Ionic. You can extend or replace storage backends, add encryption, or build advanced offline-first features with minimal overhead.


<center>
    <a href="https://rxdb.info/">
        <img src="../files/logo/rxdb_javascript_database.svg" alt="Ionic Storage Database" width="220" />
    </a>
</center>



## Quick Start: Implementing RxDB with LocalSTorage Storage

For a simple proof-of-concept or testing environment in [Ionic](./ionic-database.md), you can use [localstorage](../rx-storage-localstorage.md) as your underlying storage. Later, if you need better native performance, you can **switch to the SQLite storage** offered by the [RxDB Premium plugins](https://rxdb.info/premium/).

1. **Install RxDB**
```bash
npm install rxdb rxjs
```


2. **Initialize the Database**

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

async function initDB() {
  const db = await createRxDatabase({
    name: 'myionicdb',
    storage: getRxStorageLocalstorage(),
    multiInstance: false // or true if you plan multi-tab usage
    // Note: If you need encryption, set `password` here
  });

  await db.addCollections({
    notes: {
      schema: {
        title: 'notes schema',
        version: 0,
        type: 'object',
        primaryKey: 'id',
        properties: {
          id: { type: 'string' },
          content: { type: 'string' },
          timestamp: { type: 'number' }
        },
        required: ['id']
      }
    }
  });

  return db;
}
```

3. **Ready to Upgrade Later?**

When you need the best performance on mobile devices, purchase the RxDB [Premium](/premium/) [SQLite Storage](../rx-storage-sqlite.md) and replace `getRxStorageLocalstorage()` with `getRxStorageSQLite()` - your app logic remains largely the same. You only have to change the configuration.


## Encryption Example

To secure local data, add the crypto-js [encryption plugin](../encryption.md) (free version) or the [premium](/premium/) web-crypto plugin. Below is an example using the free crypto-js plugin:

```ts
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { createRxDatabase } from 'rxdb/plugins/core';

async function initEncryptedDB() {
  const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageLocalstorage()
  });

  const db = await createRxDatabase({
    name: 'secureIonicDB',
    storage: encryptedStorage,
    password: 'myS3cretP4ssw0rd'
  });

  await db.addCollections({
    secrets: {
      schema: {
        title: 'secret schema',
        version: 0,
        type: 'object',
        primaryKey: 'id',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' }
        },
        required: ['id'],
        // all fields in this array will be stored encrypted:
        encrypted: ['text']
      }
    }
  });

  return db;
}
```

With encryption enabled:

- `text` is automatically encrypted at rest.
- [Queries](../rx-query.md) on encrypted fields are not directly possible (since data is encrypted), but once a document is loaded, RxDB decrypts it for normal usage.


## Compression Example

To minimize the storage footprint, RxDB offers a [key-compression](../key-compression.md) feature. You can enable it in your schema:

```ts
await db.addCollections({
  logs: {
    schema: {
      title: 'logs schema',
      version: 0,
      keyCompression: true, // enable compression
      type: 'object',
      primaryKey: 'id',
      properties: {
        id: { type: 'string' },
        message: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  }
});
```

With `keyCompression: true`, RxDB shortens field names internally, significantly reducing document size. This helps both stored data and network transport during replication.


## RxDB vs. Other Ionic Storage Options

**Ionic Native Storage** or **Capacitor-based** key-value stores may handle small amounts of data but lack advanced features like:

- Complex queries
- Full NoSQL document model
- [Offline-first](../offline-first.md) [sync](../replication.md)
- Encryption & key compression out of the box
- RxDB stands out by delivering all these capabilities in a unified library.

## Follow Up

For Ionic storage that supports offline-first operations, built-in encryption, optional data compression, and live syncing with any backend, RxDB provides a powerful solution. Start quickly with [localstorage](../rx-storage-localstorage.md) for local development and testing - then scale up to the premium SQLite storage for optimal performance on production mobile devices.

Ready to learn more?

- Explore the [RxDB Quickstart Guide](../quickstart.md)
- Check out [RxDB Encryption](../encryption.md) to protect user data
- Learn about [SQLite Storage](../rx-storage-sqlite.md) in [RxDB Premium](/premium/) for top [performance](../rx-storage-performance.md) on mobile.
- Join our community on the [RxDB Chat](/chat/)

**RxDB** - The ultimate toolkit for Ionic developers seeking offline-first, secure, and compressed local data, with real-time sync to any server.

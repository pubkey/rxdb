---
title: IndexedDB Encryption - How to Encrypt Data Stored in IndexedDB
slug: indexeddb-encryption.html
description: IndexedDB is not encrypted at rest. Learn how IndexedDB encryption works, why the raw API cannot do it, and how RxDB encrypts fields on top of IndexedDB.
image: /headers/indexeddb-encryption.jpg
---

import {Steps} from '@site/src/components/steps';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_ENCRYPTION, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

# IndexedDB Encryption

**IndexedDB encryption** means protecting the data your app stores in the browser so that it cannot be read from disk without the right key. By default, [IndexedDB](../indexeddb-alternative.md) writes everything as plain text on the user's device, which is fine for a todo demo and a real problem for anything sensitive. This page explains what IndexedDB stores on disk, why the native API cannot encrypt it for you, and how [RxDB](https://rxdb.info/) adds transparent field-level encryption on top of IndexedDB.

<RxdbLogo alt="IndexedDB encryption" />

## Is IndexedDB Encrypted by Default?

No. IndexedDB is not encrypted at rest. The browser writes your object stores to a database file on the user's disk in plain text, and the file format is documented. In Chrome the data lives inside a LevelDB directory, in Firefox inside a SQLite file, and in both cases anyone with read access to the profile folder can open the file and read your records.

This surprises many developers, because IndexedDB feels private. It runs inside the browser, it is scoped to a single [origin](../browser-storage.md), and other websites cannot touch it. But same-origin isolation is not encryption. It stops another website from reading your data through the browser. It does nothing against someone who reads the raw file from disk.

So the threat model is simple. If an attacker gets file-level access to the machine, a stolen laptop, a shared computer, a malicious desktop process, or a browser extension with the right permissions, they can read every unencrypted IndexedDB record you ever wrote. For credentials, tokens, health data, or financial records, that is not acceptable.

## Why IndexedDB Cannot Encrypt Data for You

The native IndexedDB API has no encryption feature. There is no option on `indexedDB.open()`, no flag on an object store, and no callback where you could plug in a cipher. The API was designed as a [low-level storage engine](../local-database.md), and encryption was left to the layers above it.

That leaves you with one native option: encrypt the values yourself with the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) before you call `store.put()`, and decrypt them again after every `store.get()`. It works, but it is painful for a few concrete reasons.

- **You lose querying.** Once a field is a ciphertext string, an IndexedDB index over it is useless. You cannot ask the browser to "find all documents where `status` equals `active`", because on disk `status` is now random bytes. Every filter has to load and decrypt records by hand.
- **You hand-wire every read and write.** Web Crypto is asynchronous and returns an `ArrayBuffer`. You have to manage the key, the initialization vector, the encoding to and from a storable string, and wrap every single access point in the browser.
- **One missed spot leaks data.** The moment one code path writes a value without going through your encryption helper, that record lands on disk in plain text, and you will not notice until someone reads the file.

The naive fix is to encrypt the whole database blob as one string. This works until you have more than a handful of records, because now every read decrypts everything and every write re-encrypts everything. This will not scale.

## How RxDB Adds Encryption on Top of IndexedDB

[RxDB](https://rxdb.info/) (Reactive Database) is a local-first, NoSQL database for JavaScript applications. It runs on top of IndexedDB and other storages, and its [encryption plugin](../../encryption.md) wraps any [RxStorage](../../rx-storage.md) so that flagged fields are encrypted before they are written and decrypted when you read them back. Your data still lives in IndexedDB under the hood. Switching storages is a configuration change, not a rewrite.

The encryption is a wrapper around the storage, so the same setup works with the free [Dexie.js storage](../../rx-storage-dexie.md) and with the premium [IndexedDB RxStorage](../../rx-storage-indexeddb.md). RxDB handles the cipher, the key derivation, and the encoding for you. You only declare which fields are secret.

### 1. Wrap the IndexedDB Storage With Encryption

The encryption plugin takes your normal storage and returns an encrypted one. Everything else about the database stays the same.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// wrap the Dexie/IndexedDB storage with the encryption plugin
const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageDexie() // stores into IndexedDB under the hood
});

// the password decrypts the data, so keep it out of the source code
const db = await createRxDatabase({
    name: 'mydatabase',
    storage: encryptedStorage,
    password: 'sudoLetMeIn'
});
```

### 2. Mark the Secret Fields in the Schema

You declare encrypted fields with the `encrypted` array in the [JSON schema](../../rx-schema.md). Only those fields are encrypted on disk. The primary key and any field you want to query stay readable.

```ts
await db.addCollections({
    users: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                // the primary key must have a maxLength
                id: { type: 'string', maxLength: 100 },
                email: { type: 'string' },
                // this field is stored as ciphertext on disk
                secret: { type: 'string' }
            },
            required: ['id', 'email'],
            encrypted: ['secret']
        }
    }
});
```

### 3. Read and Write Without Touching the Cipher

Encryption and decryption happen inside RxDB. You insert and query documents like normal, and the `secret` field is plain text in your code and ciphertext on disk.

```ts
await db.users.insert({
    id: 'user1',
    email: 'alice@example.com',
    secret: 'my private token'
});

// query by a non-encrypted field
const doc = await db.users.findOne({
    selector: { email: 'alice@example.com' }
}).exec(true);

console.log(doc.secret); // 'my private token' - decrypted for you
```

Keep in mind that encrypted fields cannot be used inside a query selector, because on disk they are ciphertext. You query by the primary key or by non-encrypted fields, and you keep the sensitive data in the encrypted fields. If you need to query encrypted values, you can replicate them into a non-encrypted [memory mapped storage](../../rx-storage-memory-mapped.md) and query that.

## The Performance Cost of Encryption

Encryption is not free. Every write has to encrypt the flagged fields before they reach the store, and every read has to decrypt them again. That is extra CPU work on top of the storage access, and [IndexedDB is already slow](../../slow-indexeddb.md), so the cipher adds to a cost that is high to begin with. On the `crypto-js` plugin the WebCrypto based plugin is about 5x faster, and document inserts are about 10x faster, which tells you how much the cipher itself can weigh.

The overhead comes from a few places you should keep in mind.

- **Encryption runs on the main thread by default.** The cipher is CPU-bound, so encrypting many documents on the main thread can block rendering and make the UI stutter. To fix this, move the storage into a [Worker](../../rx-storage-worker.md) or [SharedWorker](../../rx-storage-shared-worker.md) so encryption runs off the main thread.
- **Encrypted fields cannot use an index.** On disk an encrypted field is a random ciphertext string, so the browser cannot build a useful index over it and a query cannot filter on it. Anything you want to query has to stay unencrypted, and over-encrypting fields quietly pushes those queries into full scans.
- **A whole field is re-encrypted on every write.** RxDB encrypts each flagged field as one string, and there is no partial update inside it. If you keep a large object or a long text in an encrypted field, the full value is re-encrypted on every single write, even when you only changed one small property.
- **The build gets bigger with `crypto-js`.** The free plugin bundles the crypto-js module, which adds to your JavaScript bundle. The premium `encryption-web-crypto` plugin uses the browser's native API instead, so it ships less code.

You keep the cost low with a few habits. Encrypt only the fields that hold sensitive data, not the whole document. Keep encrypted fields small and store big encrypted blobs as [attachments](../../rx-attachment.md), because attachments are only decrypted on an explicit fetch and not while a query runs. And for anything heavy, use the WebCrypto plugin inside a worker.

The chart below shows the difference between the two plugins (lower is better). You can reproduce these numbers yourself in the RxDB repository.

<PerformanceChart title="RxDB Encryption Plugins Performance (on Memory RxStorage)" data={PERFORMANCE_DATA_ENCRYPTION} metrics={PERFORMANCE_METRICS} logScale={false} />
<br />

## Choosing an Encryption Plugin

RxDB ships two encryption plugins, and both wrap the storage the same way.

- **`encryption-crypto-js`**: the free plugin, based on the `AES` algorithm of the [crypto-js](https://www.npmjs.com/package/crypto-js) library. It works everywhere and is a good default.
- **`encryption-web-crypto`**: a [👑 premium](/premium/) plugin built on the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). Document inserts are about 10x faster than with crypto-js, and the build size is smaller because it uses the browser API instead of bundling a module.

If encryption runs on many documents, the Web Crypto plugin is worth it. IndexedDB is already [slow](../../slow-indexeddb.md), so you do not want a slow cipher on top. For heavy workloads you can also move encryption into a [Worker storage](../../rx-storage-worker.md) so it does not block the main thread.

## FAQ

<details>
<summary>Is IndexedDB encrypted at rest by default?</summary>

No. IndexedDB writes your data to a file on the user's disk in plain text. Same-origin isolation stops other websites from reading it, but it does nothing against someone with file-level access to the machine. To protect data at rest you have to encrypt the values before they are written, which an encrypted [RxStorage](../../rx-storage.md) wrapper does for you.

</details>

<details>
<summary>How do I encrypt data in IndexedDB?</summary>

You have two options. Encrypt each value yourself with the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) before every write and decrypt after every read, which breaks querying and is easy to get wrong. Or use **[RxDB](https://rxdb.info/)** on top of IndexedDB and flag the secret fields with `encrypted` in the schema, so encryption and decryption happen transparently. See [How RxDB Adds Encryption](#how-rxdb-adds-encryption-on-top-of-indexeddb).

</details>

<details>
<summary>Can I query encrypted IndexedDB fields?</summary>

No. An encrypted field is stored as ciphertext, so an index over it is meaningless and a selector on it cannot match. You query by the primary key or by non-encrypted fields and keep the sensitive data in the encrypted fields. To query encrypted values you can replicate them into a non-encrypted [memory mapped storage](../../rx-storage-memory-mapped.md) first.

</details>

<details>
<summary>Does encryption slow down IndexedDB?</summary>

Yes, a bit, because every write encrypts and every read decrypts. The cost depends on the plugin. The free `crypto-js` plugin is fine for small data, and the premium `encryption-web-crypto` plugin is about 10x faster on inserts. For heavy workloads you can run encryption inside a [Worker storage](../../rx-storage-worker.md) to keep it off the main thread.

</details>

<details>
<summary>Can I change the encryption password later?</summary>

Not directly. The password is set once per database, and opening the database with a different password throws an error. To rotate it you migrate the data into a new database with the [storage migration plugin](../../migration-storage.md), or you store a random meta-password encrypted with the user password and only change that outer layer. See the [encryption docs](../../encryption.md#changing-the-password).

</details>

## Follow Up

- Read the full [RxDB encryption plugin docs](../../encryption.md).
- Start building with the [RxDB Quickstart](../../quickstart.md).
- Learn the raw API in the [IndexedDB Tutorial](./indexeddb-tutorial.md).
- See why the native API is slow in [Slow IndexedDB](../../slow-indexeddb.md).
- Compare the storages in [IndexedDB Alternative](../indexeddb-alternative.md).
- Check the code on [GitHub](/code/) and leave a star ⭐ if RxDB helps you.
- Ask questions in the [community chat](/chat/).

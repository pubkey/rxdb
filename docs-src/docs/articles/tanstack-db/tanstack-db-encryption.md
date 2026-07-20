---
title: 'Encrypting Local Data in TanStack DB with RxDB'
slug: tanstack-db-encryption.html
description: Store TanStack DB data securely on-device. Use RxDB's encryption to protect local IndexedDB and SQLite storage, ideal for health, fintech, and compliance apps.
image: /headers/tanstack-db-encryption.jpg
---

import {Steps} from '@site/src/components/steps';

# Encrypting Local Data in TanStack DB with RxDB

**TanStack DB encryption** is not something the store handles itself: TanStack DB is an in-memory reactive client store with live queries and optimistic mutations, and persistence belongs to the collection implementation underneath. When that implementation is the official `@tanstack/rxdb-db-collection` package, [RxDB](https://rxdb.info/) owns the storage layer, and the RxDB [encryption plugins](../../encryption.md) can encrypt sensitive document fields before they are written to disk. The [TanStack DB + RxDB integration](./rxdb-collection-for-tanstack-db.md) needs no changes for this, because encryption happens below the collection. This page explains why local data needs encryption at rest, how the RxDB encryption plugins work under TanStack DB, and walks through a runnable setup with an encrypted field.

<RxdbLogo alt="TanStack DB encrypted storage" />

## Why Encrypt Local Data at All

Local-first apps store data on the user's device. That is the whole point. But browser storage like [IndexedDB](../../rx-storage-indexeddb.md) and on-device [SQLite](../../rx-storage-sqlite.md) files are **not encrypted at rest by default**. Anyone with access to the device can open the profile folder and read the raw data files. Other applications on the same machine can do the same.

For a todo app this is acceptable. For health records, financial data, or anything covered by regulations like [GDPR](https://gdpr.eu/) or [HIPAA](https://www.hhs.gov/hipaa/index.html), it is not. When a device is lost or stolen, the data on its disk must stay unreadable without the password. Encryption at rest is the standard answer, and with RxDB under TanStack DB you get it as a storage wrapper, not as a rewrite of your app.

One thing has to be stated honestly up front: this protects data **at rest**, not in memory. TanStack DB holds a decrypted copy of your documents in memory so that live queries stay fast, and RxDB decrypts documents when it reads them. An attacker who can inspect the memory of your running app sees plain data. Encryption at rest defends the files on disk, which is exactly what device theft and compliance requirements are about.

## How Encryption Works Under TanStack DB

An RxDB encryption plugin is a wrapper around any other [RxStorage](../../rx-storage.md). You wrap your storage, set a `password` on `createRxDatabase()`, and list the sensitive fields in the `encrypted` array of your [schema](../../rx-schema.md). RxDB then encrypts those fields before they hit the storage and decrypts them transparently when documents are read.

Because the [RxDB collection for TanStack DB](./rxdb-collection-for-tanstack-db.md) feeds TanStack DB from that same storage, the TanStack DB layer stays untouched. `useLiveQuery` sees normal, decrypted documents. Writes on the TanStack collection persist through RxDB's `bulkUpsert()`, `incrementalPatch()`, and `bulkRemove()` handlers, and the encryption wrapper encrypts the flagged fields on the way down. No TanStack DB code changes, no manual crypto calls.

RxDB ships two [encryption plugins](../../encryption.md):

- **`encryption-crypto-js`**: The free plugin, based on the `AES` algorithm of the [crypto-js](https://www.npmjs.com/package/crypto-js) library.
- **`encryption-web-crypto`** 👑: A [premium](/premium/) plugin based on the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API). It is faster and more secure to use, with document inserts about 10x faster compared to `crypto-js`, and it has a smaller build size because it uses the browser's API instead of bundling an npm module.

Both plugins use symmetric encryption with a password. The encryption works with all RxStorage implementations, so the same setup covers [localStorage](../../rx-storage-localstorage.md), [IndexedDB](../../rx-storage-indexeddb.md), [OPFS](../../rx-storage-opfs.md), and [SQLite](../../rx-storage-sqlite.md).

## Setup: TanStack DB with an Encrypted Field

The following example builds a patient notes collection where the diagnosis is encrypted at rest. It uses the free `encryption-crypto-js` plugin and the free [localStorage-based storage](../../rx-storage-localstorage.md); any other storage works the same way. The TanStack DB basics are covered in the [hub article](./rxdb-collection-for-tanstack-db.md), so the shared parts stay short here.

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

### Wrap the Storage with the Encryption Plugin

```ts
import {
    wrappedKeyEncryptionCryptoJsStorage
} from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the normal storage with the encryption plugin
const encryptedStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageLocalstorage()
});
```

### Create the Database with a Password

```ts
import { createRxDatabase } from 'rxdb/plugins/core';

const db = await createRxDatabase({
    name: 'patientsdb',
    storage: encryptedStorage,
    // In production, do not hardcode this. See the password handling section below.
    password: 'sudoLetMeIn'
});
```

### Define the Schema with an `encrypted` Fields List

Fields listed in the `encrypted` array are encrypted before they are written to the storage. The primary key and the `name` field stay unencrypted so that RxDB can still index and query them.

```ts
await db.addCollections({
    notes: {
        schema: {
            title: 'patient notes',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                name: { type: 'string' },
                diagnosis: { type: 'string' }
            },
            required: ['id', 'name'],
            encrypted: ['diagnosis']
        }
    }
});
```

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const notesCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.notes
    })
);
```

### Query and Mutate as Usual

The TanStack DB side does not know that encryption exists. Live queries see decrypted documents, and writes are encrypted on their way to disk.

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function PatientNotes() {
    // The in-memory data is decrypted, so live queries work on all fields.
    const { data: notes } = useLiveQuery((q) =>
        q.from({ note: notesCollection })
    );
    return (
        <ul>
            {notes.map((note) => (
                <li key={note.id}>{note.name}: {note.diagnosis}</li>
            ))}
        </ul>
    );
}

// The diagnosis field is stored as ciphertext on disk.
notesCollection.insert({
    id: 'patient-1',
    name: 'Alice',
    diagnosis: 'top secret'
});
```

</Steps>

## The Premium Web Crypto Plugin 👑

For production apps with larger datasets, the [premium](/premium/) `encryption-web-crypto` plugin is the better choice. It uses the same wrapper pattern, and the `password` becomes an object that also selects the algorithm:

```ts
import {
    wrappedKeyEncryptionWebCryptoStorage,
    createPassword
} from 'rxdb-premium/plugins/encryption-web-crypto';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

const encryptedIndexedDbStorage = wrappedKeyEncryptionWebCryptoStorage({
    storage: getRxStorageIndexedDB()
});

const myPasswordObject = {
    // Algorithm can be oneOf: 'AES-CTR' | 'AES-CBC' | 'AES-GCM'
    algorithm: 'AES-CTR',
    password: 'myRandomPasswordWithMin8Length'
};

const db = await createRxDatabase({
    name: 'patientsdb',
    storage: encryptedIndexedDbStorage,
    password: myPasswordObject
});
```

Everything else, including the `encrypted` fields list and the TanStack DB wiring, stays the same. Switching storages is a configuration change, not a rewrite.

## Password Handling

RxDB does not define how you store or retrieve the encryption password. It only requires you to provide the password on database creation. This grants you flexibility: you can ask the user for the password on app start, or you can retrieve it from your backend on app start and revoke access by no longer providing it.

Keep in mind that the password is set per database and cannot be changed later. Opening an existing database with a different password throws an error. To change the password you can either use the [storage migration plugin](../../migration-storage.md) to migrate the data into a new database, or store a randomly created meta-password as a [local document](../../rx-local-document.md) in a separate database, encrypted with the actual user password.

## Limitations

- **Encrypted fields cannot be used as operators in queries** on the RxDB level. RxDB does not expose the encrypted data in a way that allows direct querying based on the encrypted content, so a query like "find all documents where `diagnosis` equals X" does not work against the storage. Keep the fields you filter on unencrypted, as the example above does with `name`. When you have to query encrypted fields on the RxDB side, you can replicate the documents into a non-encrypted in-memory storage with the [memory mapped](../../rx-storage-memory-mapped.md) RxStorage and query them there.
- **TanStack DB live queries are not affected** by this limitation, because they run against the decrypted in-memory copy. A `where()` clause on an encrypted field works. But this also means the decrypted data lives in memory, as stated above.
- **Attachments** can be encrypted too by setting `encrypted: true` in the `attachments` property of the schema. See the [attachments documentation](../../rx-attachment.md).

## Encryption on Mobile

The same pattern runs on [React Native](./tanstack-db-react-native.md) and [Capacitor](./tanstack-db-capacitor.md), where the storage underneath is typically the [SQLite RxStorage](../../rx-storage-sqlite.md) 👑. On mobile you should fetch the database password from the platform's secure keystore instead of storing it in plain JavaScript. The [React Native encryption guide](../react-native-encryption.md) shows this with `react-native-keychain` and covers best practices for encrypted mobile databases.

## FAQ

<details>
    <summary>Does TanStack DB support encryption out of the box?</summary>

No. TanStack DB is an in-memory store and does not encrypt anything itself. Encryption at rest belongs to the persistence layer. With the official RxDB collection, the **[RxDB encryption plugins](../../encryption.md)** encrypt document fields before they are written to the storage, and TanStack DB works on the decrypted in-memory copy without any changes.

</details>

<details>
    <summary>How do I encrypt TanStack DB data in IndexedDB or SQLite?</summary>

Yes, this works with a storage wrapper. Wrap your [RxStorage](../../rx-storage.md) with `wrappedKeyEncryptionCryptoJsStorage` (free) or `wrappedKeyEncryptionWebCryptoStorage` (premium 👑), set a `password` on `createRxDatabase()`, and list the sensitive fields in the schema's `encrypted` array. The **[RxDB collection for TanStack DB](./rxdb-collection-for-tanstack-db.md)** then persists all writes through that encrypted storage.

</details>

<details>
    <summary>Can I query encrypted fields in TanStack DB?</summary>

Yes, on the TanStack DB side. Live queries run against the decrypted in-memory data, so filters on encrypted fields work there. On the **[RxDB](../../rx-database.md)** side, encrypted fields cannot be used as query operators because they are stored as ciphertext, so keep filter fields for RxDB-level queries and replication unencrypted.

</details>

<details>
    <summary>Is TanStack DB secure storage enough for health and fintech apps?</summary>

No single feature is enough on its own, but encryption at rest is a core requirement. The RxDB encryption plugins keep sensitive fields unreadable on disk when a device is lost, which supports compliance with regulations like GDPR and HIPAA. Combine it with secure password handling, HTTPS for [replication](../../replication.md), and the practices from the **[React Native encryption guide](../react-native-encryption.md)** on mobile.

</details>

<details>
    <summary>What happens when I open the database with a wrong password?</summary>

No data is returned. The password is set per database and cannot be changed afterwards, and opening an existing database with a different password throws an error. To change the password, migrate the data with the **[storage migration plugin](../../migration-storage.md)** into a new database, or use the meta-password pattern described in the [encryption docs](../../encryption.md).

</details>

## Follow Up

- Read the full [RxDB encryption documentation](../../encryption.md) for attachments, workers, and performance details.
- Start with the hub article [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md) for the complete integration setup.
- New to RxDB? Begin with the [RxDB Quickstart](../../quickstart.md).
- Going mobile? See [TanStack DB in React Native & Expo](./tanstack-db-react-native.md) and the [React Native encryption guide](../react-native-encryption.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.

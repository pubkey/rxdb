# Encryption

> Explore RxDB's 🔒 encryption plugin for enhanced data security in web and native apps, featuring password-based encryption and secure storage.

import {Steps} from '@site/src/components/steps';
import {PremiumBlock} from '@site/src/components/premium-block';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_ENCRYPTION, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';
import {IconEncryption} from '@site/src/components/icons/encryption';

# <HeadlineWithIcon h1 icon={<IconEncryption />}>Encrypted Local Storage with RxDB</HeadlineWithIcon>

<!-- keywords:
encrypted browser storage
secure web storage
encrypt local storage
indexeddb encryption
sqlite browser encrypted databases
react native encrypted storage
-->

The RxDB encryption plugin empowers developers to fortify their applications' data security. It seamlessly integrates with [RxDB](https://rxdb.info/), allowing for the secure storage and retrieval of documents by **encrypting them with a password**. With encryption and decryption processes handled internally, it ensures that sensitive data remains confidential, making it a valuable tool for building robust, privacy-conscious applications. The encryption works on all RxDB supported devices types like the **[browser](./articles/browser-database.md)**, **[ReactNative](./react-native-database.md)** or **[Node.js](./nodejs-database.md)**.

Encrypting client-side stored data in RxDB offers numerous advantages:
- **Enhanced Security**: In the unfortunate event of a user's device being stolen, the encrypted data remains safeguarded on the hard drive, inaccessible without the correct password.
- **Access Control**: You can retain control over stored data by revoking access at any time simply by withholding the password.
- **Tamper proof** Other applications on the device cannot read out the stored data when the password is only kept in the process-specific memory

## Querying encrypted data

RxDB handles the encryption and decryption of data internally. This means that when you work with a [RxDocument](./rx-document.md), you can access the properties of the document just like you would with normal, unencrypted data. RxDB automatically decrypts the data for you when you retrieve it, making it transparent to your application code.
This means the encryption works with all [RxStorage](./rx-storage.md) like **[SQLite](./rx-storage-sqlite.md)**, **[IndexedDB](./rx-storage-indexeddb.md)**, **[OPFS](./rx-storage-opfs.md)** and so on.

However, there's a limitation when it comes to querying encrypted fields. **Encrypted fields cannot be used as operators in queries**. This means you cannot perform queries like "find all documents where the encrypted field equals a certain value." RxDB does not expose the encrypted data in a way that allows direct querying based on the encrypted content. To filter or search for documents based on the contents of encrypted fields, you would need to first decrypt the data and then perform the query, which might not be efficient or practical in some cases.
You could however use the [memory mapped](./rx-storage-memory-mapped.md) RxStorage to replicate the encrypted documents into a non-encrypted in-memory storage and then query them like normal.

## Password handling
RxDB does not define how you should store or retrieve the encryption password. It only requires you to provide the password on database creation which grants you flexibility in how you manage encryption passwords.
You could ask the user on app-start to insert the password, or you can retrieve the password from your backend on app start (or revoke access by no longer providing the password).

## Asymmetric encryption

The encryption plugin itself uses **symmetric encryption** with a password to guarantee best performance when reading and storing data.
It is not able to do **Asymmetric encryption** by itself. If you need Asymmetric encryption with a private/publicKey, it is recommended to encrypted the password itself with the asymmetric keys and store the encrypted password beside the other data. On app-start you can decrypt the password with the private key and use the decrypted password in the RxDB encryption plugin

## Using the RxDB Encryption Plugins

RxDB currently has two plugins for encryption:

- The free `encryption-crypto-js` plugin that is based on the `AES` algorithm of the [crypto-js](https://www.npmjs.com/package/crypto-js) library
- `encryption-web-crypto` plugin that is based on the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which makes it faster and more secure to use. Document inserts are about 10x faster compared to `crypto-js` and it has a smaller build size because it uses the browsers API instead of bundling an npm module.

An RxDB encryption plugin is a wrapper around any other [RxStorage](./rx-storage.md). 

<Steps>

### Wrap your RxStorage with the encryption

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

### Create a RxDatabase with the wrapped storage

Also you have to set a **password** when creating the database. The format of the password depends on which encryption plugin is used.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
// create an encrypted database
const db = await createRxDatabase({
    name: 'mydatabase',
    storage: encryptedStorage,
    password: 'sudoLetMeIn'
});
```

### Create an RxCollection with an encrypted property

To define a field as being encrypted, you have to add it to the `encrypted` fields list in the schema.

```ts
const schema = {
    version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100
      },
      secret: {
          type: 'string'
      },
  },
  required: ['id'],
  encrypted: ['secret']
};

await db.addCollections({
    myDocuments: {
        schema
    }
})
```
</Steps>

## Using the WebCrypto API

<PremiumBlock />

```ts
import {
    wrappedKeyEncryptionWebCryptoStorage,
    createPassword
} from 'rxdb-premium/plugins/encryption-web-crypto';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';

// wrap the normal storage with the encryption plugin
const encryptedIndexedDbStorage = wrappedKeyEncryptionWebCryptoStorage({
    storage: getRxStorageIndexedDB()
});

const myPasswordObject = {
    // Algorithm can be oneOf: 'AES-CTR' | 'AES-CBC' | 'AES-GCM'
    algorithm: 'AES-CTR',
    password: 'myRandomPasswordWithMin8Length'
};

// create an encrypted database
const db = await createRxDatabase({
    name: 'mydatabase',
    storage: encryptedIndexedDbStorage,
    password: myPasswordObject
});

/* ... */
```

## Changing the password

The password is set database specific and it is not possible to change the password of a database. Opening an existing database with a different password will throw an error. To change the password you can either:
- Use the [storage migration plugin](./migration-storage.md) to migrate the database state into a new database.
- Store a randomly created meta-password in a different RxDatabase as a value of a [local document](./rx-local-document.md). Encrypt the meta password with the actual user password and read it out before creating the actual database.

## Encrypted attachments

To store the [attachments](./rx-attachment.md) data encrypted, you have to set `encrypted: true` in the `attachments` property of the schema.

```ts
const mySchema = {
    version: 0,
    type: 'object',
    properties: {
        /* ... */
    },
    attachments: {
        // if true, the attachment-data will be
        // encrypted with the db-password
        encrypted: true
    }
};
```

## Encryption and workers

If you are using [Worker RxStorage](./rx-storage-worker.md) or [SharedWorker RxStorage](./rx-storage-shared-worker.md) with encryption, it's recommended to run encryption inside of the worker. Encryption can be very cpu intensive and would take away CPU-power from the main thread which is the main reason to use workers.

You do not need to worry about setting the password inside of the worker. The password will be set when calling createRxDatabase from the main thread, and will be passed internally to the storage in the worker automatically.

### Using encryption inside the worker with OPFS

When you wrap a storage like [OPFS](./rx-storage-opfs.md) with encryption inside of a worker, you have to set the `usesRxDatabaseInWorker` option on the OPFS storage. Without this option, the OPFS storage returns raw JSON strings instead of parsed objects as a performance optimization. The encryption wrapper cannot process these strings and will throw an error.

```ts
// inside of the worker.js file
import { getRxStorageOPFS } from 'rxdb-premium/plugins/storage-opfs';
import {
    wrappedKeyEncryptionWebCryptoStorage
} from 'rxdb-premium/plugins/encryption-web-crypto';

const storage = wrappedKeyEncryptionWebCryptoStorage({
    storage: getRxStorageOPFS({
        // Required when wrapping OPFS with encryption inside a worker
        usesRxDatabaseInWorker: true
    })
});
```

## Encryption Performance

As shown in the chart, the WebCrypto based encryption plugins are generally **5 times faster** than the `crypto-js` plugin.

<PerformanceChart title="RxDB Encryption Plugins Performance (on Memory RxStorage)" data={PERFORMANCE_DATA_ENCRYPTION} metrics={PERFORMANCE_METRICS} logScale={false} />

## FAQ

<details>
<summary>What are some JavaScript libraries for client side field encryption?</summary>

RxDB provides robust plugins for client side field encryption directly within your javascript database. You encrypt sensitive document properties transparently before they save to local storage. The `encryption-crypto-js` plugin utilizes AES algorithms for dependable security. The `encryption-web-crypto` plugin employs native browser APIs to achieve superior performance. You maintain data confidentiality across Web, React Native, and Node.js environments.
</details>

<details>
<summary>What options exist for encrypting individual document fields and keys in JavaScript?</summary>

You can implement encryption in JavaScript by manually encrypting fields with the native `WebCrypto API` before storing them, but this breaks standard querying. Advanced databases like **[RxDB](./rx-database.md)** simplify this through schema-level encryption plugins (`encryption-web-crypto`). By flagging specific document fields as `encrypted: true` in your JSON Schema, RxDB automatically encrypts the data before writing to the storage engine (like IndexedDB or SQLite) and decrypts it instantly upon retrieval.
</details>

<details>
<summary>Is chrome.storage.local encrypted at rest by default?</summary>

No, `chrome.storage.local` (and standard `IndexedDB` in the browser) is **not** encrypted at rest by default. Any user or potentially malicious extension with adequate local machine access can read the underlying data files. To properly secure sensitive data at rest in a browser extension or Web App, you must explicitly encrypt strings before saving them, a process seamlessly automated by using an encrypted [RxStorage](./rx-storage.md) wrapper.
</details>

<details>
<summary>Are there open-source libraries for encrypting personal user data natively?</summary>

Yes, libraries like `crypto-js` or wrappers over the native WebCrypto API provide robust open-source encryption. For developers building native mobile apps (React Native, Expo, Ionic) or browser applications, utilizing a database that ships with native encryption wrappers like **[RxDB's Encryption Plugins](https://rxdb.info/encryption.html)** is the most reliable method. It ensures data is never written to disk in plain text while allowing you to effortlessly swap underlying storage layers without rewriting your cryptography logic.
</details>

<details>
<summary>Can I encrypt a child field when the parent field is already encrypted?</summary>

No. When you encrypt a parent field, the entire object at that path is encrypted as a single string. You cannot also encrypt a child path of an already-encrypted parent. For example, if you encrypt `nested`, you must **not** also add `nested.secret` to the `encrypted` array. Doing so will throw an error in [dev-mode](./dev-mode.md).

```ts
// NOT ALLOWED - 'nested.secret' is a child of 'nested'
const schema = {
    encrypted: ['nested', 'nested.secret']
};

// CORRECT - only encrypt the parent
const schema = {
    encrypted: ['nested']
};
```

</details>

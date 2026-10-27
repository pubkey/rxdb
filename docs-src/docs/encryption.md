---
title: Encryption - Secure Local Data at Rest in JavaScript
slug: encryption.html
description: Explore RxDB's 🔒 encryption plugin for enhanced data security in web and native apps, featuring password-based encryption and secure storage.
image: /headers/encryption.jpg
---

import {Steps} from '@site/src/components/steps';
import {PremiumBlock} from '@site/src/components/premium-block';
import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_ENCRYPTION, PERFORMANCE_METRICS } from '@site/src/components/performance-data';

import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';
import {IconEncryption} from '@site/src/components/icons/encryption';
import {Faq, FaqItem} from '@site/src/components/faq';
import {DocsAnimation} from '@site/src/components/docs-animation';
import {EncryptionLogo} from '@site/src/components/animations/encryption-logo';

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


<DocsAnimation subtitle="Document fields encrypted before they are stored">
<EncryptionLogo />
</DocsAnimation>

## Querying encrypted data

RxDB handles the encryption and decryption of data internally. This means that when you work with a [RxDocument](./rx-document.md), you can access the properties of the document just like you would with normal, unencrypted data. RxDB automatically decrypts the data for you when you retrieve it, making it transparent to your application code.
This means the encryption works with all [RxStorage](./rx-storage.md) like **[SQLite](./rx-storage-sqlite.md)**, **[IndexedDB](./rx-storage-indexeddb.md)**, **[OPFS](./rx-storage-opfs.md)** and so on.

Keep in mind that everything which reads the documents through the collection sees the decrypted values. A [JSON dump](./json-import-export.md) therefore contains your encrypted fields in plain text, so treat such a dump as sensitive data.

However, there's a limitation when it comes to querying encrypted fields. **Encrypted fields cannot be used as operators in queries**. This means you cannot perform queries like "find all documents where the encrypted field equals a certain value." RxDB does not expose the encrypted data in a way that allows direct querying based on the encrypted content. To filter or search for documents based on the contents of encrypted fields, you would need to first decrypt the data and then perform the query, which might not be efficient or practical in some cases.
You could however use the [memory mapped](./rx-storage-memory-mapped.md) RxStorage to replicate the encrypted documents into a non-encrypted in-memory storage and then query them like normal.

## Password handling
RxDB does not define how you should store or retrieve the encryption password. It only requires you to provide the password on database creation which grants you flexibility in how you manage encryption passwords.
You could ask the user on app-start to insert the password, or you can retrieve the password from your backend on app start (or revoke access by no longer providing the password).
The password is also required when you delete an encrypted database with `removeRxDatabase()`, see [removing an encrypted database](./rx-database.md#removing-an-encrypted-database).

## Asymmetric encryption

The encryption plugin itself uses **symmetric encryption** with a password to guarantee best performance when reading and storing data.
It is not able to do **Asymmetric encryption** by itself. If you need Asymmetric encryption with a private/publicKey, it is recommended to encrypted the password itself with the asymmetric keys and store the encrypted password beside the other data. On app-start you can decrypt the password with the private key and use the decrypted password in the RxDB encryption plugin


## Using the RxDB Encryption Plugins


RxDB currently has two plugins for encryption:

- The free `encryption-crypto-js` plugin that is based on the `AES` algorithm of the [crypto-js](https://www.npmjs.com/package/crypto-js) library
- `encryption-web-crypto` plugin that is based on the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which makes it faster and more secure to use. Document inserts are about 10x faster compared to `crypto-js` and it has a smaller build size because it uses the browsers API instead of bundling an npm module.

:::warning Use `encryption-web-crypto` for security relevant data

The free `encryption-crypto-js` plugin exists for convenience and for projects where the encryption only has to keep data out of plain sight. Do not use it when the confidentiality of the data is part of your threat model.

The [crypto-js](https://www.npmjs.com/package/crypto-js) library is no longer maintained. Its npm page marks it as discontinued and its own README recommends the native crypto module instead. On top of that, `encryption-crypto-js` passes your password straight to `AES.encrypt()`, so crypto-js derives the key with the OpenSSL compatible scheme that runs a single MD5 round, and the result is unauthenticated AES-CBC with no integrity check. A short password is therefore cheap to brute force, and an attacker who can write to the storage can change the stored plaintext without the change being detected.

`encryption-web-crypto` uses the browser's own [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) with authenticated `AES-GCM`, so the stored data carries an integrity tag and tampering is detected. For anything security relevant, use it.

:::

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
const myDatabase = await createRxDatabase({
    name: 'mydatabase',
    storage: encryptedStorage,
    password: 'sudoLetMeIn'
});
```

### Create an RxCollection with an encrypted property

To define a field as being encrypted, you have to add it to the `encrypted` fields list in the schema.


```ts
const todoSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        note: {
            type: 'string'
        }
    },
    required: ['id', 'name'],
    encrypted: ['note']
};

await myDatabase.addCollections({
    todos: {
        schema: todoSchema
    }
});

await myDatabase.todos.insert({
    id: 'todo2',
    name: 'Buy groceries',
    note: 'Milk, eggs, bread' // <- stored encrypted
});
const doc = await myDatabase.todos.findOne('todo2').exec();
console.log(doc.note);
// > 'Milk, eggs, bread'
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
const myDatabase = await createRxDatabase({
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
const todoSchema = {
    version: 0,
    primaryKey: 'id',
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
<br />

## FAQ

<Faq>
<FaqItem question="What are some JavaScript libraries for client side field encryption?">

RxDB has two plugins for client side field encryption directly within your javascript database. You encrypt sensitive document properties transparently before they are saved to local storage. The `encryption-web-crypto` plugin uses the native browser APIs with authenticated `AES-GCM`, and it is the one to use for security relevant data. The free `encryption-crypto-js` plugin is based on the unmaintained `crypto-js` library and is meant for cases where the encryption only has to keep data out of plain sight. Both work across Web, React Native, and Node.js environments.

</FaqItem>
<FaqItem question="What options exist for encrypting individual document fields and keys in JavaScript?">

You can implement encryption in JavaScript by manually encrypting fields with the native `WebCrypto API` before storing them, but this breaks standard querying. Advanced databases like **[RxDB](./rx-database.md)** simplify this through schema-level encryption plugins (`encryption-web-crypto`). By flagging specific document fields as `encrypted: true` in your JSON Schema, RxDB automatically encrypts the data before writing to the storage engine (like IndexedDB or SQLite) and decrypts it instantly upon retrieval.

</FaqItem>
<FaqItem question="Is chrome.storage.local encrypted at rest by default?">

No, `chrome.storage.local` (and standard `IndexedDB` in the browser) is **not** encrypted at rest by default. Any user or potentially malicious extension with adequate local machine access can read the underlying data files. To properly secure sensitive data at rest in a browser extension or Web App, you must explicitly encrypt strings before saving them, a process seamlessly automated by using an encrypted [RxStorage](./rx-storage.md) wrapper. See [IndexedDB Encryption](./articles/indexeddb/indexeddb-encryption.md) for the details.

</FaqItem>
<FaqItem question="Are there open-source libraries for encrypting personal user data natively?">

Yes. The native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) is built into every modern browser, Node.js and React Native, and it is the one to reach for. Avoid `crypto-js`, which is no longer maintained and whose own README points you at the native crypto module. For developers building native mobile apps (React Native, Expo, Ionic) or browser applications, a database that ships with native encryption wrappers like **[RxDB's Encryption Plugins](https://rxdb.info/encryption.html)** is the most reliable method. It keeps data from being written to disk in plain text and lets you swap the underlying storage layer without rewriting your cryptography logic.

</FaqItem>
<FaqItem question="Can I encrypt a child field when the parent field is already encrypted?">

No. When you encrypt a parent field, the entire object at that path is encrypted as a single string. You cannot also encrypt a child path of an already-encrypted parent. For example, if you encrypt `assignee`, you must **not** also add `assignee.email` to the `encrypted` array. Doing so will throw an error in [dev-mode](./dev-mode.md).

```ts
// NOT ALLOWED - 'assignee.email' is a child of 'assignee'
const todoSchema = {
    encrypted: ['assignee', 'assignee.email']
};

// CORRECT - only encrypt the parent
const todoSchema = {
    encrypted: ['assignee']
};
```

</FaqItem>
</Faq>

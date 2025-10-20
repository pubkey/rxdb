---
title: React Native Encryption and Encrypted Database/Storage
slug: react-native-encryption.html
description: Secure your React Native app with RxDB encryption. Learn why it matters, how to implement encrypted databases, and best practices to protect user data.
---


# React Native Encryption and Encrypted Database/Storage

Data security is a critical concern in modern mobile applications. As React Native continues to grow in popularity for building cross-platform apps, ensuring that your data is protected is paramount. RxDB, a real-time database for JavaScript applications, offers powerful encryption features that can help you secure your React Native app's data.

This article explains why encryption is important, how to set it up with RxDB in [React Native](../react-native-database.md), and best practices to keep your app secure.

## 🔒 Why Encryption Matters

Encryption ensures that, even if an unauthorized party obtains physical access to your device or intercepts data, they cannot read the information without the encryption key. Sensitive user data such as credentials, personal information, or financial details should always be encrypted. Proper encryption practices reduce the risk of data breaches and help your application remain compliant with regulations like [GDPR](https://gdpr.eu/) or [HIPAA](https://www.hhs.gov/hipaa/index.html).


## React Native Encryption Overview


React Native supports multiple ways to secure local data:

1. **Encrypted Databases**
   Use databases with built-in encryption capabilities, such as SQLite with encryption layers or RxDB with its [encryption plugin](../encryption.md).

2. **Secure Storage Libraries**
   For key-value data (like tokens or secrets), you can use libraries like [react-native-keychain](https://github.com/oblador/react-native-keychain) or [react-native-encrypted-storage](https://github.com/emeraldsanto/react-native-encrypted-storage).

3. **Custom Encryption**
   If you need more fine-grained control, you can integrate libraries like [`crypto-js`](https://github.com/brix/crypto-js) or the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) to encrypt data before storing it in a database or file.



<center>
    <a href="https://rxdb.info/">
        <img src="/files/logo/rxdb_javascript_database.svg" alt="RxDB" width="250" />
    </a>
</center>

## Setting Up Encryption in RxDB for React Native

### 1. Install RxDB and Required Plugins

Install RxDB and the encryption plugin(s) you need. For the CryptoJS plugin:

```bash
npm install rxdb
npm install crypto-js
```

### 2. Set Up Your RxDB Database with Encryption

RxDB offers two [encryption plugins](../encryption.md):
- **CryptoJS Plugin**: A free and straightforward solution for most basic use cases.
- **Web Crypto Plugin**: A [premium plugin](/premium) that utilizes the native Web Crypto API for better performance and security.

Below is an example showing how to set up RxDB using the CryptoJS plugin. This example uses the [in-memory storage](../rx-storage-memory.md) for testing purposes. In a real production scenario, you would use a persistent storage adapter, mostly the [SQLite-based storage](../rx-storage-sqlite.md).

```js
import { createRxDatabase } from 'rxdb';
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';

/*
 * For testing, we use the in-memory storage of RxDB.
 * In production you would use the persistent SQLite based storage instead.
 */
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';

async function initEncryptedDatabase() {
    // Wrap the normal storage with the encryption plugin
    const encryptedMemoryStorage = wrappedKeyEncryptionCryptoJsStorage({
        storage: getRxStorageMemory()
    });

    // Create an encrypted database
    const db = await createRxDatabase({
        name: 'myEncryptedDatabase',
        storage: encryptedMemoryStorage,
        password: 'sudoLetMeIn' // Make sure not to hardcode in production
    });

    // Define a schema and create a collection
    await db.addCollections({
        secureData: {
            schema: {
                title: 'secure data schema',
                version: 0,
                type: 'object',
                primaryKey: 'id',
                properties: {
                    id: {
                        type: 'string',
                        maxLength: 100
                    },
                    normalField: {
                        type: 'string'
                    },
                    secretField: {
                        type: 'string'
                    }
                },
                required: ['id', 'normalField', 'secretField']
            }
        }
    });

    return db;
}
```


### 3. Inserting and Querying Encrypted Data

Once you've set up the database with encryption, data in fields specified by your schema will be encrypted automatically before it is stored, and decrypted when queried.

```js
(async () => {
    const db = await initEncryptedDatabase();

    // Insert encrypted data
    const doc = await db.secureData.insert({
        id: 'mySecretId',
        normalField: 'foobar',
        secretField: 'This is top secret data'
    });

    // Query encrypted data by its primary key or non-encrypted fields
    const fetchedDoc = await db.secureData.findOne({
        selector: {
            normalField: 'foobar'
        }
    }).exec(true);
    console.log(fetchedDoc.secretField); // 'This is top secret data'

    // Update data
    await fetchedDoc.patch({
        secretField: 'Updated secret data'
    });
})();
```

**Note**: You can only query directly by non-encrypted fields or primary keys. Encrypted fields cannot be used in queries because they are stored as ciphertext in the database. A common approach is to have a small subset of fields that need to be queried unencrypted while storing any sensitive data in encrypted fields.

## Best Practices for React Native Encryption


- **Secure Password Handling**
  - Avoid hardcoding passwords or encryption keys.
  - Use secure storage solutions like React Native Keychain or react-native-encrypted-storage to fetch the database password at runtime:

```js
// Example: using react-native-keychain to securely retrieve a stored password
import * as Keychain from 'react-native-keychain';

async function getDatabasePassword() {
    const credentials = await Keychain.getGenericPassword();
    if (credentials) {
        return credentials.password;
    }
    throw new Error('No password stored in Keychain');
}
```

- **Encrypt Attachments**:
If you need to store files (images, text files, etc.), consider encrypting attachments. RxDB supports attachments that can be encrypted automatically, ensuring your files are protected:

```ts
import { createBlob } from 'rxdb/plugins/core';
const doc = await await db.secureData.findOne({
    selector: {
        normalField: 'foobar'
    }
}).exec(true);
const attachment = await doc.putAttachment({
    id: 'encryptedFile.txt',
    data: createBlob('Sensitive content', 'text/plain'),
    type: 'text/plain',
});
```

- **Optimize Performance**
  - If performance is critical, consider using the premium Web Crypto plugin, which leverages native APIs for faster encryption and decryption.
  - If big chunks of data are encrypted, store them in attachments instead of document fields. Attachments will only be decrypted on explicit fetches, not during queries.

- **Use DevMode in Development**: RxDB's [DevMode Plugin](../dev-mode.md) can help validate your schema and encryption setup during development. Disable it in production for performance reasons.

- **Secure Communication**: 
  - Use HTTPS to secure network communication between the app and any backend services.
  - If you're synchronizing data to a server, ensure the data is also encrypted in transit. RxDB's [replication plugins](../replication.md) can work with secure endpoints to keep data consistent.

- **SSL Pinning**: Consider SSL Pinning if you want to prevent man-in-the-middle attacks. SSL Pinning ensures the device trusts only the pinned certificate, preventing attackers from swapping out valid certificates with their own.

## Follow Up

- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md) for a guided introduction.
- A good way to learn using RxDB database with React Native is to check out the [RxDB React Native example](https://github.com/pubkey/rxdb/tree/master/examples/react-native) and use that as a tutorial.
- Check out the [RxDB GitHub repository](https://github.com/pubkey/rxdb) and leave a star ⭐ if you find it useful.
- Learn more about the [RxDB encryption plugins](../encryption.md).

By following these best practices and leveraging RxDB's powerful encryption plugins, you can build secure, performant, and robust React Native applications that keep your users' data safe.

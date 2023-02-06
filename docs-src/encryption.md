# Encryption

With the encryption plugins you can define properties of your documents to be stored encrypted. This ensure that when your users device is stolen, the encrypted data cannot be read out of the hard drive.
The encryption and decryption happens internally, so when you work with a `RxDocument`, you can access any property like normal, **but** encrypted fields cannot be used as operators in a query.

RxDB currently has two plugins for encryption:

- The free `encryption-crypto-js` plugin that is based on the `AES` algorithm of the [crypto-js](https://www.npmjs.com/package/crypto-js) library
- The [premium](./premium.html) `encryption-web-crypto` plugin that is based on the native [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) which makes it faster and more secure to use. Document inserts are about 10x faster compared to `crypto-js`.


## Usage

An encryption plugin is a wrapper around any other [RxStorage](./rx-storage.md). 

- You first have to wrap your RxStorage with the encryption
- Then use that as `RxStorage` when calling `createRxDatabase()`
- Also you have to set a **password** when creating the database. The format of the password depends on which encryption plugin is used.
- To define a field as being encrypted, you have to add it to the `encrypted` fields list in the schema.

```ts
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';


const encryptedDexieStorage = wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageDexie()
});


const db = await createRxDatabase<RxStylechaseCollections>({
    name: 'mydatabase',
    storage: encryptedDexieStorage,
    password: 'foooooobaaaaar'
});


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
  required: ['id']
  encrypted: ['secret']
};

await db.addCollections({
    stuff: {
        schema
    }
})
```

Or with the `web-crypto` [premium](./premium.html) plugin:

```ts
import { wrappedKeyEncryptionWebCryptoStorage, createPassword } from 'rxdb-premium/plugins/encryption-web-crypto';
import { getRxStorageIndexedDB } from 'rxdb-premium/plugins/storage-indexeddb';


const encryptedIndexedDbStorage = wrappedKeyEncryptionWebCryptoStorage({
    storage: getRxStorageIndexedDB()
});

const myPasswordObject = {
    // Algorithm can be oneOf: 'AES-CTR' | 'AES-CBC' | 'AES-GCM'
    algorithm: 'AES-CTR',
    password: 'myRandomPasswordWithMin8Length'
};

const db = await createRxDatabase<RxStylechaseCollections>({
    name: 'mydatabase',
    storage: encryptedIndexedDbStorage,
    password: myPasswordObject
});
```

## Changing the password

The password is set database specific and it is not possible to change the password of a database. Opening an existing database with a different password will throw an error. To change the password you can either :
- Use the [storage migration plugin](./storage-migration.md) to migrate the database state into a new database.
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
        encrypted: true // if true, the attachment-data will be encrypted with the db-password
    }
};
```

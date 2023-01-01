# Encryption

With the encryption plugin you can define properties of your documents to be stored encrypted. This ensure that when your users device is stolen, the encrypted data cannot be read out of the hard drive.
The encryption and decryption happens internally, so when you work with a `RxDocument`, you can access any property like normal. **But** encrypted fields cannot be used inside of a query.

The encryption-module is using the `AES` algorithm of the [crypto-js](https://www.npmjs.com/package/crypto-js) library.


## Usage

The encryption plugin is a wrapper around any other [RxStorage](./rx-storage.md). 

- You first have to wrap your RxStorage with the encryption
- Then use that as `RxStorage` when calling `createRxDatabase()`
- Also you have to set a **password** when creating the database. In most use cases you would ask the user to input the password when starting the application.
- To define a field as being encrypted, you have to add it to the `encrypted` in the schema.

```ts
import { wrappedKeyEncryptionStorage } from 'rxdb/plugins/encryption';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';


const encryptedDexieStorage = wrappedKeyEncryptionStorage({
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


## Changing the password

At the moment it is not possible to change the password. Opening an existing database with a different password will throw an error. To change the password you can use the [storage migration plugin](./storage-migration.md).


## Encrypted attachments

To store the attachments data encrypted, you have to set `encrypted: true` in the `attachments` property of the schema.


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

# Key Compression

With the key compression plugin, documents will be stored in a compressed format which saves up to 40% disc space.
For compression the npm module [jsonschema-key-compression](https://github.com/pubkey/jsonschema-key-compression) is used.
It compresses json-data based on its json-schema while still having valid json. It works by compressing long attribute-names into smaller ones and backwards.

The compression and decompression happens internally, so when you work with a `RxDocument`, you can access any property like normal.

## Enable key compression

The key compression plugin is a wrapper around any other [RxStorage](./rx-storage.md). 

- You first have to wrap your RxStorage with the key compression plugin
- Then use that as `RxStorage` when calling `createRxDatabase()`
- Then you have to enable the key compression by adding `keyCompression: true` to your collection schema.


```ts
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const storageWithKeyCompression = wrappedKeyCompressionStorage({
    storage: getRxStorageDexie()
});

const db = await createRxDatabase<RxStylechaseCollections>({
    name: 'mydatabase',
    storage: storageWithKeyCompression
});

const mySchema = {
  keyCompression: true, // set this to true, to enable the keyCompression
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      }
      /* ... */
  }
};

/* ... */
```


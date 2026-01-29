---
title: Key Compression
slug: key-compression.html
image: /headers/key-compression.jpg
---

import {Steps} from '@site/src/components/steps';

# Key Compression

With the key compression plugin, documents will be stored in a compressed format which saves up to 40% disc space.
For compression the npm module [jsonschema-key-compression](https://github.com/pubkey/jsonschema-key-compression) is used.
It compresses json-data based on its json-schema while still having valid json. It works by compressing long attribute-names into smaller ones and backwards.

The compression and decompression happens internally, so when you work with a [RxDocument](./rx-document.md), you can access any property like normal.

## Enable key compression

The key compression plugin is a wrapper around any other [RxStorage](./rx-storage.md). 

<Steps>

### Wrap your RxStorage with the key compression plugin

```ts
import { wrappedKeyCompressionStorage } from 'rxdb/plugins/key-compression';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const storageWithKeyCompression = wrappedKeyCompressionStorage({
    storage: getRxStorageLocalstorage()
});
```

### Create an RxDatabase

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
const db = await createRxDatabase({
    name: 'mydatabase',
    storage: storageWithKeyCompression
});
```

### Create a compressed RxCollection

```ts

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
await db.addCollections({
    docs: {
        schema: mySchema
    }
});
```




</Steps>


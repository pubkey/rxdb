---
title: Key Compression
slug: key-compression.html
description: Use the RxDB key compression plugin to store documents in a compressed format, saving up to 40% disk space through JSON schema-based property name shortening.
image: /headers/key-compression.jpg
---

import {Steps} from '@site/src/components/steps';
import {DocsAnimation} from '@site/src/components/docs-animation';
import {KeyCompressionLogo} from '@site/src/components/animations/key-compression-logo';

# Key Compression

With the key compression plugin, documents will be stored in a compressed format which saves up to 40% disk space.
For compression the npm module [jsonschema-key-compression](https://github.com/pubkey/jsonschema-key-compression) is used.
It compresses json-data based on its json-schema while still having valid json. It works by compressing long attribute-names into smaller ones and backwards.

The compression and decompression happens internally, so when you work with a [RxDocument](./rx-document.md), you can access any property like normal.

<DocsAnimation subtitle="Long JSON keys compressed into short tokens">
<KeyCompressionLogo />
</DocsAnimation>

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
const myDatabase = await createRxDatabase({
    name: 'mydatabase',
    storage: storageWithKeyCompression
});
```

### Create a compressed RxCollection

```ts
const todoSchema = {
  keyCompression: true, // set this to true, to enable the keyCompression
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      name: {
          type: 'string'
      },
      done: {
          type: 'boolean',
          default: false
      }
      /* ... */
  },
  required: ['id', 'name', 'done']
};
await myDatabase.addCollections({
    todos: {
        schema: todoSchema
    }
});

await myDatabase.todos.insert({ id: 'todo1', name: 'Learn RxDB' });
const doc = await myDatabase.todos.findOne('todo1').exec();
// the document data is decompressed when you access it
console.log(doc.name);
// > 'Learn RxDB'
```



</Steps>

## Limitations

- **Keys must not start with `|`**: Compressed keys are marked with the compression flag `|` as their first character. This means a key that starts with `|` cannot be distinguished from a compressed key, so it cannot be stored in a collection with `keyCompression: true`. This only affects fields where the keys are not defined in the schema, like an object with `additionalProperties` or `patternProperties`. A write with such a key is rejected with a schema validation error (`insert()` throws [`VD2`](./errors.md#VD2)) and all other documents of the same bulk write are still stored. A `|` at any other position of the key (`a|b`) works.

Let's say the `todos` schema has an additional field `labels: { type: 'object' }` where the keys are not defined in the schema:

```ts
const result = await myDatabase.todos.bulkInsert([
    { id: 'todo1', name: 'Learn RxDB', labels: { 'a|b': 'works' } },
    { id: 'todo2', name: 'Buy groceries', labels: { '|a': 'is rejected' } }
]);
console.log(result.success.map(doc => doc.id));
// > ['todo1']
console.log(result.error.map(error => error.documentId));
// > ['todo2']
```

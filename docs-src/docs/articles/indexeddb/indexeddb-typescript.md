---
title: IndexedDB with TypeScript - Type-Safe Browser Storage
slug: indexeddb-typescript.html
description: Use IndexedDB with TypeScript and get full type safety. Compare typing the native API, idb, and schema-derived types with RxDB.
image: /headers/indexeddb-typescript.jpg
---

import {Faq, FaqItem} from '@site/src/components/faq';

# IndexedDB with TypeScript

[IndexedDB](../../rx-storage-indexeddb.md) is the standard [browser storage](../browser-storage.md) API for structured data. It works in every modern browser and can hold large amounts of JSON and binary data. But its TypeScript story is weak. The native API returns loosely typed values, so most reads come back as `any` and you lose the type safety that made you pick TypeScript in the first place.

This page explains where the native IndexedDB types fall short, how to add types by hand, and how libraries like [idb](https://github.com/jakearchibald/idb) and [RxDB](https://rxdb.info/) give you type-safe access, with RxDB deriving the types straight from your schema.

<RxdbLogo alt="IndexedDB with TypeScript" />

## The Problem with Native IndexedDB Types

The DOM type definitions ship with `lib.dom.d.ts`, so `IDBDatabase`, `IDBObjectStore`, and `IDBRequest` are typed. The trouble is what those types say. A read gives you back an `IDBRequest`, and its `result` property is typed as `any`.

```ts
const request = store.get('user-1');
request.onsuccess = () => {
  // request.result is `any`. No autocomplete, no checking.
  const user = request.result;
  console.log(user.naem); // typo compiles fine, breaks at runtime
};
```

There are three problems here:

- **`result` is `any`**: Every value you read is untyped, so a typo in a field name compiles and fails only at runtime.
- **No schema link**: TypeScript does not know which object stores exist or what shape their records have. You get no error when you read from a store that does not exist.
- **Manual casts everywhere**: To get any safety back you cast every read (`request.result as User`), which is a promise you make to the compiler, not a check it performs.

TypeScript cannot infer types across the IndexedDB boundary. You have to add them.

## Typing the Native API by Hand

You can layer your own types on top with generics and casts. It removes some of the pain but not all of it.

```ts
type User = {
  id: string;
  name: string;
  age: number;
};

function getUser(db: IDBDatabase, id: string): Promise<User> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readonly');
    const request = tx.objectStore('users').get(id);
    // The cast is a claim, not a guarantee.
    request.onsuccess = () => resolve(request.result as User);
    request.onerror = () => reject(request.error);
  });
}
```

The value is still whatever IndexedDB stored. The `as User` cast tells the compiler to trust you. If the stored record does not match, TypeScript stays silent and the bug surfaces later. For real safety you also need runtime validation, which raw IndexedDB does not provide.

## Type-Safe Wrappers

Libraries close the gap in different ways. See the [best IndexedDB wrapper](./best-indexeddb-wrapper.md) comparison for the full feature picture. Here we look only at the typing.

### idb

The [idb](https://github.com/jakearchibald/idb) library accepts a `DBSchema` type parameter. You describe your stores once, and every read and write is typed against it.

```ts
import { openDB, DBSchema } from 'idb';

interface MyDB extends DBSchema {
  users: {
    key: string;
    value: { id: string; name: string; age: number };
    indexes: { 'by-age': number };
  };
}

const db = await openDB<MyDB>('mydb', 1, {
  upgrade(db) {
    const store = db.createObjectStore('users', { keyPath: 'id' });
    store.createIndex('by-age', 'age');
  }
});

const user = await db.get('users', 'user-1');
// user is typed as { id: string; name: string; age: number } | undefined
```

This is a big step up. Reads are typed, store names are checked, and index names are validated. The type is still a claim about what is stored, not a runtime check, so a corrupted record slips through, but the developer experience is much better than the raw API.

### RxDB

[RxDB](https://rxdb.info/) is a local-first database that runs on IndexedDB (or faster storages) and takes a different approach. You define a [JSON Schema](../../rx-schema.md) once, and RxDB derives the TypeScript type from it. There is a single source of truth, so the type and the runtime validation cannot drift apart.

```ts
import {
  toTypedRxJsonSchema,
  ExtractDocumentTypeFromTypedRxJsonSchema,
  RxJsonSchema
} from 'rxdb';

const userSchemaLiteral = {
  title: 'user schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    age: { type: 'integer' }
  },
  required: ['id', 'name', 'age'],
  indexes: ['age']
} as const; // <- 'as const' preserves the literal type

const schemaTyped = toTypedRxJsonSchema(userSchemaLiteral);

// The document type is derived from the schema, not written twice.
export type UserDocType =
  ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;

export const userSchema: RxJsonSchema<UserDocType> = userSchemaLiteral;
```

Once the collection is created, queries and documents are fully typed, and every write is validated against the schema at runtime:

```ts
const adults = await db.users.find({
  selector: { age: { $gt: 17 } }
}).exec();
// adults is typed as RxDocument<UserDocType>[]

const first = adults[0];
first.name; // string, checked
first.get('naem'); // TypeScript error, unknown field
```

The difference is that the type and the validation come from the same schema. With the wrappers above you write the type once and hope the stored data matches. With RxDB the schema drives both the compile-time type and the runtime [schema validation](../../schema-validation.md), so a document that does not fit is rejected on write. See the full [TypeScript tutorial](../../tutorials/typescript.md) for typing collections, ORM methods, and documents.

## How the Options Compare

| Typing aspect | Native IndexedDB | idb | RxDB |
| --- | --- | --- | --- |
| Reads typed | ❌ `any` | ✅ via `DBSchema` | ✅ from schema |
| Store/collection names checked | ❌ | ✅ | ✅ |
| Query results typed | ❌ | ⚠️ key ranges only | ✅ |
| Single source of truth | ❌ | ❌ type only | ✅ schema |
| Runtime validation | ❌ | ❌ | ✅ schema validation |
| Type from schema | ❌ | ❌ manual | ✅ derived |

## FAQ

<Faq>
<FaqItem question="Does IndexedDB have TypeScript types?">

Yes, but they are weak. The DOM library types `IDBDatabase` and friends, yet reads return an `IDBRequest` whose `result` is `any`. So you get no type safety on the data itself. A wrapper like **[idb](https://github.com/jakearchibald/idb)** or **[RxDB](../../rx-schema.md)** is needed for typed reads.

</FaqItem>
<FaqItem question="How do I get type-safe queries on IndexedDB?">

Use a library that carries types through the query. RxDB types query results as `RxDocument<T>` where `T` is derived from your [schema](../../rx-schema.md), so filters and result arrays stay typed. The raw API only supports key-range lookups and returns `any`.

</FaqItem>
<FaqItem question="What is the difference between a typed wrapper and runtime validation?">

A typed wrapper checks your code at compile time. It does not check the data at runtime, so a record that does not match the type still loads. RxDB adds runtime [schema validation](../../schema-validation.md) from the same schema that produces the type, so invalid documents are rejected on write.

</FaqItem>
<FaqItem question="Can I generate TypeScript types from a JSON schema?">

Yes. RxDB derives the document type from its schema with `ExtractDocumentTypeFromTypedRxJsonSchema`. If your schema lives in a `.json` file, you can also generate types at build time with a tool like [json-schema-to-typescript](https://www.npmjs.com/package/json-schema-to-typescript).

</FaqItem>
</Faq>

## Follow Up

- Read the full [RxDB TypeScript tutorial](../../tutorials/typescript.md)
- Learn about the [RxDB schema](../../rx-schema.md) and [schema validation](../../schema-validation.md)
- Compare the [best IndexedDB wrappers](./best-indexeddb-wrapper.md)
- Start with the [RxDB Quickstart](../../quickstart.md)
- Check the [RxDB code on GitHub](/code/) and leave a star ⭐

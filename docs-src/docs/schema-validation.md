---
title: Schema Validation
slug: schema-validation.html
---

# Schema validation

RxDB has multiple validation implementations that can be used to ensure that your document data is always matching the provided JSON 
schema of your [RxCollection](./rx-collection.md).

The schema validation is **not a plugin** but comes in as a wrapper around any other `RxStorage` and it will then validate all data that is written into that storage. This is required for multiple reasons:
- It allows us to run the validation inside of a [Worker RxStorage](./rx-storage-worker.md) instead of running it in the main JavaScript process.
- It allows us to configure which [RxDatabase](./rx-database.md) instance must use the validation and which does not. In production it often makes sense to validate user data, but you might not need the validation for data that is only replicated from the backend.

:::warning
Schema validation can be **CPU expensive** and increases your build size. You should always use a schema validation in development mode. For most use cases, you **should not** use a validation in production for better performance.
:::

When no validation is used, any document data can be saved but there might be **undefined behavior** when saving data that does not comply to the schema of a `RxCollection`.


RxDB has different implementations to validate data, each of them is based on a different [JSON Schema library](https://json-schema.org/tools). In this example we use the [LocalStorage RxStorage](./rx-storage-localstorage.md), but you can wrap the validation around **any other** [RxStorage](./rx-storage.md).

### validate-ajv

A validation-module that does the schema-validation. This one is using [ajv](https://github.com/epoberezkin/ajv) as validator which is a bit faster. Better compliant to the jsonschema-standard but also has a bigger build-size.

```javascript
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the validation around the main RxStorage
const storage = wrappedValidateAjvStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: randomCouchString(10),
    storage
});
```

### validate-z-schema

Both `is-my-json-valid` and `validate-ajv` use `eval()` to perform validation which might not be wanted when `'unsafe-eval'` is not allowed in Content Security Policies. This one is using [z-schema](https://github.com/zaggino/z-schema) as validator which doesn't use `eval`.

```javascript
import { wrappedValidateZSchemaStorage } from 'rxdb/plugins/validate-z-schema';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the validation around the main RxStorage
const storage = wrappedValidateZSchemaStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: randomCouchString(10),
    storage
});
```


### validate-is-my-json-valid

**WARNING**: The `is-my-json-valid` validation is no longer supported until [this bug](https://github.com/mafintosh/is-my-json-valid/pull/192) is fixed.

The `validate-is-my-json-valid` plugin uses [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) for schema validation.

```javascript
import { wrappedValidateIsMyJsonValidStorage } from 'rxdb/plugins/validate-is-my-json-valid';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the validation around the main RxStorage
const storage = wrappedValidateIsMyJsonValidStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: randomCouchString(10),
    storage
});
```

## Custom Formats

The schema validators provide methods to add custom formats like a `email` format.
You have to add these formats **before** you create your database.

### Ajv Custom Format

```ts
import { getAjv } from 'rxdb/plugins/validate-ajv';
const ajv = getAjv();
ajv.addFormat('email', {
    type: 'string',
    validate: v => v.includes('@') // ensure email fields contain the @ symbol
});
```

### Z-Schema Custom Format

```ts
import { ZSchemaClass } from 'rxdb/plugins/validate-z-schema';
ZSchemaClass.registerFormat('email', function (v: string) {
    return v.includes('@'); // ensure email fields contain the @ symbol
});
```


## Performance comparison of the validators

The RxDB team ran performance benchmarks using two storage options on an Ubuntu 24.04 machine with Chrome version `131.0.6778.85`. The testing machine has 32 core `13th Gen Intel(R) Core(TM) i9-13900HX` CPU.

IndexedDB Storage (based on the IndexedDB API in the browser):

| **IndexedDB Storage** | Time to First insert | Insert 3000 documents |
| ----------------- | :------------------: | --------------------: |
| no validator      |        68 ms         |                213 ms |
| ajv               |        67 ms         |                216 ms |
| z-schema          |        71 ms         |                230 ms |

Memory Storage: stores everything in memory for extremely fast reads and writes, with no persistence by default. Often used with the RxDB memory-mapped plugin that processes data in memory an later persists to disc in background:

| **Memory Storage** | Time to First insert | Insert 3000 documents |
| ------------------ | :------------------: | --------------------: |
| no validator       |       1.15 ms        |                0.8 ms |
| ajv                |       3.05 ms        |                2.7 ms |
| z-schema           |        0.9 ms        |                 18 ms |


Including a validator library also increases your JavaScript bundle size. Here's how it breaks down (minified + gzip):

| **Build Size** (minified+gzip) | Build Size (IndexedDB) | Build Size (memory) |
| ------------------------------ | :----------------: | ------------------: |
| no validator                   |      73103 B       |             39976 B |
| ajv                            |      106135 B      |             72773 B |
| z-schema                       |      125186 B      |             91882 B |

---
title: Schema Validation
slug: schema-validation.html
description: Validate RxDB document data against JSON schemas using pluggable validation wrappers like ajv, zod, or is-my-json-valid for development and production use.
image: /headers/schema-validation.jpg
---

import { PerformanceChart } from '@site/src/components/performance-chart';
import { PERFORMANCE_DATA_VALIDATION_INDEXEDDB, PERFORMANCE_DATA_VALIDATION_MEMORY, PERFORMANCE_DATA_VALIDATION_AJV_STANDALONE } from '@site/src/components/performance-data';
import {Faq, FaqItem} from '@site/src/components/faq';
import {DocsAnimation} from '@site/src/components/docs-animation';
import {SchemaValidationLogo} from '@site/src/components/animations/schema-validation-logo';

# Schema validation

RxDB has multiple validation implementations that can be used to ensure that your document data is always matching the provided JSON 
schema of your [RxCollection](./rx-collection.md).

<DocsAnimation subtitle="An invalid document rejected by the schema">
<SchemaValidationLogo />
</DocsAnimation>

The schema validation is **not a plugin** but comes in as a wrapper around any other `RxStorage` and it will then validate all data that is written into that storage. This is required for multiple reasons:
- It allows us to run the validation inside of a [Worker RxStorage](./rx-storage-worker.md) instead of running it in the main JavaScript process.
- It allows us to configure which [RxDatabase](./rx-database.md) instance must use the validation and which does not. In production it often makes sense to validate user data, but you might not need the validation for data that is only replicated from the backend.

:::warning
Schema validation can be **CPU expensive** and increases your build size. You should always use a schema validation in development mode. When you also validate in production, use the [validate-ajv-standalone](#validate-ajv-standalone) plugin for the smallest build size and the best performance.
:::

When no validation is used, any document data can be saved but there might be **undefined behavior** when saving data that does not comply to the schema of a `RxCollection`.


RxDB has different implementations to validate data, each of them is based on a different [JSON Schema library](https://json-schema.org/tools). In this example we use the [LocalStorage RxStorage](./rx-storage-localstorage.md), but you can wrap the validation around **any other** [RxStorage](./rx-storage.md).

### validate-ajv

A validation-module that does the schema-validation. This one is using [ajv](https://github.com/epoberezkin/ajv) as validator which is a bit faster. Better compliant to the jsonschema-standard but also has a bigger build-size.

```javascript
import { createRxDatabase, randomToken } from 'rxdb/plugins/core';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the validation around the main RxStorage
const storage = wrappedValidateAjvStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: randomToken(10),
    storage
});
```

### validate-ajv-standalone

The `validate-ajv` plugin ships the full ajv compiler to the client and compiles each schema at runtime. With the `validate-ajv-standalone` plugin you instead compile your schemas at build time with the [ajv standalone tools](https://ajv.js.org/standalone.html) and only ship the generated validate functions. Compared to the `validate-ajv` plugin, this saves about `125 KB` minified (about `39 KB` gzipped) in your bundle size. Each generated validator adds a few KB, for example `5 KB` minified for a todo schema with four fields. Because no code is compiled in the browser, the standalone validators also work with Content Security Policies that do not allow `'unsafe-eval'`.

The storage instance does not get your plain schema. It gets the full schema with the RxDB internal fields like `_deleted`, `_rev` and `_meta`. So at build time you have to call `getStandaloneValidationSchema()`, which returns that full `jsonSchema` and its `hash`. Compile the `jsonSchema` with an ajv instance from `createAjv()` so that ajv knows the RxDB specific schema keywords and formats. Only import `createAjv()` in the build script. When you import it in your app code, ajv ends up in your bundle again:

```js
// build-validators.mjs, runs at build time in Node.js
import fs from 'node:fs';
import standaloneCode from 'ajv/dist/standalone/index.js';
import {
    createAjv,
    getStandaloneValidationSchema
} from 'rxdb/plugins/validate-ajv-standalone';
import { todoSchema, userSchema } from './src/schemas.mjs';

const imports = [];
const entries = [];
for (const [i, schema] of [todoSchema, userSchema].entries()) {
    const { hash, jsonSchema } = await getStandaloneValidationSchema(schema);
    const ajv = createAjv({ code: { source: true, esm: true } });
    const code = standaloneCode(ajv, ajv.compile(jsonSchema));
    fs.writeFileSync(`src/validator-${i}.mjs`, code);
    imports.push(`import v${i} from './validator-${i}.mjs';`);
    entries.push(`'${hash}': v${i}`);
}
fs.writeFileSync(
    'src/validators.mjs',
    imports.join('\n') +
    '\nexport const validatorBySchemaHash = {' + entries.join(',') + '};\n'
);
```

In the app, pass the generated `validatorBySchemaHash` map to the storage wrapper. When a storage instance is created, the plugin hashes its schema and looks up the validator. If no validator exists for that hash, it throws the error [`VD3`](./errors.md#VD3).

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import {
    wrappedValidateAjvStandaloneStorage
} from 'rxdb/plugins/validate-ajv-standalone';
import { validatorBySchemaHash } from './validators.mjs';

const db = await createRxDatabase({
    name: 'mydb',
    storage: wrappedValidateAjvStandaloneStorage({
        storage: getRxStorageDexie(),
        validatorBySchemaHash
    })
});
```

Keep in mind that:
- You have to rerun the build script whenever a schema changes, because any change also changes the hash.
- During a [schema migration](./migration-schema.md), RxDB opens the storage instance of the previous schema version. So you have to include the validators of previous schema versions as long as clients can still have data stored with them.
- The storage instances that RxDB creates for its own data (the internal store, [local documents](./rx-local-document.md) and replication meta data) are not validated and need no validator.
- The hash is equal to `await myCollection.schema.hash` when the database uses the default `hashFunction`.

The validation itself runs at the same speed as with `validate-ajv`, because ajv generates the same validation code in both cases. The difference is the startup time: `validate-ajv` compiles each schema when the first document is written, while `validate-ajv-standalone` only looks up the precompiled validator. The following results were measured with the [Memory RxStorage](./rx-storage-memory.md) on Node.js 22 (lower is better). Each test run takes the median of 40 runs, and the chart shows the best of 5 test runs. Each run uses a new schema, so that `validate-ajv` cannot reuse a compiled validator. You can reproduce them with `npm run test:performance:validation`.

<PerformanceChart title="ajv vs. ajv-standalone on Memory Storage" data={PERFORMANCE_DATA_VALIDATION_AJV_STANDALONE} logScale={false} />

### validate-effect

The `validate-effect` plugin validates documents against the collection's JSON schema with [Effect Schema](https://effect.website/docs/schema/introduction/)'s stable Draft 2020-12 JSON Schema importer. It is useful when your app already depends on [Effect](https://effect.website/) and you do not want to add a second validator. Like the other validation wrappers, it wraps any `RxStorage` and validates every write. Failures are mapped to the same `RxValidationError` shape that the other validators produce.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { wrappedValidateEffectStorage } from 'rxdb/plugins/validate-effect';

const db = await createRxDatabase({
    name: 'mydb',
    storage: wrappedValidateEffectStorage({
        storage: getRxStorageDexie()
    })
});
```

The plugin requires `effect` version 4.1.4 or newer.

Performance was measured with RxDB's own validation benchmark in fast mode on published Effect 4.1.4, using the [Memory RxStorage](./rx-storage-memory.md). In one fast-mode run, time-to-first-insert was 0.77 ms with no validator, 2.75 ms with Ajv and 1.57 ms with this plugin. The insert of 3,000 documents measured 0.95 ms, 2.50 ms and 12.5 ms in the same order. These are one-host medians, not an SLA. The first insert is faster than Ajv, but bulk inserts are slower than Ajv. You can reproduce the numbers with `NODE_ENV=fast DEFAULT_STORAGE=memory npm run test:performance:validation`.

#### Authoring the schema in Effect

The core plugin validates a JSON schema, so you can use it with a plain RxDB JSON schema. To author the collection schema in Effect itself, use the external package [rxdb-effect-schema](https://github.com/nickchomey/rxdb-effect-schema). Its `effectSchemaToRxJsonSchema()` function converts an Effect schema into an RxDB JSON schema:

```bash
npm install github:nickchomey/rxdb-effect-schema
```

The package is distributed from its repository, not npm, and the import name stays `rxdb-effect-schema`.

```ts
import { Schema } from 'effect';
import { effectSchemaToRxJsonSchema } from 'rxdb-effect-schema';

const Hero = Schema.Struct({
    id: Schema.String.check(Schema.isMaxLength(100)),
    name: Schema.String
});

const heroSchema = effectSchemaToRxJsonSchema(Hero, {
    version: 0,
    primaryKey: 'id'
});

await db.addCollections({
    heroes: { schema: heroSchema }
});
```

RxDB requires `maxLength` on a string primary key field.

The converter emits the RxDB JSON schema, so RxDB still stores a JSON schema and the `validate-effect` wrapper validates it with Effect. The `rxdb-effect-schema` package is external and maintained by its author. It does not ship as part of the core `validate-effect` plugin. Recursive schemas are rejected because RxDB does not support `$ref`. Effect refinements that the JSON Schema exporter cannot express do not survive the conversion.

### validate-z-schema

Both `is-my-json-valid` and `validate-ajv` use `eval()` to perform validation which might not be wanted when `'unsafe-eval'` is not allowed in Content Security Policies. This one is using [z-schema](https://github.com/zaggino/z-schema) as validator which doesn't use `eval`.

```javascript
import { createRxDatabase, randomToken } from 'rxdb/plugins/core';
import { wrappedValidateZSchemaStorage } from 'rxdb/plugins/validate-z-schema';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the validation around the main RxStorage
const storage = wrappedValidateZSchemaStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: randomToken(10),
    storage
});
```


### validate-is-my-json-valid

**WARNING**: The `is-my-json-valid` validation is no longer supported until [this bug](https://github.com/mafintosh/is-my-json-valid/pull/192) is fixed.

The `validate-is-my-json-valid` plugin uses [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) for schema validation.

```javascript
import { createRxDatabase, randomToken } from 'rxdb/plugins/core';
import {
    wrappedValidateIsMyJsonValidStorage
} from 'rxdb/plugins/validate-is-my-json-valid';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// wrap the validation around the main RxStorage
const storage = wrappedValidateIsMyJsonValidStorage({
    storage: getRxStorageLocalstorage()
});

const db = await createRxDatabase({
    name: randomToken(10),
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

<PerformanceChart title="Schema Validation on IndexedDB Storage" data={PERFORMANCE_DATA_VALIDATION_INDEXEDDB} logScale={false} />

Memory Storage: stores everything in memory for extremely fast reads and writes, with no persistence by default. Often used with the RxDB memory-mapped plugin that processes data in memory and later persists to disc in background:

<PerformanceChart title="Schema Validation on Memory Storage" data={PERFORMANCE_DATA_VALIDATION_MEMORY} logScale={false} />


Including a validator library also increases your JavaScript bundle size. Here's how it breaks down (minified + gzip):

| **Build Size** (minified+gzip) | Build Size (IndexedDB) | Build Size (memory) |
| ------------------------------ | :----------------: | ------------------: |
| no validator                   |      73103 B       |             39976 B |
| ajv                            |      106135 B      |             72773 B |
| z-schema                       |      125186 B      |             91882 B |

## FAQ

<Faq>
<FaqItem question="What is schema validation and does ajv-formats use eval internally?">

Schema validation structurally guarantees that all document mutations strictly comply with the statically defined **[RxCollection](./rx-collection.md)** JSON Schema format before data is physically committed to the underlying `RxStorage`. Yes, both `ajv` (via `ajv-formats`) and `is-my-json-valid` rely natively on `eval()` or `new Function()` during compilation to aggressively optimize their validation runtimes. If your deployment environment enforces extremely strict `unsafe-eval` Content Security Policies (CSP), you must explicitly swap the validator wrapper to **`validate-z-schema`**, which strictly avoids `eval()` at the cost of marginally slower execution.

</FaqItem>
</Faq>

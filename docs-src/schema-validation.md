# Schema validation

RxDB has multiple validation implementations that can be used to ensure that your document data is always matching the provided JSON 
schema of your `RxCollection`.

The schema validation is **not a plugin** but comes in as a wrapper around any other `RxStorage` and it will then validate all data that is written into that storage. This is required for multiple reasons:
- It allows us to run the validation inside of a [Worker RxStorage](./rx-storage-worker.md) instead of running it in the main JavaScript process.
- It allows us to configure which `RxDatabase` instance must use the validation and which does not. In production it often makes sense to validate user data, but you might not need the validation for data that is only replicated from the backend.

**NOTICE:** Schema validation can be **CPU expensive** and increases your build size. You should always use a schema validation in development mode. For most use cases, you **should not** use a validation in production for better performance.

When no validation is used, any document data can be saved but there might be **undefined behavior** when saving data that does not comply to the schema of a `RxCollection`.


RxDB has different implementations to validate data, each of them is based on a different [JSON Schema library](https://json-schema.org/implementations.html). In this example we use the [Dexie.js RxStorage](./rx-storage-dexie.md), but you can wrap the validation around **any other** [RxStorage](./rx-storage.md).

### validate-ajv

A validation-module that does the schema-validation. This one is using [ajv](https://github.com/epoberezkin/ajv) as validator which is a bit faster. Better compliant to the jsonschema-standart but also has a bigger build-size.

```javascript
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// wrap the validation around the main RxStorage
const storage = wrappedValidateAjvStorage({
    storage: getRxStorageDexie()
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
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// wrap the validation around the main RxStorage
const storage = wrappedValidateZSchemaStorage({
    storage: getRxStorageDexie()
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
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

// wrap the validation around the main RxStorage
const storage = wrappedValidateIsMyJsonValidStorage({
    storage: getRxStorageDexie()
});

const db = await createRxDatabase({
    name: randomCouchString(10),
    storage
});
```



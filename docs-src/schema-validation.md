# Schema validation

RxDB has multiple plugins that can be used to ensure that your document data is always matching the provided JSON schema.

**NOTICE:** Schema validation can be CPU expensive and increases your build size. You should always use a scehma validation plugin in developement mode. For most use cases, you should not use a validation plugin in production.


The validation-module does the schema validation when you insert or update a `RxDocument` or when document data is replicated with the replication plugin. When no validation plugin is used, any document data can be safed but there might be undefined behavior when saving data that does not comply to the schema.



### validate

The `validate` plugin uses [is-my-json-valid](https://www.npmjs.com/package/is-my-json-valid) for schema validation.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
addRxPlugin(RxDBValidatePlugin);
```


### validate-ajv

Another validation-module that does the schema-validation. This one is using [ajv](https://github.com/epoberezkin/ajv) as validator which is a bit faster. Better compliant to the jsonschema-standart but also has a bigger build-size.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBValidateAjvPlugin } from 'rxdb/plugins/validate-ajv';
addRxPlugin(RxDBValidateAjvPlugin);
```

### validate-z-schema

Both `is-my-json-valid` and `validate-ajv` use `eval()` to perform validation which might not be wanted when `'unsafe-eval'` is not allowed in Content Security Policies. This one is using [z-schema](https://github.com/zaggino/z-schema) as validator which doesn't use `eval`.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBValidateZSchemaPlugin } from 'rxdb/plugins/validate-z-schema';
addRxPlugin(RxDBValidateZSchemaPlugin);
```



--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-collection.md)

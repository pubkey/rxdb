# before next major release

This list contains things that have to be done but will create breaking changes.


- Switch out default-validator to ajv
- disable KeyCompression by default.
- compress encrypted hex-strings before saving them
- refactor `rx-change-event.js` so the typings have a more clear structure
- RxDatabase().collection() currently accepts `RxSchema` and `RxJsonSchema` which is confusing. Only allow `RxJsonSchema`
- Schemas can currently have `required: true` only specific fields. This is agains the json-schema-standard. Required fields should be set via `required: ['fieldOne', 'fieldTwo']`
- Move to [babel-preset-env](https://babeljs.io/env/)

# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.

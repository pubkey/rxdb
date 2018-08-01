# before next major release

This list contains things that have to be done but will create breaking changes.


- [x] ~~Switch out default-validator to ajv~~ Canceled: Ajv increases the build size by 80kB and has a worse performance
- [x] disable KeyCompression by default.
- [x] ~~compress encrypted hex-strings before saving them~~ Canceled: Should be done by pouchdb
- [x] RxDatabase().collection() currently accepts `RxSchema` and `RxJsonSchema` which is confusing. Only allow `RxJsonSchema`
- [x] Schemas can currently have `required: true` only specific fields. This is agains the json-schema-standard. Required fields should be set via `required: ['fieldOne', 'fieldTwo']`
- [x] ~~Move to [babel-preset-env](https://babeljs.io/env/)~~ Canceled: Do this when babel7 is released
- [x] ~~refactor `rx-change-event.js` so the typings have a more clear structure~~ Canceled: Not worth the change
- [x] Do cross-instance communication with https://github.com/pubkey/broadcast-channel (faster, less performance-waste)
- [x] Set QueryChangeDetection via RxDatabase-option
- [x] @ngohuunam via gitter: "I need to apply to pouch setting option skip_setup: true. it's seem re-enabled again in v.7.0"
- [ ] Reuse an RxDocument-protoptye per collection instead of resetting ORM-methods and attribute getters/setters on each instance

# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.

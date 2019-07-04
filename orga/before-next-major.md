# before next major release

This list contains things that have to be done but will create breaking changes.

### Move `pouchdb-server` to devDependencies so the build will not run on each install [issue](https://github.com/pubkey/rxdb/issues/884)

### KeyCompression does not work on objects inside of arrays.
In documents like the following, the properties inside of the array-object will not be compressed `color`

```json
{
    "_id": "anyid",
    "myArray": [
        {
            "name": "foobar",
            "color": "blue"
        }
    ]
}
```

The best approach will be to use [jsonschema-key-compression](https://github.com/pubkey/jsonschema-key-compression) instead of the own key-compression

### RxDocument().toJSON() should not return rev by default

Currently `withRev` has default `true`.
It should be `false` by default because the user does not expect the revision here.

### Replace crypto-js

The dependency `crypto-js` is not tree-shakeable or works with rollup out of the box.
We should use a lighter module that does the aes-encryption. See `config/rollup.config.js`

### Rewrite prototype-merge

Each collection creates it's own constructor for RxDocuments.
This has a performance-benefit over using the Proxy-API which is also not supported in IE11.
To create the constructor, the collection merges prototypes from RxDocument, RxSchema and the ORM-functions.
The current implementation of this prototype-merging is very complicated and has hacky workarrounds to work with vue-devtools.
We should rewrite it to a single pure function that returns the constructor.
Instead of mergin the prototype into a single object, we should chain them together.

### merge checks into dev-mode-plugin
Currently we have the schema-check plugin which checks that the schema of a collection is correct. Other checks like [this](https://github.com/pubkey/rxdb/blob/fc3a38717137d1daf53db8be02ebc43bb7159ed1/src/rx-collection.js#L697) are still included in the codebase.
We should create a seperate `dev-mode`-plugin which includes all checks and error-messages for the dev-mode.

### Add typescript
Most of the bugs from the last year could have been prevented by using typescript.
Planned steps:
* Rename the src-files to `.ts`
* Setup [@babel/typescript](https://babeljs.io/docs/en/babel-preset-typescript) which can remove the typings on build
* Set `strict: false`
* Add typing incrementally
* Set `strict: true` and fix all errors

### Rewrite jsonschema-validation
In the past, before `8.0.0` we had to be able to validate subpaths of an object directly when a setter was called [see here](https://github.com/pubkey/rxdb/blob/master/orga/releases/8.0.0.md#setters-are-only-callable-on-temporary-documents).
This is no longer the case so we can refactor the validation-logic and remove a big part of it's code which is [causing confusion](https://github.com/pubkey/rxdb/pull/1157).

# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.

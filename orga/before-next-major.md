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

The best approach will be to create a separate module `jsonschema-key-compression` which works without rxdb.
This can then be better optimised for speed and size and also is easier to unit-test.

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

# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.

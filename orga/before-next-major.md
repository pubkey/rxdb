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


# Maybe

## Use Proxy instead of getters/setter on RxDocument
Currently there is a hack invovled into the proxy-get-methods like `myDocument.firstName$` etc.
This had to be done because IE11 does not support the Proxy-Object (and there is no way to polyfill).
If we give up IE11-Support, we could use the proxy-object which would also allow to directly mutate arrays like described in [#561](https://github.com/pubkey/rxdb/issues/561). This would also give a performance-benefit.

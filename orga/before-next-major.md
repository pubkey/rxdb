# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.


### Rewrite prototype-merge

Each collection creates its own constructor for RxDocuments.
This has a performance-benefit over using the Proxy-API which is also not supported in IE11.
To create the constructor, the collection merges prototypes from RxDocument, RxSchema and the ORM-functions.
The current implementation of this prototype-merging is very complicated and has hacky workarrounds to work with vue-devtools.
We should rewrite it to a single pure function that returns the constructor.
Instead of merging the prototype into a single object, we should chain them together.

### Refactor data-migrator

 - The current implemetation does not use pouchdb's bulkDocs which is much faster.
 - This could have been done in much less code which would be easier to understand.
 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.
 


## Make RxDcouments immutable
At the current version of RxDB, RxDocuments mutate themself when they recieve ChangeEvents from the database.
For example when you have a document where `name = 'foo'` and some update changes the state to `name = 'bar'` in the database, then the previous javascript-object will change its own property to the have `doc.name === 'bar'`.
This feature is great when you use a RxDocument with some change-detection like in angular or vue templates. You can use document properties directly in the template and all updates will be reflected in the view, without having to use observables or subscriptions.

However this behavior is also confusing many times. When the state in the database is changed, it is not clear at which exact point of time the objects attribute changes. Also the self-mutating behavior created some problem with vue- and react-devtools because of how they clone objects.

Also, to not confuse with fast changes that happen directly after each other, the whole json-data-to-RxDocument-piple has to be synchronous. With the change, this can be async which will allow us to have async post-result-transformations, like an asynchronous encryption plugin (with the Web Crypto API) or also move things into a webworker.

The change would make all RxDocuments immutable. When you subscribe to a query and the same document is returned in the results, this will always be a new javascript object.

## Use exports field in package.json

See [#3422](https://github.com/pubkey/rxdb/issues/3422)

Use the [exports](https://webpack.js.org/guides/package-exports/) field in the `package.json` instead of the other fields like `main` or `jsnext:main`.
Also we no longer need a package.json for each plugin in the `/plugins` folder, instead add the plugins to the exports field.
Ensure that it works with typescript. Check the rxjs repo and find out how they did this.

Rename the paths in the `exports` field in the `package.json` so that users can do `import {} from 'rxdb/core'` instead of the current `import {} from 'rxdb/plugins/core'`.


## Do not allow type mixing

In the RxJsonSchema, a property of a document can have multiple types like

```ts
{
    type?: JsonSchemaTypes | JsonSchemaTypes[];
}
```

This is bad and should not be used. Instead each field must have exactly one type.
Having mixed types causes many confusion, for example when the type is `['string', 'number']`,
you could run a query selector like `$gt: 10` where it now is not clear if the string `foobar` is matching or not.

## Ensure the schema hashing works equal across all browsers

https://github.com/pubkey/rxdb/pull/4005
https://github.com/pubkey/rxdb/pull/4005#issuecomment-1264742235


# Add typings to the query selector

The `selector`part of queries is currently not fully typed.
Hint: We can find out the possible doc field names via https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object/58436959#58436959

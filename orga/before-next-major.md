# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.


## Refactor data-migrator

 - The current implemetation does not use pouchdb's bulkDocs which is much faster.
 - This could have been done in much less code which would be easier to understand.
 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.
 


## Make RxDcouments immutable
At the current version of RxDB, RxDocuments mutate themself when they recieve ChangeEvents from the database.
For example when you have a document where `name = 'foo'` and some update changes the state to `name = 'bar'` in the database, then the previous javascript-object will change its own property to the have `doc.name === 'bar'`.
This feature is great when you use a RxDocument with some change-detection like in angular or vue templates. You can use document properties directly in the template and all updates will be reflected in the view, without having to use observables or subscriptions.

However this behavior is also confusing many times. When the state in the database is changed, it is not clear at which exact point of time the objects attribute changes. Also the self-mutating behavior created some problem with vue- and react-devtools because of how they clone objects.

The change would make all RxDocuments immutable. When you subscribe to a query and the same document is returned in the results, this will always be a new javascript object.

Related: https://discord.com/channels/969553741705539624/994394488694898840/1036030989006274561

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


## Add typings to the query selector

The `selector`part of queries is currently not fully typed.
Hint: We can find out the possible doc field names via https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object/58436959#58436959


## Use normal RxQuery for `findByIds$` and `findByIds`

Atm `findByIds$` and `findByIds` are implemented with their own query and observe logic. 
This is not necessary and confusing for the user.
Instead we should use a different `RxQuery.op` and use normal `RxQuery` objects to handles the result state and observables.

The user would call it like normal queries but with a different method input:

```ts
const result = await myRxCollection.findById('foo').exec();
const result$ = await myRxCollection.findById('foo').$;

const results = await myRxCollection.findByIds(['foo', 'bar']).exec();
const results$ = await myRxCollection.findByIds(['foo', 'bar']).$;
```

## Remove depricated `skipIfSame` from `putAttachment()`


## Rename `replication-couchdb-new`

The `replication-couchdb-new` plugin should be called `replication-couchdb` while the previous `replication-couchdb`
should be called `replication-couchdb-pouchdb`.
Also rename the method names and variables inside of the plugins.

## Batch up atomic operations

If multiple atomic updates are run on the same document at the same time, we should merge them together and do a single database write.

## Add enum-compression to the key-compressio plugin
- Also rename the key-compression plugin to be just called 'compression'

## Fix migration+replication
When the schema is changed a migration runs, the replication plugins will replicate the migrated data. This is mostly not wanted by the user. We should
add an option to let the user define what should happen after the migration.

## Prefix storage plugins with `storage-`
Like the replication plugins, all RxStorage plugins should be prefixed with `storage-` for example `storage-dexie`.

## Require string based `$regex`

Atm people can pass `RegExp` instances to the queries. These cannot be transfered via json for example having a remote storage
can make problems. We should enforce people using strings as operators instead.


## Set `hasPersistence=true` on memory storage

This will make testing easier. The memory storage should keep data in memory, even when the last instance has been closed.

## Do not use hash for revisions

Atm the _rev field is filled with a hash of the documents data. This is not the best solution becuase:
- Hashing in JavaScript is slow, not running hashes on insert improves performance by about 33%
- When 2 clients do the exact same write to the document, it is not clear from comparing the document states because they will have the exact same hash which makes some conflict resultion strategies impossible to implement.

Instead we should just use the RxDatabase.token together with the revision height.


## Rename document mutation functions

Atm the naming of the document mutation methods is confusing.
For example `update()` works completely different to `atomicUpdate()` and so on.
We should unify the naming so that each of the methods has an atomic and a non-atomic way to run.

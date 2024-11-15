# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.


## Split conflict handler into "isEqual" and "mergeConflict" functions
Because the handler is used in so many places it becomes confusing to write a proper conflict handler.
Also having a handler that requires user interaction is only possible by hackingly using the context param.
By splitting the functionalities it will become easier to learn where the handlers are used and how to define them properly.

## OPFS storage has default jsonPositionSize=8 but should be 14

Set the default to 14 and also remove all occurences of `jsonPositionSize`.

## Ideas from https://github.com/pubkey/rxdb/issues/4994

## migration-storage plugin: Remove catch from cleanup

In the migration-storage plugin we run a catch on `oldStorageInstance.cleanup(0)` to fix v14->v15 migration.
We should remove that catch in the next major release.


## Change the `RX_PIPELINE_CHECKPOINT_CONTEXT` to `rx-pipeline-checkpoint` in the rx-pipeline.ts file

This was not possible before because it requires adding the new value to the schema enum.

## Ensure schema validator is used in devmode

Many reported issues come from people storing data that is not valid to their schema.
To fix this, in dev-mode we should ensure that at least one schema validator is used.

## ignoreduplicate must never be allowed in non-devmode

`ignoreduplicate` is only usefull for tests and should never be used in production. Throw an error if it is set to `true` in non-dev-mode.

## rename `.destroy()` to `.close()`

Destroy was adapted from PouchDB, but people often think this deletes the written data. Close is better.

---------------------------------
# Maybe later (not sure if should be done)


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

## Add enum-compression to the key-compression plugin
- Also rename the key-compression plugin to be just called 'compression'

## RxStorage: Add RxStorage.info() which also calls parents

Having an .info() method helps in debugging stuff and sending reports on problems etc.


## Rename "RxDB Premium" to "RxDB Enterprise"

Most "normal" users do not need premium access so we should name it "RxDB Enterprise" to make it more clear that it is intended to bought by companies.


## Refactor data-migrator

 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.

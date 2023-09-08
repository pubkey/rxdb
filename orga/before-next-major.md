# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.


## Set eventReduce:true as default

See https://github.com/pubkey/rxdb/pull/4614

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


## Require string based `$regex`

Atm people can pass `RegExp` instances to the queries. These cannot be transferred via json for example having a remote storage
can make problems. We should enforce people using strings as operators instead.


## Fix migration+replication
When the schema is changed a migration runs, the replication plugins will replicate the migrated data. This is mostly not wanted by the user. We should add an option to let the user define what should happen after the migration.

Proposed solution:

- Add a `preMigrate` hook to the collection creation so that it can be ensured that all local non-replicated writes are replicated before the migration runs.
- During migration, listen to the events of the new storage instance and store the last event in the internals collection
- After the migration has run, the replication plugins start from that latest event and only replicate document writes that have occurred after the migration.

## Refactor data-migrator

 - This could have been done in much less code which would be easier to understand.
 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.

## Migrate assumed master state of the replicated documents

[Quote from discord](https://discord.com/channels/969553741705539624/1050381589399470160/1143158499715588220): 

> Why does RxDB not migrate assumed masters? That would lead to the false-positive server conflicts when assumed masters will be different from the ones on the server (because it also has the migration applied) and cause unnecessary push/pull roundtrips as a result of the conflict resolution. Or also, when schema is migrated and the server will reject push requests because assumed masters are no longer valid.

## RxLocalDocument.$ must emit a document instance, not the plain data

This was changed in v14 for a normal RxDocument.$ which emits RxDocument instances. Same must be done for local documents.
 
## Rename send$ to sent$

`myRxReplicationState.send$.subscribe` works only if the sending is successful. Therefore, it should be named `sent$`, not `send$`.

Interestingly, `received$` has been named correctly

## .bulkUpsert should behave equal to the other bulk methods

https://github.com/pubkey/rxdb/issues/4821#issuecomment-1660339676

## Add dev-mode check for disallowed $ref fields

RxDB cannot resolve $ref fields in the schema because it would have a negative performance impact.
We should add a dev-mode check to throw a helpfull error message if $refs are used in the schema
https://github.com/pubkey/rxdb/issues/4926#issuecomment-1712223984

## Use `crypto.subtle.digest` for hashing

It is [faster](https://measurethat.net/Benchmarks/Show/6371/0/sha256-js) and more secure and we have a smaller build size.

## Rename "RxDB Premium" to "RxDB Enterprise"

Most "normal" users do not need premium access so we should name it "RxDB Enterprise" to make it more clear that it is intended to bought by companies.





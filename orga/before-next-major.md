# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.


## Set eventReduce:true as default [DONE]

See https://github.com/pubkey/rxdb/pull/4614

## Update node.js to 20.7.0 [DONE]


## Require string based `$regex` [DONE]

Atm people can pass `RegExp` instances to the queries. These cannot be transferred via json for example having a remote storage
can make problems.
Also Regular expressions are mutable objects! Which is dangerous.
We should enforce people using strings as operators instead. Similar to how you cannot use a `Date` object inside of a json document.


## Replicate attachments [DONE]

The replication-protocol does now support attachment replication. This clear the path to add the attachment replication to the single RxDB replication plugins.

## Fix migration+replication
When the schema is changed a migration runs, the replication plugins will replicate the migrated data. This is mostly not wanted by the user. We should add an option to let the user define what should happen after the migration.

Proposed solution:

- Add a `preMigrate` hook to the collection creation so that it can be ensured that all local non-replicated writes are replicated before the migration runs.
- During migration, listen to the events of the new storage instance and store the last event in the internals collection
- After the migration has run, the replication plugins start from that latest event and only replicate document writes that have occurred after the migration.

## Refactor data-migrator

 - This could have been done in much less code which would be easier to understand.
 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.

## Ensure data migration only runs on the leading browser tab.

## Migrate assumed master state of the replicated documents

[Quote from discord](https://discord.com/channels/969553741705539624/1050381589399470160/1143158499715588220): 

> Why does RxDB not migrate assumed masters? That would lead to the false-positive server conflicts when assumed masters will be different from the ones on the server (because it also has the migration applied) and cause unnecessary push/pull roundtrips as a result of the conflict resolution. Or also, when schema is migrated and the server will reject push requests because assumed masters are no longer valid.

## RxLocalDocument.$ must emit a document instance, not the plain data [DONE]

This was changed in v14 for a normal RxDocument.$ which emits RxDocument instances. Same must be done for local documents.
 
## Rename send$ to sent$ [DONE]

`myRxReplicationState.send$.subscribe` works only if the sending is successful. Therefore, it should be named `sent$`, not `send$`.

Interestingly, `received$` has been named correctly

## .bulkUpsert should behave equal to the other bulk methods

https://github.com/pubkey/rxdb/issues/4821#issuecomment-1660339676

## Add dev-mode check for disallowed $ref fields [DONE]

RxDB cannot resolve $ref fields in the schema because it would have a negative performance impact.
We should add a dev-mode check to throw a helpfull error message if $refs are used in the schema
https://github.com/pubkey/rxdb/issues/4926#issuecomment-1712223984

## Use `crypto.subtle.digest` for hashing [DONE]

Steps:
- make hashing async [DONE]
- Add toggle for crypto.subtle.digest [DONE]

It is [faster](https://measurethat.net/Benchmarks/Show/6371/0/sha256-js) and more secure and we have a smaller build size.

## Rename replication-p2p to replication-webrtc [DONE]


## RxStorage: Add RxStorage.info() [DONE]

Having an .info() method helps in debugging stuff and sending reports on problems etc.
Also used to count total documents etc for the state of the migration/replication.
Can be augmented in the future.


## Skip responding full document data on bulkWrites (only in all happy case)

RxStorage.bulkwrite(): If all writes suceeed, return "SUCESS" or sth to not have to transfer all json document data again. This is mostly important in the remot storage and webworker storage where we do not want to JSON-stringify and parse all data again.


## Change response type of RxStorageInstance.bulkWrite() from indexeddb objects to arrays [DONE]

`RxStorageBulkWriteResponse` should only contains arrays. This makes writes much less performance users because we do not have to
index the results.


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

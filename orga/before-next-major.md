# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.

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

Atm people can pass `RegExp` instances to the queries. These cannot be transfered via json for example having a remote storage
can make problems. We should enforce people using strings as operators instead.


## Fix migration+replication
When the schema is changed a migration runs, the replication plugins will replicate the migrated data. This is mostly not wanted by the user. We should add an option to let the user define what should happen after the migration.

Proposed solution:

- Add a `preMigrate` hook to the collection creation so that it can be ensured that all local non-replicated writes are replicated before the migration runs.
- During migration, listen to the events of the new storage instance and store the last event in the internals collection
- After the migration has run, the replication plugins start from that latest event and only replicate document writes that have occured after the migration.

## Refactor data-migrator

 - The current implemetation does not use pouchdb's bulkDocs which is much faster.
 - This could have been done in much less code which would be easier to understand.
 - Migration strategies should be defined [like in WatermelonDB](https://nozbe.github.io/WatermelonDB/Advanced/Migrations.html) with a `toVersion` version field. We should also add a `fromVersion` field so people could implement performance shortcuts by directly jumping several versions. The current migration strategies use the array index as `toVersion` which is confusing.
 

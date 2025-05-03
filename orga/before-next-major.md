# Things do to before the next major release

This list contains things that have to be done but will create breaking changes.

## Add databaseNamePrefix to premium sqlite storage

## Merge memory-mapped fix BREAKING: deleted docs must be purged

https://github.com/pubkey/rxdb-premium-dev/pull/480

## Merge OPFS fix BREAKING: FIX memory and cleanup leak

https://github.com/pubkey/rxdb-premium-dev/pull/477

## `toggleOnDocumentVisible` should default to `true`

https://github.com/pubkey/rxdb/issues/6810

## Final fields should not be automatically required

https://discord.com/channels/969553741705539624/1237000453791678487/threads/1327921349808885831

## Move `final` definitions to the top level

This should be done similar to where indexes or `encryption` fields are defined. This would 
then allow to have `final` be also set for nested properties.


---------------------------------
## Maybe later (not sure if should be done)


## Suggestions from #6787

See https://github.com/pubkey/rxdb/pull/6787


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

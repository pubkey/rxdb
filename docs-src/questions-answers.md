# Questions and answers

## Can't change the schema

When you make changes to the schema of a collection, you sometimes can get an error like
`Error: collection(): another instance created this collection with a different schema`.

This means you have created a collection before and added document-data to it.
When you now just change the schema, it is likely that the new schema does not match the saved documents inside of the collection.
This would cause strange bugs and would be hard to debug, so RxDB check's if your schema has changed and throws an error.

To change the schema in **production**-mode, do the following
- Increase the `version` by 1
- Add the appropriate [migrationStrategies](https://pubkey.github.io/rxdb/data-migration.html) so the saved data will be modified to match the new schema


In **development**-mode, the schema-change can be simplified by one of these strategies:

-   Use the memory-adapter so your db resets on restart and your schema is not safed permanently
-   Call `removeRxDatabase('mydatabasename', 'adapter');` before creating a new RxDatabase-instance
-   Add a timestamp as suffix to the database-name to create a new one each run like `name: 'heroesDB' + new Date().getTime()`

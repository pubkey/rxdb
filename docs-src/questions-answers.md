# Questions and answers

## Can't change the schema of a collection
When you make changes to the schema of a collection, you sometimes can get an error like
`Error: addCollections(): another instance created this collection with a different schema`.

This means you have created a collection before and added document-data to it.
When you now just change the schema, it is likely that the new schema does not match the saved documents inside of the collection.
This would cause strange bugs and would be hard to debug, so RxDB check's if your schema has changed and throws an error.

To change the schema in **production**-mode, do the following steps:

- Increase the `version` by 1
- Add the appropriate [migrationStrategies](https://pubkey.github.io/rxdb/data-migration.html) so the saved data will be modified to match the new schema


In **development**-mode, the schema-change can be simplified by **one of these** strategies:

-   Use the memory-storage so your db resets on restart and your schema is not saved permanently
-   Call `removeRxDatabase('mydatabasename', RxStorage);` before creating a new RxDatabase-instance
-   Add a timestamp as suffix to the database-name to create a new one each run like `name: 'heroesDB' + new Date().getTime()`



## Why is the PouchDB RxStorage deprecated?
When I started developing RxDB in 2016, I had a specific use case to solve.
Because there was no client-side database out there that fitted, I created
RxDB as a wrapper around PouchDB. This worked great and all the PouchDB features
like the query engine, the adapter system, CouchDB-replication and so on, came for free.
But over the years, it became clear that PouchDB is not suitable for many applications,
mostly because of its performance: To be compliant to CouchDB, PouchDB has to store all
revision trees of documents which slows down queries. Also purging these document revisions [is not possible](https://github.com/pouchdb/pouchdb/issues/802)
so the database storage size will only increase over time.
Another problem was that many issues in PouchDB have never been fixed, but only closed by the issue-bot like [this one](https://github.com/pouchdb/pouchdb/issues/6454). The whole PouchDB RxStorage code was full of [workarounds and monkey patches](https://github.com/pubkey/rxdb/blob/285c3cf6008b3cc83bd9b9946118a621434f0cff/src/plugins/pouchdb/pouch-statics.ts#L181) to resolve
these issues for RxDB users. Many these patches decreased performance even further. Sometimes it was not possible to fix things from the outside, for example queries with `$gt` operators return [the wrong documents](https://github.com/pouchdb/pouchdb/pull/8471) which is a no-go for a production database
and hard to debug.

In version [10.0.0](./releases/10.0.0.md) RxDB introduced the [RxStorage](./rx-storage.md) layer which
allows users to swap out the underlying storage engine where RxDB stores and queries documents from.
This allowed to use alternatives from PouchDB, for example the [Dexie RxStorage](./rx-storage-dexie.md) in browsers
or even the [FoundationDB RxStorage](./rx-storage-foundationdb.md) on the server side.
There where not many use cases left where it was a good choice to use the PouchDB RxStorage. Only replicating with a
CouchDB server, was only possible with PouchDB. But this has also changed. RxDB has [a plugin](./replication-couchdb.md) that allows
to replicate clients with any CouchDB server by using the RxDB replication protocol. This plugins work with any RxStorage so that it is not necessary to use the PouchDB storage.
Removing PouchDB allows RxDB to add many awaited features like filtered change streams for easier replication and permission handling. It will also free up development time.

If you are currently using the PouchDB RxStorage, you have these options:

- Migrate to another [RxStorage](./rx-storage.md) (recommended)
- Never update RxDB to the next major version (stay on <14.0.0)
- Fork the [PouchDB RxStorage](./rx-storage-pouchdb.md) and maintain the plugin by yourself.
- Fix all the [PouchDB problems](https://github.com/pouchdb/pouchdb/issues?q=author%3Apubkey) so that we can add PouchDB to the RxDB Core again.



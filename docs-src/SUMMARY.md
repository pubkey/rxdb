
# Summary

* [Quickstart](./quickstart.md)

* [Install](./install.md)
    * [npm](./install.md#npm)
    * [import](./install.md#import)

* [Dev Mode](./dev-mode.md)
* [RxDatabase](./rx-database.md)
    * [Creation](./rx-database.md#creation)
        * [name](./rx-database.md#name)
        * [adapter](./rx-database.md#adapter)
        * [password](./rx-database.md#password)
        * [multiInstance](./rx-database.md#multiinstance)
        * [eventReduce](./rx-database.md#eventreduce)
        * [ignoreDuplicate](./rx-database.md#ignoreduplicate)
        * [pouchSettings](./rx-database.md#pouchSettings)
    * [Functions](./rx-database.md#functions)
        * [$](./rx-database.md#observe-with-)
        * [exportJSON()](./rx-database.md#dump)
        * [importJSON()](./rx-database.md#importdump)
        * [server()](./rx-database.md#server)
        * [waitForLeadership()](./rx-database.md#waitforleadership)
        * [requestIdlePromise()](./rx-database.md#requestidlepromise)
        * [destroy()](./rx-database.md#destroy)
        * [remove()](./rx-database.md#remove)
        * [checkAdapter()](./rx-database.md#checkadapter)
        * [isRxDatabase()](./rx-database.md#isrxdatabase)

* [RxSchema](./rx-schema.md)
    * [Example](./rx-schema.md#example)
    * [Create a collection with the schema](./rx-schema.md#create-a-collection-with-the-schema)
    * [version](./rx-schema.md#version)
    * [keyCompression](./rx-schema.md#keycompression)
    * [indexes](./rx-schema.md#indexes)
    * [attachments](./rx-schema.md#attachments)
    * [default](./rx-schema.md#default)
    * [final](./rx-schema.md#final)
    * [encryption](./rx-schema.md#encryption)

* [Schema Validation](./schema-validation.md)

* [RxCollection](./rx-collection.md)
    * [Creation](./rx-collection.md#creating-a-collection)
        * [name](./rx-collection.md#name)
        * [schema](./rx-collection.md#schema)
        * [pouchSettings](./rx-collection.md#pouchSettings)
        * [ORM-functions](./rx-collection.md#orm-functions)
        * [Migration](./rx-collection.md#Migration)
    * [Functions](./rx-collection.md#functions)
        * [$](./rx-collection.md#observe-)
        * [insert()](./rx-collection.md#insert)
        * [bulkInsert()](./rx-collection.md#bulkinsert)
        * [bulkRemove()](./rx-collection.md#bulkremove)
        * [newDocument()](./rx-collection.md#newdocument)
        * [upsert()](./rx-collection.md#upsert)
        * [atomicUpsert()](./rx-collection.md#atomicupsert)
        * [find()](./rx-collection.md#find)
        * [findOne()](./rx-collection.md#findone)
        * [findByIds()](./rx-collection.md#findbyids)
        * [findByIds$()](./rx-collection.md#findbyids$)
        * [exportJSON()](./rx-collection.md#dump)
        * [importJSON()](./rx-collection.md#importdump)
        * [syncCouchDB()](./rx-collection.md#synccouchdb)
        * [syncGraphQL()](./rx-collection.md#syncgraphql)
        * [remove()](./rx-collection.md#remove)
        * [destroy()](./rx-collection.md#destroy)
        * [isRxCollection()](./rx-collection.md#isrxcollection)

* [RxDocument](./rx-document.md)
    * [Insert](./rx-document.md#insert)
    * [Find](./rx-document.md#find)
    * [Functions](./rx-document.md#functions)
        * [get()](./rx-document.md#get)
        * [get$()](./rx-document.md#get$)
        * [proxy-get](./rx-document.md#proxy-get)
        * [update()](./rx-document.md#update)
        * [atomicUpdate()](./rx-document.md#atomicupdate)
        * [atomicPatch()](./rx-document.md#atomicpatch)
        * [$](./rx-document.md#observe-)
        * [remove()](./rx-document.md#remove)
        * [deleted$](./rx-document.md#deleted$)
        * [toJSON()](./rx-document.md#tojson)
        * [set()](./rx-document.md#set)
        * [save()](./rx-document.md#save)
        * [isRxDocument()](./rx-document.md#isrxdocument)

* [RxQuery](./rx-query.md)
    * [find()](./rx-query.md#find)
    * [findOne()](./rx-query.md#findOne)
    * [exec()](./rx-query.md#exec)
    * [$](./rx-query.md#observe-)
    * [update()](./rx-query.md#update)
    * [remove()](./rx-query.md#remove)
    * [doesDocumentDataMatch()](./rx-query.md#doesDocumentDataMatch)
    * [Specific Index](./rx-query.md#setting-a-specific-index)
    * [Examples](./rx-query.md#examples)
    * [isRxQuery()](./rx-query.md#isrxquery)

* [RxAttachment](./rx-attachment.md)

* [Middleware-hooks](./middleware.md)

* [ORM/DRM](./orm.md)

* [Population](./population.md)

* [DataMigration](./data-migration.md)

* [LeaderElection](./leader-election.md)

* [RxStorage](./rx-storage.md)

* [RxStorage PouchDB](./rx-storage-pouchdb.md)
* [PouchDB Adapters](./adapters.md)

* [RxStorage Dexie.js](./rx-storage-dexie.md)

* [RxStorage LokiJS](./rx-storage-lokijs.md)

* [RxStorage Memory](./rx-storage-memory.md)

* [RxStorage IndexedDB](./rx-storage-indexeddb.md)

* [RxStorage SQLite](./rx-storage-sqlite.md)

* [RxStorage Worker](./rx-storage-worker.md)

* [RxStorage Sharding](./rx-storage-sharding.md)

* [Replication CouchDB](./replication-couchdb.md)

* [Replication GraphQL](./replication-graphql.md)

* [Replication Primitives](./replication.md)

* [Cleanup](./cleanup.md)

* [Backup](./backup.md)

* [QueryCache](./query-cache.md)

* [LocalDocuments](./rx-local-document.md)

* [Third Party Plugins](./third-party-plugins.md)

* [Creating Plugins](./plugins.md)

* [Query Optimizer](./query-optimizer.md)

* [RxDB Premium](./premium.md)


* Tutorials
    * [Use RxDB with Typescript](./tutorials/typescript.md)
    * [Using the Server Plugin](./tutorials/server.md)

* Opinions
    * [About Offline First](./offline-first.md)
    * [Downsides of Offline First](./downsides-of-offline-first.md)
    * [Slow IndexedDB](./slow-indexeddb.md)
    * [Why NoSQL](./why-nosql.md)
    * [Alternatives](./alternatives.md)

* [Questions & Answers](./questions-answers.md)

* [Contribute](./contribute.md)

# Summary

* [Introduction](README.md)

* [Install](./install.md)
    * [npm](./install.md#npm)
    * [import](./install.md#import)

* [RxDatabase](./rx-database.md)
    * [Creation](./rx-database.md#creation)
        * [name](./rx-database.md#name)
        * [adapter](./rx-database.md#adapter)
        * [password](./rx-database.md#password)
        * [multiInstance](./rx-database.md#multiinstance)
        * [queryChangeDetection](./rx-database.md#queryChangeDetection)
        * [ignoreDuplicate](./rx-database.md#ignoreduplicate)
        * [pouchSettings](./rx-database.md#pouchSettings)
    * [Functions](./rx-database.md#functions)
        * [$](./rx-database.md#observe-with-)
        * [dump()](./rx-database.md#dump)
        * [importDump()](./rx-database.md#importdump)
        * [server()](./rx-database.md#server)
        * [waitForLeadership()](./rx-database.md#waitforleadership)
        * [requestIdlePromise()](./rx-database.md#requestidlepromise)
        * [destroy()](./rx-database.md#destroy)
        * [remove()](./rx-database.md#remove)
        * [checkAdapter()](./rx-database.md#checkadapter)
        * [isRxDatabase()](./rx-database.md#isRxDatabase)

* [RxSchema](./rx-schema.md)
    * [Example](./rx-schema.md#example)
    * [Create a collection with the schema](./rx-schema.md#create-a-collection-with-the-schema)
    * [version](./rx-schema.md#version)
    * [keyCompression](./rx-schema.md#keycompression)
    * [indexes](./rx-schema.md#indexes)
    * [attachments](./rx-schema.md#attachments)
    * [default](./rx-schema.md#default)
    * [final](./rx-schema.md#final)

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
        * [newDocument()](./rx-collection.md#newdocument)
        * [upsert()](./rx-collection.md#upsert)
        * [atomicUpsert()](./rx-collection.md#atomicupsert)
        * [find()](./rx-collection.md#find)
        * [findOne()](./rx-collection.md#findone)
        * [dump()](./rx-collection.md#dump)
        * [importDump()](./rx-collection.md#importdump)
        * [sync()](./rx-collection.md#sync)
        * [remove()](./rx-collection.md#clear)
        * [destroy()](./rx-collection.md#destroy)
        * [isRxCollection()](./rx-collection.md#isRxCollection)

* [RxDocument](./rx-document.md)
    * [Insert](./rx-document.md#insert)
    * [Find](./rx-document.md#find)
    * [Functions](./rx-document.md#functions)
        * [get()](./rx-document.md#get)
        * [get$()](./rx-document.md#get$)
        * [proxy-get](./rx-document.md#proxy-get)
        * [update()](./rx-document.md#update)
        * [atomicUpdate()](./rx-document.md#atomicupdate)
        * [atomicSet()](./rx-document.md#atomicset)
        * [$](./rx-document.md#observe-)
        * [remove()](./rx-document.md#remove)
        * [deleted$](./rx-document.md#deleted$)
        * [set()](./rx-document.md#set)
        * [save()](./rx-document.md#save)
        * [isRxDocument()](./rx-document.md#isRxDocument)

* [RxQuery](./rx-query.md)
    * [find()](./rx-query.md#find)
    * [findOne()](./rx-query.md#findOne)
    * [exec()](./rx-query.md#exec)
    * [$](./rx-query.md#observe-)
    * [update()](./rx-query.md#update)
    * [remove()](./rx-query.md#remove)
    * [Examples](./rx-query.md#examples)
    * [isRxQuery()](./rx-query.md#isRxQuery)

* [RxAttachment](./rx-attachment.md)


* [Middleware-hooks](./middleware.md)

* [ORM/DRM](./orm.md)

* [Population](./population.md)

* [DataMigration](./data-migration.md)

* [LeaderElection](./leader-election.md)

* [Replication](./replication.md)

* [QueryChangeDetection](./query-change-detection.md)

* [InMemory](./in-memory.md)

* [LocalDocuments](./rx-local-document.md)

* [Custom Build](./custom-build.md)

* [Plugins](./plugins.md)

* Tutorials
    * [Use RxDB with Typescript](./tutorials/typescript.md)
    * [Using the Server Plugin](./tutorials/server.md)

* [Questions & Answers](./questions-answers.md)

* [Contribute](./contribute.md)

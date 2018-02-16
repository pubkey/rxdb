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
        * [ignoreDuplicate](./rx-database.md#ignoreduplicate)
    * [Functions](./rx-database.md#functions)
        * [$](./rx-database.md#observe-with-)
        * [waitForLeadership()](./rx-database.md#waitforleadership)
        * [dump()](./rx-database.md#dump)
        * [importDump()](./rx-database.md#importdump)
        * [requestIdlePromise()](./rx-database.md#requestidlepromise)
        * [destroy()](./rx-database.md#destroy)
        * [remove()](./rx-database.md#remove)
        * [checkAdapter()](./rx-database.md#checkadapter)

* [RxSchema](./rx-schema.md)
    * [Example](./rx-schema.md#example)
    * [Create a collection with the schema](./rx-schema.md#create-a-collection-with-the-schema)
    * [version](./rx-schema.md#version)
    * [disableKeyCompression](./rx-schema.md#disablekeycompression)
    * [indexes](./rx-schema.md#indexes)
    * [default](./rx-schema.md#default)


* [RxCollection](./rx-collection.md)
    * [Creation](./rx-collection.md#creating-a-collection)
        * [name](./rx-collection.md#name)
        * [schema](./rx-collection.md#schema)
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

* [RxDocument](./rx-document.md)
    * [Insert](./rx-document.md#insert)
    * [Find](./rx-document.md#find)
    * [Functions](./rx-document.md#functions)
        * [get()](./rx-document.md#get)
        * [set()](./rx-document.md#set)
        * [save()](./rx-document.md#save)
        * [remove()](./rx-document.md#remove)
        * [update()](./rx-document.md#update)
        * [atomicUpdate()](./rx-document.md#atomicupdate)
        * [$](./rx-document.md#observe-)

* [RxQuery](./rx-query.md)
    * [remove()](./rx-query.md#remove)
    * [update()](./rx-query.md#update)

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

* [Contribute](./contribute.md)

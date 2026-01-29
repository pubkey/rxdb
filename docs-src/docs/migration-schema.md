---
title: Seamless Schema Data Migration with RxDB
slug: migration-schema.html
description: Upgrade your RxDB collections without losing data. Learn how to seamlessly migrate schema changes and keep your apps running smoothly.
---

# Migrate Database Data on schema changes

The RxDB Data Migration Plugin helps developers easily update stored data in their apps when they make changes to the data structure by changing the schema of a [RxCollection](./rx-collection.md). This is useful when developers release a new version of the app with a different schema.

Imagine you have your awesome messenger-app distributed to many users. After a while, you decide that in your new version, you want to change the schema of the messages-collection. Instead of saving the message-date like `2017-02-12T23:03:05+00:00` you want to have the unix-timestamp like `1486940585` to make it easier to compare dates. To accomplish this, you change the schema and **increase the version-number** and you also change your code where you save the incoming messages. But one problem remains: what happens with the messages which are already stored in the database on the user's device in the old schema?

With RxDB you can provide migrationStrategies for your collections that automatically (or on call) transform your existing data from older to newer schemas. This assures that the client's data always matches your newest code-version.


# Add the migration plugin

To enable the data migration, you have to add the `migration-schema` plugin.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
addRxPlugin(RxDBMigrationSchemaPlugin);
```


## Providing strategies

Upon creation of a collection, you have to provide migrationStrategies when your schema's version-number is greater than `0`. To do this, you have to add an object to the `migrationStrategies` property where a function for every schema-version is assigned. A migrationStrategy is a function which gets the old document-data as a parameter and returns the new, transformed document-data. If the strategy returns `null`, the document will be removed instead of migrated.


```javascript
myDatabase.addCollections({
  messages: {
    schema: messageSchemaV1,
    migrationStrategies: {
      // 1 means, this transforms data from version 0 to version 1
      1: function(oldDoc){
        oldDoc.time = new Date(oldDoc.time).getTime(); // string to unix
        return oldDoc;
      }
    }
  }
});
```

Asynchronous strategies can also be used:

```javascript
myDatabase.addCollections({
  messages: {
    schema: messageSchemaV1,
    migrationStrategies: {
      1: function(oldDoc){
        oldDoc.time = new Date(oldDoc.time).getTime(); // string to unix
        return oldDoc;
      },
      /**
       * 2 means, this transforms data from version 1 to version 2
       * this returns a promise which resolves with the new document-data
       */
      2: function(oldDoc){
        // in the new schema (version: 2) we defined 'senderCountry' as required field (string)
        // so we must get the country of the message-sender from the server
        const coordinates = oldDoc.coordinates;
        return fetch('http://myserver.com/api/countryByCoordinates/'+coordinates+'/')
          .then(response => {
            const response = response.json();
            oldDoc.senderCountry = response;
            return oldDoc;
          });
      }
    }
  }
});
```

you can also filter which documents should be migrated:

```js
myDatabase.addCollections({
  messages: {
    schema: messageSchemaV1,
    migrationStrategies: {
      // 1 means, this transforms data from version 0 to version 1
      1: function(oldDoc){
        oldDoc.time = new Date(oldDoc.time).getTime(); // string to unix
        return oldDoc;
      },
      /**
       * this removes all documents older then 2017-02-12
       * they will not appear in the new collection
       */
      2: function(oldDoc){
        if(oldDoc.time < 1486940585) return null;
        else return oldDoc;
      }
    }
  }
});
```

## autoMigrate

By default, the migration automatically happens when the collection is created. Calling `RxDatabase.addCollections()` returns only when the migration has finished.
If you have lots of data or the migrationStrategies take a long time, it might be better to start the migration 'by hand' and show the migration-state to the user as a loading-bar.

```javascript
const messageCol = await myDatabase.addCollections({
  messages: {
    schema: messageSchemaV1,
    autoMigrate: false, // <- migration will not run at creation
    migrationStrategies: {
      1: async function(oldDoc){
        ...
        anything that takes very long
        ...
        return oldDoc;
      }
    }
  }
});

// check if migration is needed
const needed = await messageCol.migrationNeeded();
if(needed === false) {
  return;
}

// start the migration
messageCol.startMigration(10); // 10 is the batch-size, how many docs will run at parallel

const migrationState = messageCol.getMigrationState();

// 'start' the observable
migrationState.$.subscribe({
    next: state => console.dir(state),
    error: error => console.error(error),
    complete: () => console.log('done')
});

// the emitted states look like this:
{
    status: 'RUNNING' // oneOf 'RUNNING' | 'DONE' | 'ERROR'
    count: {
      total: 50,   // amount of documents which must be migrated
      handled: 0,  // amount of handled docs
      percent: 0   // percentage [0-100]
    }
}
```

If you don't want to show the state to the user, you can also use `.migratePromise()`:

```js
const migrationPromise = messageCol.migratePromise(10);
await migratePromise;
```



## migrationStates()

`RxDatabase.migrationStates()` returns an `Observable` that emits all migration states of any collection of the database.
Use this when you add collections dynamically and want to show a loading-state of the migrations to the user.

```js
const allStatesObservable = myDatabase.migrationStates();
allStatesObservable.subscribe(allStates => {
  allStates.forEach(migrationState => {
    console.log(
      'migration state of ' +
      migrationState.collection.name
    );
  });
});
```

## Migrating attachments

When you store [RxAttachment](./rx-attachment.md)s together with your document, they can also be changed, added or removed while running the migration.
You can do this by mutating the `oldDoc._attachments` property.

```js
import { createBlob } from 'rxdb';
const migrationStrategies = {
      1: async function(oldDoc){
        // do nothing with _attachments to keep all attachments and have them in the new collection version.
        return oldDoc;
      },
      2: async function(oldDoc){
        // set _attachments to an empty object to delete all existing ones during the migration.
        oldDoc._attachments = {};
        return oldDoc;
      }
      3: async function(oldDoc){
        // update the data field of a single attachment to change its data. 
        oldDoc._attachments.myFile.data = await createBlob(
          'my new text',
          oldDoc._attachments.myFile.content_type
        );
        return oldDoc;
      }
}
```

## Migration on multi-tab in browsers

If you use RxDB in a multiInstance environment, like a browser, it will ensure that exactly one tab is running a migration of a collection.
Also the `migrationState.$` events are emitted between browser tabs.


## Migration and Replication

If you use any of the [RxReplication](./replication.md) plugins, the migration will also run on the internal replication-state storage. It will migrate all `assumedMasterState` documents
so that after the migration is done, you do not have to re-run the replication from scratch.
RxDB assumes that you run the exact same migration on the servers and the clients. Notice that the replication `pull-checkpoint` will not be migrated. Your backend must be compatible with pull-checkpoints of older versions.

## Migration should be run on all database instances

If you have multiple database instances (for example, if you are running replication inside of a [Worker](./rx-storage-worker.md) or [SharedWorker](./rx-storage-shared-worker.md) and have created a database instance inside of the worker), schema migration should be started on all database instances. All instances must know about all migration strategies and any updated schema versions.

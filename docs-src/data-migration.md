# DataMigration

Imagine you have your awesome messenger-app distributed to many users. After a while, you decide that in your new version, you want to change the schema of the messages-collection. Instead of saving the message-date like `2017-02-12T23:03:05+00:00` you want to have the unix-timestamp like `1486940585` to make it easier to compare dates. To accomplish this, you change the schema and increase the version-number and you also change your code where you save the incoming messages. But one problem remains: what happens with the messages which are already saved on the user's device in the old schema?

With RxDB you can provide migrationStrategies for your collections that automatically (or on call) transform your existing data from older to newer schemas. This assures that the client's data always matches your newest code-version.

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
            oldDoc.senderCountry=response;
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

By default, the migration automatically happens when the collection is created. If you have lots of data or the migrationStrategies take a long time, it might be better to start the migration 'by hand' and show the migration-state to the user as a loading-bar.

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
if(needed == false) return;

// starting the migration

const migrationState$ = messageCol.migrate(10); // 10 is the batch-size, how many docs will run at parrallel

// 'start' the observable
migrationState$.subscribe(
  state => console.dir(state),
  error => console.error(error),
  done => console.log('done')
);

// the emitted states look like this:
{
    done: false, // true if finished
    total: 50,   // amount of documents which must be migrated
    handled: 0,  // amount of handled docs
    success: 0,  // handled docs which succeeded
    deleted: 0,  // handled docs which got deleted
    percent: 0   // percentage
}

```

If you don't want to show the state to the user, you can also use `.migratePromise()`:
```js
  const migrationPromise = messageCol.migratePromise(10);
  await migratePromise;
```


## Hint
If your migration takes a long time, combine it with the leaderElection to make sure you don't waste your users' resources by running it in 2 open tabs.


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./leader-election.md)

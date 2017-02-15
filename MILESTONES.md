# 3.0.0
Things that will be implemented into version 3.0.0.

When v3.0.0 is done, all features which require breaking changes, will be implemented.
This means you can then use RxDB in production without the fear breaking your clients database-state.

## migration-strategies **BREAKING**

[DONE](https://github.com/pubkey/rxdb/commit/3694436e96de666c457b558704c7588acc705a2e)

## conflict-resolution **BREAKING**

Pouchdb requires the developer to solve conflicts manually.
A solution is to introduct a new keyword to the RxSchema conflictStrategy
Here it is describe what should happen when a document-conflict happens.
There should be the following default-strategies:
first-insert-wins
last-insert-wins
lexical-ordering of the documents-hash
It should also be possible to define custom resolution-strategies.


## ORM

[DONE](https://github.com/pubkey/rxdb/commit/995a56e0a7500b5717a139f4edf27578e34c3399)

ORM-like function assignment.

```js
  const col = await myDatabase.collection({
    name: 'heroes',
    methods: {
      doSomething: function(){
        console.log('AAAH!');
      }
    }
  });

  // laster
  const doc = await col.findOne().exec();
  doc.doSomething();
  // > 'AAAH!'
```

## relations-populate [BREAKING]

[DONE](https://github.com/pubkey/rxdb/commit/c6a7352e465431ec74117b76f210869ba1f8f7a8)

## RxCollection.upsert(), RxCollection.removeifexists()

# 3.0.0
Things that will be implemented into version 3.0.0.

When v3.0.0 is done, all features which require breaking changes, will be implemented.
This means you can then use RxDB in production without the fear breaking your clients database-state.

## migration-strategies **BREAKING**

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
  const doc = col.findOne().exec();
  doc.doSomething();
  // > 'AAAH!'
```

## relations-populate [BREAKING]

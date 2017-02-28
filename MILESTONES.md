# 3.1.0

## Immutable Querys
When a query is created and mango-functions are done on it, it should return a new RxQuery each time without transforming the old one.

Currently:
```js
const query1 = myCol.find().sort('name');
const query2 = query1.limit(2);

console.log(query1 == query2);
// true
```

Wanted:
```js
const query1 = myCol.find().sort('name');
const query2 = query1.limit(2);

console.log(query1 == query2);
// false
```


## Query-Cache

- Requires `Immutable Querys`

When 2 equal RxQuery's are created, RxDB should ensure they are the equal object.
To do this, querys should be saved in a WeakMap and if exists, the query should be taken from it.

Currently:
```js
const query1 = myCol.find().sort('name');
const query2 = myCol.find().sort('name');

console.log(query1 == query2);
// false
```

Wanted:
```js
const query1 = myCol.find().sort('name');
const query2 = myCol.find().sort('name');

console.log(query1 == query2);
// true
```


## ChangeDetection on RxQuerys

When a `ChangeEvent` is fired on the collection, the query should detect if it is necessary to re-exec() or if the changeEvent does not affect the querys result.

Wanted:
```js
const sub = myCol.find().sort('name').$;

myDocument.age = 4;
await myDocument.save();
// query should not re-exec since a change in age does not affect the result
// but the query$ should refire the documents again

myDocument.name = 'foobar';
await myDocument.save();
// query should re-exec since a change in age does affect the result

```


## conflict-resolution

Pouchdb requires the developer to solve conflicts manually.
A solution is to introduct a new keyword to the RxSchema conflictStrategy
Here it is describe what should happen when a document-conflict happens.
There should be the following default-strategies:
first-insert-wins
last-insert-wins
lexical-ordering of the documents-hash
It should also be possible to define custom resolution-strategies.


# 3.0.0 DONE
Things that will be implemented into version 3.0.0.

When v3.0.0 is done, all features which require breaking changes, will be implemented.
This means you can then use RxDB in production without the fear breaking your clients database-state.

## migration-strategies **BREAKING**

[DONE](https://github.com/pubkey/rxdb/commit/3694436e96de666c457b558704c7588acc705a2e)



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

DONE

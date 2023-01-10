# RxDocument
A document is a single object which is stored in a collection. It can be compared to a single record in a relational database table. You get an `RxDocument` either as return on inserts, or as result-set of queries.


## insert
To insert a document into a collection, you have to call the collection's .insert()-function.
```js
myCollection.insert({
  name: 'foo',
  lastname: 'bar'
});
```

## find
To find documents in a collection, you have to call the collection's .find()-function. [See RxQuery](./rx-query.md).
```js
myCollection.find().exec() // <- find all documents
  .then(documents => console.dir(documents));
```


## Functions

### get()
This will get a single field of the document. If the field is encrypted, it will be automatically decrypted before returning.

```js
var name = myDocument.get('name'); // returns the name
```

### get$()
This function returns an observable of the given paths-value.
The current value of this path will be emitted each time the document changes.
```js
// get the live-updating value of 'name'
var isName;
myDocument.get$('name')
  .subscribe(newName => {
    isName = newName;
  });

await myDocument.incrementalPatch({name: 'foobar2'});
console.dir(isName); // isName is now 'foobar2'
```


### proxy-get
All properties of a `RxDocument` are assigned as getters so you can also directly access values instead of using the get()-function.

```js
  // Identical to myDocument.get('name');
  var name = myDocument.name;
  // Can also get nested values.
  var nestedValue = myDocument.whatever.nestedfield;

  // Also usable with observables:
  myDocument.firstName$.subscribe(newName => console.log('name is: ' + newName));
  // > 'name is: Stefe'
  await myDocument.incrementalPatch({firstName: 'Steve'});
  // > 'name is: Steve'
```

### update()
Updates the document based on the [mongo-update-syntax](https://docs.mongodb.com/manual/reference/operator/update-field/), based on [modifyjs](https://github.com/lgandecki/modifyjs#implemented).

```js

/**
 * If not done before, you have to add the update plugin.
 */
import { addRxPlugin } from 'rxdb';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBUpdatePlugin);

await myDocument.update({
    $inc: {
        age: 1 // increases age by 1
    },
    $set: {
        firstName: 'foobar' // sets firstName to foobar
    }
});
```

### modify()
Updates a documents data based on a function that mutates the current data and returns the new value.

```js

const changeFunction = (oldData) => {
    oldData.age = oldData.age + 1;
    oldData.name = 'foooobarNew';
    return oldData;
}
await myDocument.modify(changeFunction);
console.log(myDocument.name); // 'foooobarNew'
```

### patch()

Overwrites the given attributes over the documents data.

```js
await myDocument.patch({
  name: 'Steve',
  age: undefined // setting an attribute to undefined will remove it
});
console.log(myDocument.name); // 'Steve'
```


### Prevent conflicts with the incremental methods

Making a normal change to the non-latest version of a `RxDocument` will lead to a `409 CONFLICT` error because RxDB
uses [revision checks](./transactions-conflicts-revisions.md) instead of transactions.

To make a change to a document, no matter what the current state is, you can use the `incremental` methods:

```js
// update
await myDocument.incrementalUpdate({
    $inc: {
        age: 1 // increases age by 1
    }
});

// modify
await myDocument.incrementalModify(docData => {
  docData.age = docData.age + 1;
  return docData;
});

// patch
await myDocument.incrementalPatch({
  age: 100
});

// remove
await myDocument.incrementalRemove({
  age: 100
});
```



### getLatest()

Returns the latest known state of the `RxDocument`.

```js
const myDocument = await myCollection.findOne('foobar').exec();
const docAfterEdit = await myDocument.incrementalPatch({
  age: 10
});
const latestDoc = myDocument.getLatest();
console.log(docAfterEdit === latestDoc); // > true
```



### Observe $
Calling this will return an [rxjs-Observable](http://reactivex.io/rxjs/manual/overview.html#observable) which emits all change-Events belonging to this document.

```js
// get all changeEvents
myDocument.$
  .subscribe(changeEvent => console.dir(changeEvent));
```

### remove()
This removes the document from the collection. Notice that this will not purge the document from the store but set `_deleted:true` so that it will be no longer returned on queries.
To fully purge a document, use the [cleanup plugin](./cleanup.md).
```js
myDocument.remove();
```

### deleted$
Emits a boolean value, depending on whether the RxDocument is deleted or not.

```js
let lastState = null;
myDocument.deleted$.subscribe(state => lastState = state);

console.log(lastState);
// false

await myDocument.remove();

console.log(lastState);
// true
```

### get deleted
A getter to get the current value of `deleted$`.

```js
console.log(myDocument.deleted);
// false

await myDocument.remove();

console.log(myDocument.deleted);
// true
```

### toJSON()

Returns the document's data as plain json object. This will return an **immutable** object. To get something that can be modified, use `toMutableJSON()` instead.

```js
const json = myDocument.toJSON();
console.dir(json);
/* { passportId: 'h1rg9ugdd30o',
  firstName: 'Carolina',
  lastName: 'Gibson',
  age: 33 ...
*/
```

You can also set `withMetaFields: true` to get additional meta fields like the revision, attachments or the deleted flag.

```js
const json = myDocument.toJSON(true);
console.dir(json);
/* { passportId: 'h1rg9ugdd30o',
  firstName: 'Carolina',
  lastName: 'Gibson',
  _deleted: false,
  _attachments: { ... },
  _rev: '1-aklsdjfhaklsdjhf...'
*/
```

### toMutableJSON()

Same as `toJSON()` but returns a deep cloned object that can be mutated afterwards.
Remember that deep cloning is performance expensive and should only be done when necessary.


```js
const json = myDocument.toMutableJSON();
json.firstName = 'Alice'; // The returned document can be mutated
```



## NOTICE: All methods of RxDocument are bound to the instance

When you get a method from a `RxDocument`, the method is automatically bound to the documents instance. This means you do not have to use things like `myMethod.bind(myDocument)` like you would do in jsx.


### isRxDocument
Returns true if the given object is an instance of RxDocument. Returns false if not.
```js
const is = isRxDocument(myObj);
```

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

await myDocument.atomicPatch({name: 'foobar2'});
console.dir(isName); // isName is now 'foobar2'
```


### proxy-get
All properties of a `RxDocument` are assigned as getters so you can also directly access values instead of using the get()-function.

```js
  // Identical to myDocument.get('name');
  var name = myDocument.name;
  // Can also get nested values.
  var nestedValue = myDocument.whatever.nestedfield;

  // Also useable with observables:
  myDocument.firstName$.subscribe(newName => console.log('name is: ' + newName));
  // > 'name is: Stefe'
  await myDocument.atomicPatch({firstName: 'Steve'});
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

### atomicUpdate()
Updates a documents data based on a function that mutates the current data and returns the new value.
In difference to `update()`, the atomic function cannot lead to 409 write conflicts.

```js

const changeFunction = (oldData) => {
    oldData.age = oldData.age + 1;
    oldData.name = 'foooobarNew';
    return oldData;
}
await myDocument.atomicUpdate(changeFunction);
console.log(myDocument.name); // 'foooobarNew'
```

### atomicPatch()
Works like `atomicUpdate` but overwrites the given attributes over the documents data.

```js
await myDocument.atomicPatch({
  name: 'Steve',
  age: undefined // setting an attribute to undefined will remove it
});
console.log(myDocument.name); // 'Steve'
```


### Observe $
Calling this will return an [rxjs-Observable](http://reactivex.io/rxjs/manual/overview.html#observable) which emits all change-Events belonging to this document.

```js
// get all changeEvents
myDocument.$
  .subscribe(changeEvent => console.dir(changeEvent));
```

### remove()
This removes the document from the collection. Notice that this will not purge the document from the store but set `_deleted:true` like described in the [pouchdb-docs](https://pouchdb.com/guides/updating-deleting.html#deleting-documents) in option 3.
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

# RxDocument
A document is a single object which is stored in a collection. It can be compared to a single line of a mysql-table.


## insert
To insert a document into a collection, you have to call the collections .insert()-function.
```js
myCollection.insert({
  name: 'foo',
  lastname: 'bar'
});
```

## find
To find document in a collection, you have to call the collections .find()-function.
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

### set()
To change data in your document, use this function. It takes the field-path and the new value as parameter. Note that calling the set-function will not change anything in your storage directly. You have to call .save() afterly to submit changes.

```js
myDocument.set('name', 'foobar');
console.log(myDocument.get('name')); // <- is 'foobar'
```

### save()
This will store the document in the storage if it has been changed before. Call this everytime after calling the set-method.
```js
myDocument.set('name', 'foobar');
await myDocument.save(); // submit the changes to the storage
```

### remove()
This removes the document from the collection.
```js
myDocument.remove();
```

### Observe $
Calling this will return an [rxjs-Observable](http://reactivex.io/rxjs/manual/overview.html#observable) which emits all change-Events belonging to this document.

```js
// get all changeEvents
myDocument.$()
  .subscribe(changeEvent => console.dir(changeEvent));
```

### get$()
This function returns an observable of the given paths-value.
The current value of this path will be emitted, even and every time when the document changes.
```js
// get the life-updating value of 'name'
var isName;
myDocument.get$('name')
  .subscribe(newName => {
    isName = newName;
  });

myDocument.set('name', 'foobar2');
await myDocument.save();

console.dir(isName); // isName is now 'foobar2'
```

---------
If you are new to RxDB, you should continue [here](../examples)

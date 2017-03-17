# Middleware
RxDB supports middleware-hooks like [mongoose](http://mongoosejs.com/docs/middleware.html).
Middleware (also called pre and post hooks) are functions which are passed control during execution of asynchronous functions.
The hooks are specified on RxCollection-level and help to create a clear what-happens-when-structure of your code.

Hooks can be defined to run parallel or as series one after another.
Hooks can be synchronous or asynchronos when they return a Promise.
To stop the operation at a specific hook, throw an error.

## List
RxDB supports the following hooks:
- preInsert
- postInsert
- preSave
- postSave
- preRemove
- postRemove

### Why is there no validate-hook?
Different to mongoose, the validation on document-data is running on the field-level for every change to a document.
This means if your set the value ```lastName``` of a RxDocument, then the validation will only run on the changed field, not the whole document.
Therefore it is not usefull to have validate-hooks when a document is written to the database.


## Use Cases
Middleware are useful for atomizing model logic and avoiding nested blocks of async code.
Here are some other ideas:

- complex validation
- removing dependent documents
- asynchronous defaults
- asynchronous tasks that a certain action triggers
- triggering custom events
- notifications

## Usage

### Insert
An insert-hook recieves the data-object of the new document.


#### lifecycle
- RxCollection.insert is called
- preInsert series-hooks
- preInsert parallel-hooks
- schema validation runs
- new document is written to database
- postInsert series-hooks
- postInsert parallel-hooks
- event is emmited to RxDatabase and RxCollection

#### preInsert

```js
// series
myCollection.preInsert(function(documentData){

}, false);

// parallel
myCollection.preInsert(function(documentData){

}, true);

// async
myCollection.preInsert(function(documentData){
  return new Promise(res => setTimeout(res, 100));
}, false);

// stop the insert-operation
myCollection.preInsert(function(documentData){
  throw new Error('stop');
}, false);
```

#### postInsert

```js
// series
myCollection.postInsert(function(documentData){

}, false);

// parallel
myCollection.postInsert(function(documentData){

}, true);

// async
myCollection.postInsert(function(documentData){
  return new Promise(res => setTimeout(res, 100));
}, false);
```



### Save
A save-hook receives the document which is saved.

#### lifecycle
- RxDocument.save is called
- preSave series-hooks
- preSave parallel-hooks
- updated document is written to database
- postSave series-hooks
- postSave parallel-hooks
- event is emmited to RxDatabase and RxCollection

#### preSave

```js
// series
myCollection.preSave(function(doc){
  doc.anyField = 'anyValue';
}, false);

// parallel
myCollection.preSave(function(doc){

}, true);

// async
myCollection.preSave(function(doc){
  return new Promise(res => setTimeout(res, 100));
}, false);

// stop the save-operation
myCollection.preSave(function(doc){
  throw new Error('stop');
}, false);
```

#### postSave

```js
// series
myCollection.postSave(function(doc){

}, false);

// parallel
myCollection.postSave(function(doc){

}, true);

// async
myCollection.postSave(function(doc){
  return new Promise(res => setTimeout(res, 100));
}, false);
```




### Remove
An remove-hook recieves the document which is removed.

#### lifecycle
- RxDocument.remove is called
- preRemove series-hooks
- preRemove parallel-hooks
- deleted document is written to database
- postRemove series-hooks
- postRemove parallel-hooks
- event is emmited to RxDatabase and RxCollection

#### preSave

```js
// series
myCollection.preRemove(function(doc){

}, false);

// parallel
myCollection.preRemove(function(doc){

}, true);

// async
myCollection.preRemove(function(doc){
  return new Promise(res => setTimeout(res, 100));
}, false);

// stop the remove-operation
myCollection.preRemove(function(doc){
  throw new Error('stop');
}, false);
```

#### postRemove

```js
// series
myCollection.postRemove(function(doc){

}, false);

// parallel
myCollection.postRemove(function(doc){

}, true);

// async
myCollection.postRemove(function(doc){
  return new Promise(res => setTimeout(res, 100));
}, false);
```


---------
If you are new to RxDB, you should continue [here](./ORM.md)

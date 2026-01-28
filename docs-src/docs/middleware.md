---
title: Streamlined RxDB Middleware
slug: middleware.html
description: Enhance your RxDB workflow with pre and post hooks. Quickly add custom validations, triggers, and events to streamline your asynchronous operations.
image: /headers/middleware.jpg
---

# Middleware
RxDB middleware-hooks (also called pre and post hooks) are functions which are passed control during execution of asynchronous functions.
The hooks are specified on RxCollection-level and help to create a clear what-happens-when-structure of your code.

Hooks can be defined to run **parallel** or as **series** one after another.
Hooks can be **synchronous** or **asynchronous** when they return a `Promise`.
To stop the operation at a specific hook, throw an error.

## List
RxDB supports the following hooks:
- preInsert
- postInsert
- preSave
- postSave
- preRemove
- postRemove
- postCreate


### Why is there no validate-hook?
Different to mongoose, the validation on document-data is running on the field-level for every change to a document.
This means if you set the value ```lastName``` of a RxDocument, then the validation will only run on the changed field, not the whole document.
Therefore it is not useful to have validate-hooks when a document is written to the database.

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
All hooks have the plain data as first parameter, and all but `preInsert` also have the `RxDocument`-instance as second parameter. If you want to modify the data in the hook, change attributes of the first parameter.

All hook functions are also `this`-bind to the `RxCollection`-instance.

### Insert
An insert-hook receives the data-object of the new document.


#### lifecycle
- RxCollection.insert is called
- preInsert series-hooks
- preInsert parallel-hooks
- schema validation runs
- new document is written to database
- postInsert series-hooks
- postInsert parallel-hooks
- event is emitted to [RxDatabase](./rx-database.md) and [RxCollection](./rx-collection.md)

#### preInsert

```js
// series
myCollection.preInsert(function(plainData){
    // set age to 50 before saving
    plainData.age = 50;
}, false);

// parallel
myCollection.preInsert(function(plainData){

}, true);

// async
myCollection.preInsert(function(plainData){
  return new Promise(res => setTimeout(res, 100));
}, false);

// stop the insert-operation
myCollection.preInsert(function(plainData){
  throw new Error('stop');
}, false);
```

#### postInsert

```js
// series
myCollection.postInsert(function(plainData, rxDocument){

}, false);

// parallel
myCollection.postInsert(function(plainData, rxDocument){

}, true);

// async
myCollection.postInsert(function(plainData, rxDocument){
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
- event is emitted to RxDatabase and RxCollection

#### preSave

```js
// series
myCollection.preSave(function(plainData, rxDocument){
    // modify anyField before saving
    plainData.anyField = 'anyValue';
}, false);

// parallel
myCollection.preSave(function(plainData, rxDocument){

}, true);

// async
myCollection.preSave(function(plainData, rxDocument){
  return new Promise(res => setTimeout(res, 100));
}, false);

// stop the save-operation
myCollection.preSave(function(plainData, rxDocument){
  throw new Error('stop');
}, false);
```

#### postSave

```js
// series
myCollection.postSave(function(plainData, rxDocument){

}, false);

// parallel
myCollection.postSave(function(plainData, rxDocument){

}, true);

// async
myCollection.postSave(function(plainData, rxDocument){
  return new Promise(res => setTimeout(res, 100));
}, false);
```




### Remove
An remove-hook receives the document which is removed.

#### lifecycle
- RxDocument.remove is called
- preRemove series-hooks
- preRemove parallel-hooks
- deleted document is written to database
- postRemove series-hooks
- postRemove parallel-hooks
- event is emitted to RxDatabase and RxCollection

#### preRemove

```js
// series
myCollection.preRemove(function(plainData, rxDocument){

}, false);

// parallel
myCollection.preRemove(function(plainData, rxDocument){

}, true);

// async
myCollection.preRemove(function(plainData, rxDocument){
  return new Promise(res => setTimeout(res, 100));
}, false);

// stop the remove-operation
myCollection.preRemove(function(plainData, rxDocument){
  throw new Error('stop');
}, false);
```

#### postRemove

```js
// series
myCollection.postRemove(function(plainData, rxDocument){

}, false);

// parallel
myCollection.postRemove(function(plainData, rxDocument){

}, true);

// async
myCollection.postRemove(function(plainData, rxDocument){
  return new Promise(res => setTimeout(res, 100));
}, false);
```

### postCreate
This hook is called whenever a `RxDocument` is constructed.
You can use `postCreate` to modify every RxDocument-instance of the collection.
This adds a flexible way to add specify behavior to every document. You can also use it to add custom getter/setter to documents. PostCreate-hooks cannot be **asynchronous**.


```js
myCollection.postCreate(function(plainData, rxDocument){
    Object.defineProperty(rxDocument, 'myField', {
        get: () => 'foobar',
    });
});

const doc = await myCollection.findOne().exec();

console.log(doc.myField);
// 'foobar'
```

:::note
This hook does not run on already created or cached documents. Make sure to add `postCreate`-hooks before interacting with the collection.
:::

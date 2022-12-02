# Local Documents

Local documents are a special class of documents which are used to store local metadata.
They come in handy when you want to store settings or additional data next to your documents.

- Local Documents can exist on `RxDatabase` or `RxCollection`.
- Local Document do not have to match the collections schema.
- Local Documents do not get replicated.
- Local Documents will not be found on queries.
- Local Documents can not have attachments.
- Local Documents will not get handled by the [data-migration](./data-migration.md).
- The id of a local document has the `maxLength` of `128` characters.


## Add the local documents plugin

To enable the local documents, you have to add the `local-documents` plugin.

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBLocalDocumentsPlugin } from 'rxdb/plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);
```

## Activate the plugin for a RxDatabase or RxCollection

For better performance, the local document plugin does not create a storage for every database or collection that is created.
Instead you have to set `localDocuments: true` when you want to store local documents in the instance.

```js
// activate local documents on a RxDatabase
const myDatabase = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageDexie(),
    localDocuments: true // <- activate this to store local documents in the database
});

myDatabase.addCollections({
  messages: {
    schema: messageSchema,
    localDocuments: true // <- activate this to store local documents in the collection
  }
});
```

**NOTICE:** If you want to store local documents in a `RxCollection` but **NOT** in the `RxDatabase`, you **MUST NOT** set `localDocuments: true` in the `RxDatabase` because it will only slow down the initial database creation.

## insertLocal()

Creates a local document for the database or collection. Throws if a local document with the same id already exists. Returns a Promise which resolves the new `RxLocalDocument`.

```javascript
const localDoc = await myCollection.insertLocal(
    'foobar',   // id
    {           // data
        foo: 'bar'
    }
);

// you can also use local-documents on a database
const localDoc = await myDatabase.insertLocal(
    'foobar',   // id
    {           // data
        foo: 'bar'
    }
);
```

## upsertLocal()

Creates a local document for the database or collection if not exists. Overwrites the if exists. Returns a Promise which resolves the `RxLocalDocument`.

```javascript
const localDoc = await myCollection.upsertLocal(
    'foobar',   // id
    {           // data
        foo: 'bar'
    }
);
```

## getLocal()

Find a `RxLocalDocument` by its id. Returns a Promise which resolves the `RxLocalDocument` or `null` if not exists.

```javascript
const localDoc = await myCollection.getLocal('foobar');
```

## getLocal$()

Like `getLocal()` but returns an `Observable` that emits the document or `null` if not exists.

```javascript
const subscription = myCollection.getLocal$('foobar').subscribe(documentOrNull => {
    console.dir(documentOrNull); // > RxLocalDocument or null
});
```

## RxLocalDocument

A `RxLocalDocument` behaves like a normal `RxDocument`.

```javascript
const localDoc = await myCollection.getLocal('foobar');

// access data
const foo = localDoc.get('foo');

// change data
localDoc.set('foo', 'bar2');
await localDoc.save();

// observe data
localDoc.get$('foo').subscribe(value => { /* .. */ });

// remove it
await localDoc.remove();
```

## NOTICE: Because the local document does not have a schema, accessing the documents data-fields via pseudo-proxy will not work.

```javascript
const foo = localDoc.foo; // undefined
const foo = localDoc.get('foo'); // works!

localDoc.foo = 'bar'; // does not work!
localDoc.set('foo', 'bar'); // works
```

For the usage with typescript, you can have access to the typed data of the document over `toJSON()`

```ts
declare type MyLocalDocumentType = {
  foo: string
}
const localDoc = await myCollection.upsertLocal<MyLocalDocumentType>(
    'foobar',   // id
    {           // data
        foo: 'bar'
    }
);

// typescript will know that foo is a string
const foo: string = localDoc.toJSON().foo;
```

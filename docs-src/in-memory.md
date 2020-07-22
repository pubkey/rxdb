# InMemory Collections

When you do a heavy amount of operations on a `RxCollection`, you might want to optimize this by using the in-memory-replication of the collection. The in-memory-replication behaves equal to the original collection but is stored in the Memory of your computer instead of the hard drive. It inherits the `statics` of the original collection, but not its hooks -so you should register them separately in the case you'd want them to apply.

## Pros:

- Faster queries
- Faster writes
- Querying works over encrypted fields

## Cons:

- The original collection has to be small enough to fit into the memory
- No attachment-support
- Initial creation takes longer (all data is loaded from disc into the memory)


### encryption
Encrypted fields are automatically decrypted inside of the memory-collection. This means you can do queries over encrypted fields.

### replication
The memory-collection is two-way-replicated with its original collection. This means when you change documents on one of them, the update and the change-event will fire on both.

## RxCollection().inMemory();

Returns a promise that resolves with another `RxCollection` that is the in-memory-replicated version of the original collection. The memory-collection has the same documents as it's parent and also shares the same event-stream.

```javascript

// IMPORTANT: You have to add the memory-adapter before you can use inMemory-Collections
// RUN 'npm install pouchdb-adapter-memory --save'
import PouchAdapterMemory from 'pouchdb-adapter-memory';
addRxPlugin(PouchAdapterMemory);

const memCol = await myCollection.inMemory();

// now u can use memCol as it would be myCollection
const docs = await memCol.find().exec(); // has same result as on the original collection

```

## RxCollection().awaitPersistence()

When you do a write into the inMemoryCollection, it takes some time until the change is replicated at the parents collections.
To know when you can be sure that all writes have been replicated, call `awaitPersistence()`

```js
const memCol = await myCollection.inMemory();

await memCol.insert({foo: 'bar'});

await memCol.awaitPersistence(); // after this you can be sure that everything is replicated
```

--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./query-cache.md)

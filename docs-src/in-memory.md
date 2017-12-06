# in-memory

When you do a heavy amount of operations on a `RxCollection`, you might want to optimize this by using the in-memory-replication of the collection. The in-memory-replication behaves equal to the original collection but is stored in the Ram of your computer.

## RxCollection().inMemory();

Returns a promise that resolves with another `RxCollection` that is the in-memory-replicated version of the original collection. The memory-collection has the same documents as it's parent and also shares the same event-stream.

```javascript

// IMPORTANT: You have to add the memory-adapter before you can use inMemory-Collections
// RUN 'npm install pouchdb-adapter-memory --save'
import PouchAdapterMemory from 'pouchdb-adapter-memory';
RxDB.plugin(PouchAdapterMemory);

const memCol = await myCollection.inMemory();

// now u can use memCol as it would be myCollection
const docs = await memCol.find().exec(); // has same result as on the original collection

```

### encryption
Encrypted fields are automatically decrypted inside of the memory-collection. This means you can do queries over encrypted fields.

### replication
The memory-collection is two-way-replicated with its original collection. This means when you change documents on one of them, the update and the change-event will fire on both.

## Pros:

- Faster queries
- Faster writes
- Querying works over encrypted fields

## Cons:

- The original collection has to be small enough to fit into the memory
- No attachment-support
- Initial creation takes longer (all data is loaded from disc into the memory)


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./local-documents.md)

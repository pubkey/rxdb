# in-memory

When you do a heavy amount of operations on a `RxCollection`, you might want to optimize this by using the in-memory-replication of the collection. The in-memory-replication behaves equal to the original collection.

## RxCollection().inMemory();

Returns a promise that resolves with another `RxCollection` that is the in-memory-replicated version of the original collection. The memory-collection has the same documents as its parent and also shares the same event-stream.

```javascript

const memCol = await myCollection.inMemory();

// now u can use memCol as it would be myCollection

const docs = await memCol.find().exec(); // has same result as on the original collection
```

### Pros:

- Faster queries
- Faster writes
- Querying works over encrypted fields

### Cons:

- The Collections has to be small enough to fit into the memory
- No attachment-support
- Initial creation takes longer (all data is loaded into the memory)


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./custom-build.md)

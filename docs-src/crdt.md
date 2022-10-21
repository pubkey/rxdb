# CRDT





## Deleting documents

You can deleted documents with a crdt operation by setting `_deleted` to true. Calling `RxDocument.remove()` will do exactly the same when CRDTs are activated.

```ts
await doc.updateCRDT({
    ifMatch: {
        $set: {
            _deleted: true
        }
    }
});
```

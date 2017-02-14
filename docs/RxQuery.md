# RxQuery
A query defines how to find documents in your collection. With RxDB you can use and chained querys.



## remove()
Deletes all found documents. Returns a promise which resolves to the deleted documents.

```js
const query = myCollection.find().where('age').lt(18);
const removedDocs = await query.remove();
```

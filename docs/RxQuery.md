# RxQuery

A query defines how to find documents in your collection. With RxDB you can use and chained querys.

## remove()

Deletes all found documents. Returns a promise which resolves to the deleted documents.

```javascript
const query = myCollection.find().where('age').lt(18);
const removedDocs = await query.remove();
```

## NOTICE: RxQuery's are immutable

Because RxDB is a reactive database, we can do heavy performance-optimisation on query-results which change over time. To be able to do this, RxQuerys have to be immutable.
This means, when you have a `RxQuery` and run a `.where()` on it, the original RxQuery-Object is not changed. Instead the where-function returns a new RxQuery-Object with the changed where-field. Keep this in mind if you create RxQuery's and change them afterwards.

Example:

```javascript
const queryObject = myCollection.find().where('age').gt(18);
queryObject.sort('name');
const results = await queryObject.exec();
console.dir(results); // result-documents are not sorted by name

const queryObjectSort = queryObject.sort('name');
const results = await queryObjectSort.exec();
console.dir(results); // result-documents are now sorted
```

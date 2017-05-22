# RxQuery

A query defines how to find documents in your collection. With RxDB you can use chained queries.

## remove()

Deletes all found documents. Returns a promise which resolves to the deleted documents.

```javascript
// All documents where the age is less than 18
const query = myCollection.find().where('age').lt(18);
// Remove the documents from the collection
const removedDocs = await query.remove();
```

## NOTICE: RxQuery's are immutable

Because RxDB is a reactive database, we can do heavy performance-optimisation on query-results which change over time. To be able to do this, RxQuery's have to be immutable.
This means, when you have a `RxQuery` and run a `.where()` on it, the original RxQuery-Object is not changed. Instead the where-function returns a new RxQuery-Object with the changed where-field. Keep this in mind if you create RxQuery's and change them afterwards.

Example:

```javascript
const queryObject = myCollection.find().where('age').gt(18);
// Creates a new RxQuery object, does not modify previous one
queryObject.sort('name');
const results = await queryObject.exec();
console.dir(results); // result-documents are not sorted by name

const queryObjectSort = queryObject.sort('name');
const results = await queryObjectSort.exec();
console.dir(results); // result-documents are now sorted
```


---------
If you are new to RxDB, you should continue [here](./Middleware.md)

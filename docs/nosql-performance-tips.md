# RxDB NoSQL Performance Tips

> Skyrocket your NoSQL speed with RxDB tips. Learn about bulk writes, optimized queries, and lean plugin usage for peak performance.

# Performance tips for RxDB and other NoSQL databases

In this guide, you'll find techniques to improve the performance of RxDB operations and queries. Notice that all your performance optimizations should be done with a correct tracking of the metrics, otherwise you might change stuff into the wrong direction.

## Use bulk operations

When you run write operations on multiple documents, make sure you use bulk operations instead of single document operations.

```ts
// wrong ❌
for(const docData of dataAr){
    await myCollection.insert(docData);
}

// right ✔️
await myCollection.bulkInsert(dataAr);
```

## Help the query planner by adding operators that better restrict the index range

Often on complex queries, RxDB (and other databases) do not pick the optimal index range when querying a result set.
You can add additional restrictive operators to ensure the query runs over a smaller index space and has a better performance.

Lets see some examples for different query types.

```ts
/**
 * Adding a restrictive operator for an $or query
 * so that it better limits the index space for the time-field.
 */
const orQuery = {
    selector: {
        $or: [
            {
                time: { $gt: 1234 },
            },
            {
                time: { $eg: 1234 },
                user: { $gt: 'foobar' }
            },
        ]
        time: { $gte: 1234 } // <- add restrictive operator
    }
}

/**
 * Adding a restrictive operator for an $regex query
 * so that it better limits the index space for the user-field.
 * We know that all matching fields start with 'foo' so we can
 * tell the query to use that as lower constraint for the index.
 */
const regexQuery = {
    selector: {
        user: {
            $regex: '^foo(.*)0-9$', // a complex regex with a ^ in the beginning
            $gte: 'foo' // <- add restrictive operator
        }
    }
}

/**
 * Adding a restrictive operator for a query on an enum field.
 * so that it better limits the index space for the time-field.
 */

const enumQuery = {
    selector: {
        /**
         * Here lets assume our status field has the enum type ['idle', 'in-progress', 'done']
         * so our restrictive operator can exclude all documents with 'done' as status.
         */
        status: {
            $in: {
                'idle',
                'in-progress',
            },
            $gt: 'done' // <- add restrictive operator on status
        }
    }
}
```

## Set a specific index

Sometime the query planner of the database itself has no chance in picking the best index of the possible given indexes.
For queries where performance is very important, you might want to explicitly specify which index must be used.

```ts
const myQuery = myCollection.find({
    selector: {
        /* ... */
    },
    // explicitly specify index
    index: [
        'fieldA',
        'fieldB'
    ]

});
```

## Try different ordering of index fields

The order of the fields in a compound index is very important for performance. When optimizing index usage, you should try out different orders on the index fields and measure which runs faster. For that it is very important to run tests on real-world data where the distribution of the data is the same as in production.
For example when there is a query on a user collection with an `age` and a `gender` field, it depends if the index `['gender', 'age']` performance better as `['age', 'gender']` based on the distribution of data:

```ts
const query = myCollection
    .findOne({
      selector: {
        age: {
          $gt: 18
        },
        gender: {
          $eq: 'm'
        }
      },
      /**
       * Because the developer knows that 50% of the documents are 'male',
       * but only 20% are below age 18,
       * it makes sense to enforce using the ['gender', 'age'] index to improve performance.
       * This could not be known by the query planer which might have chosen ['age', 'gender'] instead.
       */
      index: ['gender', 'age']
    });
```

Notice that RxDB has the [Query Optimizer Plugin](./query-optimizer.md) that can be used to automatically find the best indexes.

## Make a Query "hot" to reduce load

Having a query where the up-to-date result set is needed more than once, you might want to make the query "hot" by permanently subscribing to it. This ensures that the query result is kept up to date by RxDB ant the [EventReduce algorithm](https://github.com/pubkey/event-reduce) at any time so that at the moment you need the current results, it has them already.

For example when you use RxDB at Node.js for a webserver, you should use an outer "hot" query instead of running the same query again on every request to a route.

```ts
// wrong ❌
app.get('/list', (req, res) => {
    const result = await myCollection.find({/* ... */}).exec();
    res.send(JSON.stringify(result));
});

// right ✔️
const query = myCollection.find({/* ... */});
query.subscribe(); // <- make it hot

app.get('/list', (req, res) => {
    const result = await query.exec();
    res.send(JSON.stringify(result));
});
```

## Store parts of your document data as attachment

For in-app databases like RxDB, it does not make sense to partially parse the `JSON` of a document. Instead, always the whole document json is parsed and handled. This has a better performance because `JSON.parse()` in JavaScript directly calls a C++ binding which can parse really fast compared to a partial parsing in JavaScript itself. Also by always having the full document, RxDB can de-duplicate memory caches of document across multiple queries.

The downside is that very very big documents with a complex structure can increase query time significantly. Documents fields with complex that are mostly not in use, can be move into an [attachment](./rx-attachment.md). This would lead RxDB to not fetch the attachment data each time the document is loaded from disc. Instead only when explicitly asked for.

```ts
const myDocument = await myCollection.insert({/* ... */});
const attachment = await myDocument.putAttachment(
    {
        id: 'otherStuff.json',
        data: createBlob(JSON.stringify({/* ... */}), 'application/json'),
        type: 'application/json'
    }
);
```

## Process queries in a worker process

Moving database storage into a WebWorker can significantly improve performance in web applications that use RxDB or similar NoSQL databases. When database operations are executed in the main JavaScript thread, they can block or slow down the User Interface, especially during heavy or complex data operations. By offloading these operations to a WebWorker, you effectively separate the data processing workload from the UI thread. This means the main thread remains free to handle user interactions and render updates without delay, leading to a smoother and more responsive user experience. Additionally, WebWorkers allow for parallel data processing, which can expedite tasks like querying and indexing. This approach not only enhances UI responsiveness but also optimizes overall application performance by leveraging the multi-threading capabilities of modern browsers.
With RxDB you can use the [Worker](./rx-storage-worker.md) and [SharedWorker](./rx-storage-shared-worker.md) plugin to move the query processing away from the main thread.

## Use less plugins and hooks

Utilizing fewer [hooks](./middleware.md) and plugins in RxDB or similar NoSQL database systems can lead to markedly better performance. Each additional hook or plugin introduces extra layers of processing and potential overhead, which can cumulatively slow down database operations. These extensions often execute additional code or enforce extra checks with each operation, such as insertions, updates, or deletions. While they can provide valuable functionalities or custom behaviors, their overuse can inadvertently increase the complexity and execution time of basic database operations. By minimizing their use and only employing essential hooks and plugins, the system can operate more efficiently. This streamlined approach reduces the computational burden on each transaction, leading to faster response times and a more efficient overall data handling process, especially critical in high-load or real-time applications where performance is paramount.

---
title: RxPipeline - Automate Data Flows in RxDB
slug: rx-pipeline.html
description: Discover how RxPipeline automates your data workflows. Seamlessly process writes, manage leader election, and ensure crash-safe operations in RxDB.
---

# RxPipeline

The RxPipeline plugin enables you to run operations depending on writes to a collection.
Whenever a write happens on the source collection of a pipeline, a handler is called to process the writes and run operations on another collection.

You could have a similar behavior by observing the collection stream and process data on emits:

```ts
mySourceCollection.$.subscribe(event => {/* ...process...*/});
```

While this could work in some cases, it causes many problems that are fixed by using the pipeline plugin instead:
- In an RxPipeline, only the [Leading Instance](./leader-election.md) runs the operations. For example when you have multiple browser tabs open, only one will run the processing and when that tab is closed, another tab will become elected leader and continue the pipeline processing.
- On sudden stops and restarts of the JavaScript process, the processing will continue at the correct checkpoint and not miss out any documents even on unexpected crashes.
- Reads/Writes on the destination collection are halted while the pipeline is processing. This ensures your queries only return fully processed documents and no partial results. So when you run a query to the destination collection directly after a write to the source collection, you can be sure your query results are up to date and the pipeline has already been run at the moment the query resolved:

```ts
await mySourceCollection.insert({/* ... */});

/**
 * Because our pipeline blocks reads to the destination,
 * we know that the result array contains data created
 * on top of the previously inserted documents.
 */
const result = myDestinationCollection.find().exec();
```



## Creating a RxPipeline

Pipelines are created on top of a source [RxCollection](./rx-collection.md) and have another `RxCollection` as destination. An identifier is used to identify the state of the pipeline so that different pipelines have a different processing checkpoint state. A plain JavaScript function `handler` is used to process the data of the source collection writes.

```ts
const pipeline = await mySourceCollection.addPipeline({
    identifier: 'my-pipeline',
    destination: myDestinationCollection,
    handler: async (docs) => {
        /**
         * Here you can process the documents and write to
         * the destination collection.
         */
        for (const doc of docs) {
            await myDestinationCollection.insert({
                id: doc.primary,
                category: doc.category
            });
        }
    }
});
```


## Use Cases for RxPipeline

The RxPipeline is a handy building block for different features and plugins. You can use it to aggregate data or restructure local data.

### UseCase: Re-Index data that comes from replication

Sometimes you want to [replicate](./replication.md) atomic documents over the wire but locally you want to split these documents for better indexing. For example you replicate email documents that have multiple receivers in a string-array. While string-arrays cannot be indexed, locally you need a way to query for all emails of a given receiver.
To handle this case you can set up a RxPipeline that writes the mapping into a separate collection:

```ts
const pipeline = await emailCollection.addPipeline({
    identifier: 'map-email-receivers',
    destination: emailByReceiverCollection,
    handler: async (docs) => {
        for (const doc of docs) {
            // remove previous mapping
            await emailByReceiverCollection.find({emailId: doc.primary}).remove();
            // add new mapping
            if(!doc.deleted) {
                await emailByReceiverCollection.bulkInsert(
                    doc.receivers.map(receiver => ({
                        emailId: doc.primary,
                        receiver: receiver
                    }))
                );
            }
        }
    }
});
```

With this you can efficiently query for "all emails that a person received" by running:

```ts
const mailIds = await emailByReceiverCollection.find({
    receiver: 'foobar@example.com'
}).exec();
```

### UseCase: Fulltext Search

You can utilize the pipeline plugin to index text data for efficient fulltext search.

```ts
const pipeline = await emailCollection.addPipeline({
    identifier: 'email-fulltext-search',
    destination: mailByWordCollection,
    handler: async (docs) => {
        for (const doc of docs) {
            // remove previous mapping
            await mailByWordCollection.find({emailId: doc.primary}).remove();
            // add new mapping
            if(!doc.deleted) {
                const words = doc.text.split(' ');
                await mailByWordCollection.bulkInsert(
                    words.map(word => ({
                        emailId: doc.primary,
                        word: word
                    }))
                );
            }
        }
    }
});
```

With this you can efficiently query for "all emails that contain a given word" by running:

```ts
const mailIds = await emailByReceiverCollection.find({word: 'foobar'}).exec();
```

### UseCase: Download data based on source documents

When you have to fetch data for each document of a collection from a server, you can use the pipeline to ensure all documents have their data downloaded and no document is missed.

```ts
const pipeline = await emailCollection.addPipeline({
    identifier: 'download-data',
    destination: serverDataCollection,
    handler: async (docs) => {
        for (const doc of docs) {
            const response = await fetch('https://example.com/doc/' + doc.primary);
            const serverData = await response.json();
            await serverDataCollection.upsert({
                id: doc.primary,
                data: serverData
            });
        }
    }
});
```

## RxPipeline methods

### awaitIdle()

You can await the idleness of a pipeline with `await myRxPipeline.awaitIdle()`. This will await a promise that resolves when the pipeline has processed all documents and is not running anymore.

### close()

`await myRxPipeline.close()` stops the pipeline so that it is no longer doing stuff. This is automatically called when the RxCollection or RxDatabase of the pipeline is closed.

### remove()

`await myRxPipeline.remove()` removes the pipeline and all metadata which it has stored. Recreating the pipeline afterwards will start processing all source documents from scratch.


## Using RxPipeline correctly

### Pipeline handlers must be idempotent

Because a JavaScript process can exit at any time, like when the user closes a browser tab, the pipeline handler function must be idempotent. This means when it only runs partially and is started again with the same input, it should still end up in the correct result.

### Pipeline handlers must not throw

Pipeline handlers must never throw. If you run operations inside of the handler that might cause errors, you must wrap the handler's code with a `try-catch` by yourself and also handle retries. If your handler throws, your pipeline will be stuck and no longer be usable, which should never happen.

### Be careful when doing http requests in the handler

When you run http requests inside of your handler, you no longer have an [offline first](./offline-first.md) application because reads to the destination collection will be blocked until all handlers have finished. When your client is offline, therefore the collection will be blocked for reads and writes.

### Pipelines temporarily block external reads and writes

While a pipeline is running, **all reads and writes to its destination collection are blocked**. This guarantees that queries never observe partially processed data, but it also means that pipelines can block each other if they interact incorrectly.

Problems occur when multiple pipelines:

- read or write across the same collections, or
- wait for each other using `awaitIdle()` from inside a pipeline handler.

```ts
// Example of a deadlock

// Pipeline A: files → files (reads folders)
const pipelineA = await db.files.addPipeline({
  identifier: 'file-path-sync',
  destination: db.files,
  handler: async (docs) => {
    const folders = await folders.find().exec(); // can block
    /* ... */
  }
});

// Pipeline B: files → folders (waits for A)
await db.folders.addPipeline({
  identifier: 'file-count',
  destination: db.folders,
  handler: async () => {
    await pipelineA.awaitIdle(); // ❌ may deadlock
    /* ... */
  }
});
```

To prevent deadlocks, consider:

- Never call `awaitIdle()` inside a pipeline handler.
- Avoid circular dependencies between pipelines.
- Prefer one-directional data flow.


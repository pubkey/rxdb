---
title: JavaSCript Vector Database
slug: javascript-vector-database.html
---


# Local-First Vector Database with RxDB and transformers.js

- Local First is the new trend for web and mobile apps
- Vector databases create new possiblities in how to store and query data.
- RxDB is a local first javascript database with a flexible storage layer
- transformers.js is a framework to run models inside of applications with WASM or WebGPU

In this article we combine these technologies to create a local first vector database that runs in a browser and stores data on IndexedDB and runs our ML model in WebAssembly.

## What is a vector database?

A vector database is a specialized type of database designed to store, retrieve, and manage data represented as vectors, so called "embeddings". An embedding is the output of a given machine learning model like [all-MiniLM-L6-v2](https://huggingface.co/Xenova/all-MiniLM-L6-v2).

> A vector (=embedding) is an array of numbers like `[0.56, 0.12, -0.34, 0.78, -0.90]`.

While you could ask a normal database about "which email is older then date X". You can ask a vector database way more vague stuff like `Which emails are about databases?` or `Which emails are polite?`.

Also a vector database cannot only index **text** content. With the right model, an embedding can be created from anything else like **videos**, **images** or **audio**.

:::note
Notice that vector embeddings from different machine learning models or versions are not compatible with each other. When you change your model, you have to recreate all embeddings for your data.
:::

A vector database allows for new use cases that cannot be accomblished with a normal database:
- Search (where results are ranked by relevance to a query string)
- Clustering (where text strings are grouped by similarity)
- Recommendations (where items with related text strings are recommended)
- Anomaly detection (where outliers with little relatedness are identified)
- Diversity measurement (where similarity distributions are analyzed)
- Classification (where text strings are classified by their most similar label)

In this tutorial we will create a vector database that is intendet to be used as a **recommendation engine**. For other use cases you have to modify the setup. This is the reason why RxDB does not have a fixed vector-database plugin but instead only provides utility functions to set up your own vector search.


## Benefits of local-first compared to a server vector database

- Zero network latency
- Works offline
- Full privacy. Fully works without data leaving the users device.
- Easy to set up. No backend servers required, it just works.
- Zero Cost. You do not have to pay for any LLM API

## Transform NoSQL documents into embeddings inside of the browser

Because we want to build a local-first application that does not send potential sensitive data to any server or API, we have to calculate the embeddings locally, on the users device.

With [transformers.js](https://github.com/xenova/transformers.js) from [huggingface](https://huggingface.co/docs/transformers.js/index) you can run machine learning models on the Web or on any JavaScript apps. Lets implement a `getEmbeddingFromText()` function that transforms a given text into an embedding:

```js
import { pipeline } from "@xenova/transformers";
const pipePromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
async function getEmbeddingFromText(text) {
  const pipe = await pipePromise;
  const output = await pipe(text, {
    pooling: "mean",
    normalize: true,
  });
  return Array.from(output.data);
}
```

## Storing the Embeddings in RxDB

Because RxDB is a NoSQL database, you can store any nested structure (like embeddings) inside of your documents.
So lets define a schema that describes how we want to store the embeddings that are stored for each of our documents.

```ts
const schema = {
    "version": 0,
    "primaryKey": "id",
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "maxLength": 100
        },
        "embedding": {
            "type": "array",
            "items": {
                "type": "number"
            }
        }
    },
    "required": [
        "id",
        "embedding"
    ]
}
```

When we store normal documents in our database, we need a way to automatically store the embeddings of that document beside the data. To do that, on all writes to our base collection, a handler must be run that calls the model, generates the embeddings and stores them in another collection.

But because we build an app that runs in a browser, it is also important to ensure that when multiple browser tabs are open, exactly one is doing the work and we do not waste resources. Also when the app is closed at any time, we want to continue processing our documents at the correct position.

RxDB has the [pipeline plugin](../rx-pipeline.md) for that. We set up a pipeline that takes all document writes from our source collection, and store their embeddings in the vector collection:

```ts
const pipeline = await mySourceCollection.addPipeline({
    identifier: 'my-embeddings-pipeline',
    destination: vectorCollection,
    batchSize: 10,
    handler: async (docs) => {
        await Promise.all(docs.map(async(doc) => {
            const embedding = await getVectorFromText(doc.text);
            await vectorCollection.upsert({
                id: doc.primary,
                embedding
            });
        }));
    }
});
```

Running this shows the first problem of local data processing. The performance is way to slow. Running the handler with a batchSize of 10 takes about 2-4 seconds on my laptop. Processing our test dataset of 10k documents would take about one hour.
To improve performance, lets run parrallel processing of the embeddings by using [WebWorkers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers). We set the `batchSize` of the pipline to the number of logical processors `navigator.hardwareConcurrency` and also start one webworker per processor. With this we can utilize the full hardware potential of the clients machine and process 10k embeddings in about 5 minutes.

## Comparing Vectors by calculating the distance

Several methods exist to compare the difference of two given vectors (embeddings):

- euclidean distance
- manhattan distance
- cosine similarity
- jaccard similarity

RxDB exports all of these functions as utilities so you can conveniently use them. In the following of this tutorial we use the **euclidean distance** everywhere. In your app, you have to try out which algorithm works best which mostly depends on your data's vector distribution and query type.

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';

const distance = euclideanDistance(embedding1, embedding2);
console.log(distance); // 25.20443
```

## Searching the Vector database with a full table scan

Now that we have stored our embeddings and we know how we want to compare them with each other, lets do a simple query to test if everything is correct.
In our query we want to find documents that are similar to a given one of our dataset.
We just query all documents, compare their distance with the query vector and then sort these.

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';
import { sortByObjectNumberProperty } from 'rxdb/plugins/core';

// use a sample vector from your dataset as query
const sampleDoc = await vectorCollection.findOne().exec();
const queryVector = sampleDoc.embedding;
const candidates = await vectorCollection.find().exec();
const withDistance = candidates.map(doc => ({ doc, distance: euclideanDistance(queryVector, doc.embedding) }))
const queryResult = withDistance.sort(sortByObjectNumberProperty('distance'));
console.dir(queryResult);
```


:::note
Depending on your vector comparison function, have to sort smallest first for all `distance` algorithm and biggest first for all `similarity` algorithms.
:::

If we check the results of our sorted list, our vector database seems to work correctly and actually returns more relevant documents first. But we have a big problem: Querying all vectors on each search scales really bad. The more documents we have stored, the longer it will take the database to return results. When we add time logs to the steps of our query function, we can see that fetching the embeddings takes about **700 milliseconds** for your database of 10k documents. If we would have 100k embeddings stored, it would already take 7 seconds only for fetching the embeddings.


## Indexing the Vectors for better performance

To fix the scaling problem, we have to store the embeddings in a way where not all of them must be fetched from the storage when running a query. In normal databases you would sort the documents by a given index field and be able to efficiently query only the documents that you need. An index stores the data in a sorted way, like a phone book. The problem is that we do not have single numbers as a sortable value. Instead we have vectors that contain a big list of numbers. There exist several methods to index these list of numbers.

### Possible indexing methods

- Locality Sensitive Hashing
- Hierarchical Navigable Small Worlds (HNSW)
- hierarchical small world
- Distance to samples: While testing different indexing strategies, [I](https://github.com/pubkey) found out that using the distance to a sample set of items is a good way to index embeddings. You pick like 5 random items of your data and get the embedding for them out of the model. For each embedding stored in the vector database, we calculate the distance to our sample embeddings and store that `number` value as an index. This seems to work good because similar things have similar distances to other things. For example the words "shoe" and "socks" have a similar distance to "boat" and therefore should have roughtly the same index value.

A problem when doing local first stuff always is the **performance**. In browser JavaScript you do not have that many options to store data and mostly you would rely on **IndexedDB**. You have to know that there are things to do with Indexeddb that are fast, [and things that are slow](../slow-indexeddb.md). Doing many serial `get by id` calls is slow. Doing a bulk `get by index range` is fast. To leverage that, you should use an index that stores the embeddings in a sortable way like `Locality Sensitive Hashing` or `Distance to samples`. In the following we will always use `Distance to samples` because for [me](https://github.com/pubkey) it seems to have the best default behavior for our dataset.

### Storing indexed embeddings in RxDB

The best way to store the index values is to put them beside the embedding into the RxCollection. Notice that we transform all index values to a `string` with exactly 10 chars. This ensure that the values are sortable and numbers with many decimals are handled properly.

```ts
const indexSchema = {
    type: 'string',
    maxLength: 10
};
const schema = {
    "version": 0,
    "primaryKey": "id",
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
            "maxLength": 100
        },
        "embedding": {
            "type": "array",
            "items": {
                "type": "number"
            }
        },
        // index fields
        "idx0": indexSchema,
        "idx1": indexSchema,
        "idx2": indexSchema,
        "idx3": indexSchema,
        "idx4": indexSchema
    },
    "required": [
        "id",
        "embedding",
        "idx0",
        "idx1",
        "idx2",
        "idx3",
        "idx4"
    ],
    "indexes": [
        "idx0",
        "idx1",
        "idx2",
        "idx3",
        "idx4"
    ]
}
```

To store the index values, we have to adapter the handler of our [RxPipeline](../rx-pipeline.md):

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';
const sampleVectors: number[][] = [/* the vectors of our sample set*/];
const pipeline = await mySourceCollection.addPipeline({
    handler: async (docs) => {
        await Promise.all(docs.map(async(doc) => {
            const embedding = await getEmbedding(doc.text);
            const docData = { id: doc.primary, embedding };
            // calculate the distance to all samples and store them in the index fields
            new Array(5).fill(0).map((_, idx) => {
                const indexValue = euclideanDistance(sampleVectors[idx], embedding) + '';
                docData['idx' + idx] = indexValue.slice(0, 10);
            });
            await vectorCollection.upsert(docData);
        }));
    }
});
```

## Searching the Vector database with utilization of the indexes

Now that we have stored our embeddings in an indexed format, we can use different methods to query more efficiently compared to a full table scan. There are many methods on how to use the indexes, let me show you two of them:



1. Query for Index-Ranges in both directions:

```ts
async function vectorSearchLimit(searchEmbedding: number[]) {
    const docsPerIndexSide = 100;
    const candidates = new Set<RxDocument>();
    await Promise.all(
        new Array(5).fill(0).map(async (_, i) => {
            const distanceToIndex = euclideanDistance(sampleVectors[i], searchEmbedding);
            const [docsBefore, docsAfter] = await Promise.all([
                vectorCollection.find({
                    selector: {
                        ['idx' + i]: {
                            $lt: indexNrToString(distanceToIndex)
                        }
                    },
                    sort: [{ ['idx' + i]: 'desc' }],
                    limit: docsPerIndexSide
                }).exec(),
                vectorCollection.find({
                    selector: {
                        ['idx' + i]: {
                            $gt: indexNrToString(distanceToIndex)
                        }
                    },
                    sort: [{ ['idx' + i]: 'asc' }],
                    limit: docsPerIndexSide
                }).exec()
            ]);
            docsBefore.map(d => candidates.add(d));
            docsAfter.map(d => candidates.add(d));
        })
    );
    const docsWithDistance = Array.from(candidates).map(doc => {
        const distance = euclideanDistance((doc as any).embedding, searchEmbedding);
        return {
            distance,
            doc
        };
    });
    const sorted = docsWithDistance.sort(sortByObjectNumberProperty('distance'));
    return {
        result: sorted.slice(0, 10),
        docReads
    };    
}
```





## Performance benchmarks

On server side databases, there are many ways to improve performance by scaling up the hardware or just using more servers. Local-First apps have the big problem that the hardware is set by the user and you cannot even predict how fast that is. Some users might have **high-end gaming PCs** while others have **outdated smartphones in power saving mode**. So whenever you build a local first app that processes more then a few documents, performance is the key indicator and should tested upfront.

## Improving the performance with different RxDB Plugins

- IndexedDB RxStorage
- OPFS RxStorage
- Sharding
- WebWorker/SharedWorker


## Other potential performance optimizations

There are multiple other techniques to improve the performance of your local vector database:

- Shorten embeddings: The storing and retrieval of embeddings can be improved by "shortening" the embedding. To do that, you just strip away numbers from your vector. For example `[0.56, 0.12, -0.34, 0.78, -0.90]` becomes `[0.56, 0.12]`. Thats it, you now have a smaller embedding that is faster to read out of the storage and calculating distances is faster because it has to process less numbers. The downside is that you loose precission in your search results. Sometimes shortening the embeddings makes more sense as a pre-query step where you first compare the shortened vectors and later fetch the "real" vectors for the 10 most matching documents to improve their sort order.

- Optimize the variables in our Setup: In this examples we picked our variables in a non-optimal way. You can get huge performance improvements by setting different values:
    - We picked 5 indexes for the embeddings. Using less indexes improves your query performance with the cost of less good results.
    - For queries that search by fetching a specific embedding distance we used the `indexDistance` value of `0.003`. Using a lower value means we read less document from the storage. This is faster but reduces the precision of the results which means we will get a less optimal result compared to a full table scan.
    - For queries that search by fetching a given amount of documents per index side, we set the value `docsPerIndexSide` to `100`. Increasing this value means you fetch more data from the storage but also get a better precision in the search results. Decreasing it can improve query performance with worse precision.

- Use faster models: There are many ways to improve performance of machine learning models. If your embedding calculation is too slow, try other models. **Smaller** mostly means **faster**. The model `Xenova/all-MiniLM-L6-v2` which is used in this tutorial is about [1 year old](https://huggingface.co/Xenova/all-MiniLM-L6-v2/tree/main). There exist better, more modern models to use. Huggingface makes these convenient to use. You only have to switch out the model name with any other model from [that site](https://huggingface.co/models?pipeline_tag=feature-extraction&library=transformers.js).

> TODO: compare performance of different models from huggingface

- Narrow down the search space: By utilizing other "normal" filter operators to your query, you can narrow down the search space and optimize performance. For example in an email search you could additionally use a operator that limits the results to all emails that are not older then one year.

- Dimensionality Reduction with an [autoencoder](https://www.youtube.com/watch?v=D16rii8Azuw): An autoencoder encodes vector data with minimal loss which can improve the performance by having to store and compare less numbers in an embedding.


## Scalability of the local vector database

## Migrating Data on Model/Index Changes

When you change the index parameter or even update the whole model which was used to create the embeddings, you have to migrate the data that is already stored on your users devices. RxDB offers the [Schema Migration Plugin](../migration-schema.md) for that.

When the app is reloaded and the updated source code is started, RxDB detects changes in your schema version and runs the migration strategy accordingly. So to update the stored data, increase the schema version and define a handler:

```ts
const schemaV1 = {
    "version": 1, // <- increase schema version by 1
    "primaryKey": "id",
    "properties": {
        /* ... */
    },
    /* ... */
};

await myDatabase.addCollections({
  vectors: {
    schema: schemaV1,
    migrationStrategies: {
      1: function(docData){
        const embedding = await getEmbedding(docData.body);
        new Array(5).fill(0).map((_, idx) => {
            docData['idx' + idx] = euclideanDistance(mySampleVectors[idx], embedding);
        });
        return docData;
      },
    }
  }
});
```





## The possible improvements to local-first vector databases in the future

- WebGPU is [not fully supported](https://caniuse.com/webgpu) yet. When this changes, creating embeddings in the browser have the potential to become faster. You can check if your current chrome supports WebGPU by opening `chrome://gpu/`. Notice that WebGPU has been reported to sometimes be [even slower](https://github.com/xenova/transformers.js/issues/894#issuecomment-2323897485) compared to WASM.
- Cross-Modal AI Models: While progress is being made, AI models that can understand and integrate multiple modalities are still in development. For example you could query for an **image** together with a **text** prompt to get a more detailed output.
- Multi-Step queries: In this article we only talked about having a single query as input and an ordered list of outputs. But there is big potential in chaining models or queries together where you take the results of one query and input them into a different model with different embeddings or outputs.


## Follow Up
<!-- - Check out the [hackernews discussion of this article]() # TODO
- Shared/Like my [announcement tweet]() # TODO -->
- Read the source code that belongs to this article [at github](https://github.com/pubkey/javascript-vector-database)
- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md)
- Check out the [RxDB github repo](https://github.com/pubkey/rxdb) and leave a star ⭐


## Sources

Here are good sources I have found to this topic while researching.

- [Hierarchical Navigable Small Worlds Explained (youtube video)](https://www.youtube.com/watch?v=77QH0Y2PYKg)
- [Vector database indexing methods (youtube video)](https://www.youtube.com/watch?v=035I2WKj5F0)

# Building a Local-First Vector Database with RxDB and transformers.js


- Local First is the new trend for web and mobile apps
- Vector databases create new possiblities in how to store and query data.
- RxDB is a local first javascript database with a flexible storage layer
- transformers.js is a framework to run models inside of applications with WASM or WebGPU

## What is a vector database?

A vector database is a specialized type of database designed to store, retrieve, and manage data represented as vectors, so called "embeddings".

> A vector (embedding) is an array of numbers like `[0.56, 0.12, -0.34, 0.78, -0.90]`.

While you could ask a normal database about "which email is older then date X". You can ask a vector database way more vague stuff like "which emails are similar to this one".

Also a vector database cannot only index text content. With the right model, an embedding can be created from anything else like videos, images or audio.

Notice that vector embeddings from different models are not compatible with each other. When you change your model, you have to recreate all embeddings for your data.

## Benefits of local-first compared to a server vector database

- Zero network latency
- Works offline
- Full privacy. Fully works without sending userdata to a server.
- Easy to set up. No API keys or anything required, it just works.


## Transform NoSQL documents into embeddings inside of the browser

With [transformers.js](https://github.com/xenova/transformers.js) from [huggingface](https://huggingface.co/docs/transformers.js/index) you can run machine learning models on the Web or on any JavaScript apps.

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

```json
  {
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
    handler: async (docs) => {
        await Promise.all(docs.map(async(doc) => {
            const embedding = await getEmbedding(doc.text);
            await vectorCollection.upsert({
                id: doc.primary,
                embedding
            });
        }));
    }
});
```


## Comparing Vectors by calculating the distance

Several methods exist to compare the difference of two given vectors (embeddings):

- euclidean distance
- manhattan distance
- cosine similarity
- jaccard similarity

RxDB exports all of these functions so you can conveniently use them. In the following of this tutorial we use the euclidean distance everywhere. In your app, you have to try out which algorithm works best which mostly depends on your data's vector distribution and query type.

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';

const distance = euclideanDistance(embedding1, embedding2);
console.log(distance); // 25.20443
```

## Searching the Vector database

Now that we have stored our embeddings and we know how we want to compare them with each other, lets do a simple query to test if everything is correct.
In our query we want to find documents that are similar to a given one of our dataset.
Because we do not have any indexes yet, we just query all documents, compare their distance with the query vector and then sort these.

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';

// use a sample vector from your dataset as query
const sampleDoc = await vectorCollection.findOne().exec();
const queryVector = sampleDoc.embedding;
const candidates = await vectorCollection.find({ selector: { id: { $ne: sampleDoc.primary } } }).exec();
const withDistance = candidates.map(doc => ({ doc, distance: euclideanDistance(queryVector, doc.embedding) }))
const queryResult = withDistance.sort(sortByObjectNumberProperty('distance'));
console.dir(queryResult);
```

Notice that depending on your vector comparison function, have to sort smallest first for all `distance` algorithm and biggest first for all `similarity` algorithms.

## Indexing the Vectors for better performance

### Possible indexing methods

- Locality Sensitive Hashing
- Hierarchical Navigable Small Worlds (HNSW)
- hierarchical small world
- Distance to samples

A problem when doing local first stuff always is the **performance**. In browser JavaScript you do not have that many options to store data and mostly you would rely on **IndexedDB**. You have to know that there are things to do with Indexeddb that are fast, [and things that are slow](../slow-indexeddb.md). Doing many serial `get by id` calls is slow. Doing a bulk `get by index range` is fast. To leverage that, you should use an index that stores the embeddings in a sortable way like `Locality Sensitive Hashing` or `Distance to samples`. In the following we will always use `Distance to samples` because it seems to have the best default behavior for our dataset.

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
        "embedding"
    ]
  }
```

To store the index values, we have to adapter the handler of our [RxPipeline](../rx-pipeline.md):

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';
const mySampleVectors: number[][] = [/* the vectors of our sample set*/];
const pipeline = await mySourceCollection.addPipeline({
    handler: async (docs) => {
        await Promise.all(docs.map(async(doc) => {
            const embedding = await getEmbedding(doc.text);
            const docData = { id: doc.primary, embedding };
            // calculate the distance to all samples and store them in the index fields
            const indexValues = new Array(5).fill(0).map((_, idx) => {
                docData['idx' + idx] = euclideanDistance(mySampleVectors[idx], embedding);
            });
            await vectorCollection.upsert(docData);
        }));
    }
});
```

## Performance benchmarks

## Improving the performance with different RxDB Plugins

- IndexedDB RxStorage
- Sharding
- WebWorker/SharedWorker

## Migrating Data on Model/Index Changes

When you change the index parameter or even update the whole model which was used to create the embeddings, you have to migrate the data that is already stored on your users devices. RxDB offers the [Schema Migration Plugin](../migration-schema.md) for that.

When the app is reloaded and the updated source code is started, RxDB detects changes in your schema version and runs the migration strategy accordingly. So to update the stored data, increase the schema version and define a handler:

```ts
const schemaV1 = {
    "version": 1, // <- increase schema version by 1
    "primaryKey": "id",
    "type": "object",
    "properties": {
        /* ... */
    },
    /* ... */
};

myDatabase.addCollections({
  messages: {
    schema: messageSchemaV1,
    migrationStrategies: {
      1: function(oldDoc){
        const embedding = await getEmbedding(doc.text);
        const newIndexes = 
        oldDoc.time = new Date(oldDoc.time).getTime(); // string to unix
        return oldDoc;
      },
    }
  }
});
```





## The possible impact of local-first vector databases

- WebGPU is [not fully supported](https://caniuse.com/webgpu) yet. When this changes, creating embeddings in the browser will be way faster. You can check if your current chrome supports WebGPU by opening `chrome://gpu/`



## Follow Up
- Check out the [hackernews discussion of this article]() # TODO
- Shared/Like my [announcement tweet]() # TODO
- Learn how to use RxDB with the [RxDB Quickstart](../quickstart.md)
- Check out the [RxDB github repo](https://github.com/pubkey/rxdb) and leave a star ⭐

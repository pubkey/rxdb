---
title: Vector Search - Local Similarity Search with RxDB
slug: vector.html
description: Store embeddings in RxDB and run vector search on the client. Index your vectors, query by meaning, and keep the whole search offline.
image: /headers/vector.jpg
---

import {Steps} from '@site/src/components/steps';

# Vector Search

With the `vector` plugin you can store **embeddings** inside an [RxCollection](./rx-collection.md) and search them by similarity, directly on the client's device. A normal [RxQuery](./rx-query.md) finds documents by exact values like strings and numbers. A vector search finds documents by meaning, which is what you need for semantic search, recommendations, and retrieval for a local LLM.

The plugin has two parts:

- **Vector comparison functions** like `euclideanDistance()` and `cosineSimilarity()` that calculate how close two vectors are to each other.
- **A vector index** that stores the distance from each document to a set of sample vectors in normal [RxDB indexes](./rx-schema.md#indexes). This way a search does not have to read the whole collection.

RxDB does not create the embeddings for you. Use a model like [transformers.js](https://github.com/huggingface/transformers.js) or a server endpoint to transform your data into vectors, then store these vectors in RxDB. The article about building a [local JavaScript vector database](./articles/javascript-vector-database.md) walks through the full setup including the embedding step.

## Why Vector Search on the Client

- **It works offline.** The embeddings and the index live in the [RxStorage](./rx-storage.md) of the user, so a search does not need a network connection. This is what makes it usable in [offline-first](./offline-first.md) apps.
- **No data leaves the device.** Search queries about private notes, emails, or messages are never sent to a server.
- **No round trip latency.** A local search over `10k` embeddings resolves in a few milliseconds instead of the 100ms or more that a request to a hosted vector database costs.
- **It runs on every RxStorage.** The index fields are plain number indexes, so [IndexedDB](./rx-storage-indexeddb.md), [SQLite](./rx-storage-sqlite.md), [localStorage](./rx-storage-localstorage.md), and the [memory storage](./rx-storage-memory.md) all work without a change.
- **The index values replicate.** They are calculated deterministically from the document, so every client and the server compute the exact same values and the [replication](./replication.md) does not have to be aware of the index at all.

## How the Vector Index Works

Storing a vector with `384` dimensions in an index is not possible because indexes work on single values. Instead the plugin uses the **distance to samples** method:

1. On creation, the index derives a fixed set of sample vectors (five by default).
2. On every write, the distance between the document's vector and each sample vector is calculated and stored in an indexed field.
3. On a search, the same distances are calculated for the query vector. Documents whose index values lie close to those of the query vector are read from the storage.
4. The real distance is then calculated for these candidates only, and the closest ones are returned.

This is an approximate search. Reading a limited amount of candidates is what makes it fast, and it can happen that a document that would be in the exact top ten is missed. More index fields and more candidates per index mean more precise results and slower queries. You can measure the precision of your settings against `searchFullScan()`, which always returns the exact result.

## Using the Vector Plugin

<Steps>

### Add the plugin

```ts
import { addRxPlugin } from 'rxdb/plugins/core';
import { RxDBVectorPlugin } from 'rxdb/plugins/vector';
addRxPlugin(RxDBVectorPlugin);
```

### Define the index options

The same options object is used to extend the schema and to add the index to the collection. Keep it in one place so that both cannot drift apart.

```ts
import type { VectorIndexOptions } from 'rxdb/plugins/vector';

const vectorIndexOptions: VectorIndexOptions = {
    // object path of the field that stores the vector
    vectorPath: 'embedding',
    // amount of numbers each vector contains
    dimensions: 384,
    // amount of index fields (optional) [default=5]
    indexAmount: 5,
    // (optional) [default='euclidean']
    distance: 'euclidean'
};
```

### Extend the schema

`extendSchemaWithVectorIndex()` adds one indexed number field per sample vector. It returns a new schema and does not modify the given one.

```ts
import { extendSchemaWithVectorIndex } from 'rxdb/plugins/vector';

const baseSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        text: {
            type: 'string'
        },
        embedding: {
            type: 'array',
            items: {
                type: 'number'
            }
        }
    },
    required: ['id', 'text', 'embedding']
};

const schema = extendSchemaWithVectorIndex(baseSchema, vectorIndexOptions);
// > adds the fields vectorIdx0 to vectorIdx4 and indexes them
```

### Create the collection and add the index

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageLocalstorage()
});
const { items } = await database.addCollections({
    items: { schema }
});

const vectorIndex = items.addVectorIndex(vectorIndexOptions);
```

`addVectorIndex()` attaches [middleware hooks](./middleware.md) to the collection that keep the index fields up to date on every insert and every update. Add the index directly after creating the collection, before you run the first write.

### Insert documents

Write the documents as usual. The index fields are filled in by the plugin, you never set them yourself.

```ts
await items.insert({
    id: 'doc-1',
    text: 'The quick brown fox',
    embedding: await getEmbeddingFromText('The quick brown fox')
});
```

### Search

```ts
const queryVector = await getEmbeddingFromText('a fast animal');
const results = await vectorIndex.search(queryVector, { limit: 10 });

results.forEach(result => {
    console.log(result.doc.text, result.distance);
});
// > The quick brown fox 0.312
```

Each result contains the [RxDocument](./rx-document.md) and the value that the distance function returned for it. The array is sorted so that the closest match comes first.

</Steps>

## Search Methods

There are three ways to run a search. All of them return the same result shape and are sorted with the closest match first.

### search()

The default method. For each index field it reads `docsPerIndexSide` documents before and after the index value of the query vector. The amount of read documents is known upfront and is `docsPerIndexSide * 2 * indexAmount`, so with the defaults a single search reads at most `1000` documents no matter how big the collection is.

```ts
const results = await vectorIndex.search(queryVector, {
    // amount of documents to return (optional) [default=10]
    limit: 10,
    // documents read per index and direction (optional) [default=100]
    docsPerIndexSide: 100
});
```

### searchByRange()

Reads all documents whose index value lies within a fixed range around the index value of the query vector. How many documents this reads depends on how dense your dataset is, so the runtime is less predictable. It gives better results when the embeddings are unevenly distributed.

```ts
const results = await vectorIndex.searchByRange(queryVector, {
    range: 0.05,
    limit: 10
});
```

### searchFullScan()

Reads every document of the collection and calculates the real distance for each of them. This returns the exact result and does not use the indexes at all. Use it on small collections and to measure how precise your index settings are.

```ts
const exact = await vectorIndex.searchFullScan(queryVector, { limit: 10 });
```

## Distance Functions

The plugin ships four comparison functions. Each takes two vectors and returns a single number.

| Name | Function | Closest match | Value range |
| ---- | -------- | ------------- | ----------- |
| `euclidean` | `euclideanDistance()` | lowest value | `0` to `1000` |
| `manhattan` | `manhattanDistance()` | lowest value | `0` to `1000` |
| `cosine` | `cosineSimilarity()` | highest value | `-1` to `1` |
| `jaccard` | `jaccardSimilarity()` | lowest value | `0` to `1` |

You can use them standalone without a collection:

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';
const distance = euclideanDistance(embeddingA, embeddingB);
console.log(distance); // > 25.20443
```

Which one gives the best results depends on your data and on the model that created the embeddings. It is recommended to try all of them and compare the outcome against `searchFullScan()`.

The value ranges assume normalized embeddings, which is what the common embedding models return. When your vectors are not normalized, either normalize them with `normalizeVector()` before storing them, or pass an own distance definition with a bigger maximum:

```ts
import { euclideanDistance } from 'rxdb/plugins/vector';

const vectorIndexOptions = {
    vectorPath: 'embedding',
    dimensions: 384,
    distance: {
        fn: euclideanDistance,
        higherIsCloser: false,
        minimum: 0,
        maximum: 100000,
        // index values are stored as integers,
        // the distance is multiplied with this factor
        precision: 100
    }
};
```

## Options

| Option | Default | Description |
| ------ | ------- | ----------- |
| `vectorPath` | - | Object path of the field that stores the vector, for example `embedding` or `data.embedding`. |
| `dimensions` | - | Amount of numbers each vector contains. |
| `indexAmount` | `5` | Amount of index fields. More indexes mean more precise results, more storage usage, and slower writes. |
| `distance` | `'euclidean'` | Name of a built-in distance function or an own definition. |
| `sampleVectors` | derived from `seed` | The vectors that all documents are compared against. |
| `fieldPrefix` | `'vectorIdx'` | Prefix of the generated index fields. |
| `seed` | `1` | Seed for the default sample vectors. |

## Sample Vectors and Replication

By default the sample vectors are derived from the `seed` with a deterministic pseudo random generator. Every client calculates exactly the same sample vectors and therefore the same index values for the same document. This is what makes the index work together with [replication](./replication.md): the index fields are normal document fields, they are replicated like any other field, and a document written on one device sorts identically on all other devices.

For the same reason the options must not change once documents are stored. Changing `dimensions`, `indexAmount`, `distance`, `seed`, or `sampleVectors` invalidates all index values that were written before. When you have to change them, run a [schema migration](./migration-schema.md) or call `reindex()`.

You can also provide your own sample vectors, for example a set of embeddings taken from your real dataset:

```ts
const vectorIndexOptions = {
    vectorPath: 'embedding',
    dimensions: 384,
    sampleVectors: [
        /* ... your own vectors ... */
    ]
};
```

Sample vectors taken from the actual data distribution spread the documents better over the index than random ones, which gives more precise results. The tradeoff is that you have to store them somewhere and ship the exact same list to every client.

## reindex()

`reindex()` writes the index values of all documents that do not have the correct ones yet and returns the amount of changed documents. Run it once when index values can be stale, for example after you changed the options or when documents were written while the index was not attached to the collection.

```ts
const changedDocs = await vectorIndex.reindex();
console.log(changedDocs); // > 42
```

Keep in mind that this reads and rewrites the whole collection.

## Limitations

- The search is approximate. Use `searchFullScan()` when you need the exact result.
- The index fields are added to the `required` list of the schema because some storages like the [Dexie.js RxStorage](./rx-storage-dexie.md) cannot index optional fields. Documents without a vector get a placeholder index value and are skipped in the search results.
- All vectors of a collection must have the same amount of dimensions. Writing a vector with a different length throws the error `VEC4`.
- The index values are stored as integers with a fixed precision. Two documents whose distance to a sample vector differs by less than `1 / precision` end up in the same index bucket.
- Each index field costs storage. With `indexAmount: 5` you store five additional numbers plus five indexes per document.

## FAQ

<details>
    <summary>Do I need a separate vector database for semantic search in my app?</summary>

No. When your dataset fits on the client, RxDB stores the embeddings next to the rest of your data and searches them locally. You keep one database, one query API, and one [replication](./replication.md) setup instead of running a hosted vector database in addition to your normal storage. A dedicated vector database still makes sense when you have millions of embeddings that cannot be shipped to the client.

</details>

<details>
    <summary>How many embeddings can RxDB handle in the browser?</summary>

Tens of thousands work fine. The limit is the storage size and the time it takes to create the embeddings, not the search itself. A `384` dimension embedding stored as JSON needs roughly `6kb`, so `10k` documents use about `60mb`. Check the [storage performance comparison](./rx-storage-performance.md) to pick an [RxStorage](./rx-storage.md) that handles that amount well.

</details>

<details>
    <summary>What is the difference between vector search and fulltext search?</summary>

A [fulltext search](./fulltext-search.md) matches words. A vector search matches meaning. Searching for "car" with fulltext returns documents that contain the word "car", a vector search also returns the ones that talk about a "vehicle" or an "automobile". Many apps run both and merge the results.

</details>

<details>
    <summary>Which distance function should I use for text embeddings?</summary>

Start with `euclidean`. Most text embedding models return normalized vectors, and for normalized vectors the euclidean distance and the cosine similarity produce the same ranking. Compare both against `searchFullScan()` on your own data before you decide.

</details>

<details>
    <summary>How do I create the embeddings in JavaScript?</summary>

Run a model locally with [transformers.js](https://github.com/huggingface/transformers.js), or call an embedding endpoint and store the returned vector. Creating embeddings is slow compared to the search, so do it once per document in an [RxPipeline](./rx-pipeline.md) instead of on every query. The [vector database article](./articles/javascript-vector-database.md) shows both the model setup and the pipeline.

</details>

## Follow Up

- Read the [local JavaScript vector database](./articles/javascript-vector-database.md) article for a full app including the embedding model.
- Learn how to run the embedding calculation on writes with [RxPipeline](./rx-pipeline.md).
- Combine it with [fulltext search](./fulltext-search.md) to match words and meaning at the same time.
- Start with the [RxDB Quickstart](./quickstart.md) when you are new to RxDB.
- Check out the [RxDB source code](/code/) and leave a star ⭐

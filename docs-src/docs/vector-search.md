---
title: Vector Search with TurboQuant Quantization
slug: vector-search.html
description: Run semantic vector search directly in your app. The TurboQuant plugin stores embeddings 8 times smaller than float32 and keeps the index in sync with your RxDB collection.
image: /headers/vector-search.jpg
---

import {Steps} from '@site/src/components/steps';

# Vector Search

With the `vector-turboquant` plugin you can run **vector search** on the documents of an [RxCollection](./rx-collection.md). It builds an in-memory index of your embeddings and returns the nearest neighbors of a query vector. The index is filled from the documents of the collection and it follows the change stream, so an insert, an update or a delete is reflected in the next search.

The plugin implements [TurboQuant](https://arxiv.org/abs/2504.19874), a data-oblivious quantizer from Google Research. Instead of keeping the raw `float32` numbers of an embedding in memory, it stores 4 bits per dimension. A `768` dimension embedding takes `3072` bytes as `float32` and `384` bytes in the index.

- **Small**: 8 times less memory at 4 bit, 16 times at 2 bit and 32 times at 1 bit.
- **No training**: The codebook is derived from mathematics, not from your data. There is no training step and no rebuild when the collection grows.
- **Online writes**: Adding a vector costs one rotation, removing one is a constant time swap.
- **Filtered search**: An allowlist of document ids restricts a search to the result of a normal [RxQuery](./rx-query.md).
- **Runs anywhere**: Plain TypeScript with typed arrays, so it works in the browser, in Node.js, in React Native and in a [WebWorker](./rx-storage-worker.md).

## How TurboQuant Works

A scalar quantizer needs to know how the values of a coordinate are distributed. Embeddings from different models have different distributions, which is why most quantizers have to be trained on the data first. TurboQuant removes that step in four stages.

1. **Normalize**: The length of the vector is stripped off and stored separately, so only the direction is quantized.
2. **Rotate**: Every vector is multiplied with the same random orthogonal matrix. After the rotation each coordinate follows a normal distribution, no matter what the input data looked like. A full matrix would need `d * d` operations per vector, so the plugin uses a randomized block Walsh-Hadamard transform that runs in `d * log(64)` time and preserves dot products exactly.
3. **Quantize**: Each coordinate is mapped to the closest value of a [Lloyd-Max](https://en.wikipedia.org/wiki/Lloyd%27s_algorithm) codebook for the normal distribution. Because the rotation already normalized the distribution, the same codebook fits every dataset. The codes are then packed into bytes.
4. **Renormalize**: Quantization always shortens a vector, which makes every later score too small. During encoding the plugin computes one dot product between the vector and its own quantized version and stores the correction factor. The search multiplies it back in, so the estimated scores are not biased.

A search rotates the query into the same space and scores it against the packed codes with a lookup table. The vectors are never decompressed.

## Recall

Quantization trades accuracy for memory. The first table shows how much memory a `768` dimension embedding needs and how far the estimated scores are away from an exact float32 comparison.

| Bit width | Bytes per vector | Compression | Relative score error |
| --------- | ---------------- | ----------- | -------------------- |
| float32   | 3072             | 1x          | 0                    |
| 4         | 384              | 8x          | ~10%                 |
| 2         | 192              | 16x         | ~36%                 |
| 1         | 96               | 32x         | ~78%                 |

The errors match the distortion of the Lloyd-Max quantizer for the normal distribution, so they do not depend on your dataset.

What matters in practice is how often the true nearest neighbor shows up in the results. These values were measured on `10k` random vectors with `384` dimensions and `200` queries, with cosine similarity. `recall@k` is the share of queries where the exact nearest neighbor was inside the first `k` results of the quantized search.

| Bit width | recall@1 | recall@4 | recall@10 | recall@100 |
| --------- | -------- | -------- | --------- | ---------- |
| 4         | 82.5%    | 100%     | 100%      | 100%       |
| 2         | 42.0%    | 73.0%    | 88.0%     | 100%       |
| 1         | 13.0%    | 30.5%    | 46.5%     | 87.5%      |

Random vectors are the hardest case because in high dimensions all of them have nearly the same distance to each other. Real embeddings are clustered, so the values you measure on your own data are usually better.

Read the tables from right to left: at 4 bit you fetch a few more candidates than you need and the exact hit is always among them. Use 2 bit when memory matters more than the ranking of the top hit, and use 1 bit only as a prefilter that fetches `100` candidates which you then rescore with the exact vectors.

## Performance

A search is a scan over all quantized vectors, so the runtime grows linearly with the amount of documents. These numbers were measured on Node.js 22 with `100k` vectors, on a single core and without any parallelism.

| Dimensions | Bit width | Memory     | One search over 100k vectors | Storing one vector |
| ---------- | --------- | ---------- | ---------------------------- | ------------------ |
| 384        | 4         | 18 MB      | 52 ms                        | 32 µs              |
| 384        | 2         | 9 MB       | 27 ms                        | 28 µs              |
| 768        | 4         | 37 MB      | 101 ms                       | 65 µs              |
| 768        | 2         | 18 MB      | 51 ms                        | 55 µs              |

Most of the time of a write goes into the rotation, which costs `d * log(64)` operations. That is small compared to the model that creates the embedding, which needs a few hundred milliseconds per document. Two things bring the search time down: fewer bits per dimension, and an allowlist that reduces the amount of scanned vectors.

## Using the Vector Search Plugin

<Steps>

### Install the plugin

```ts
import { addRxPlugin } from 'rxdb/plugins/core';
import { RxDBVectorTurboQuantPlugin } from 'rxdb/plugins/vector-turboquant';
addRxPlugin(RxDBVectorTurboQuantPlugin);
```

### Store the embeddings in a collection

The vectors live in your documents, the index only keeps their quantized form. Define a [schema](./rx-schema.md) with an array field for the embedding.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const database = await createRxDatabase({
    name: 'mydatabase',
    storage: getRxStorageLocalstorage()
});
await database.addCollections({
    items: {
        schema: {
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
        }
    }
});
```

To create the embeddings on the client, run a model with [transformers.js](https://github.com/huggingface/transformers.js) and write the results with an [RxPipeline](./rx-pipeline.md). The [local vector database tutorial](./articles/javascript-vector-database.md) shows that setup step by step.

### Add the vector index

`addVectorIndex()` reads all documents of the collection once and then follows the change stream. It resolves when the index is filled.

```ts
const vectorIndex = await database.items.addVectorIndex({
    identifier: 'semantic-search',
    dimensions: 384,
    bitWidth: 4,
    distance: 'cosine',
    embedding: docData => docData.embedding
});
console.log(vectorIndex.size); // > 10000
```

### Search

`search()` is synchronous because the whole index is in memory. It returns the ids and the score of the used distance method.

```ts
const queryVector = await getEmbeddingFromText('new york people');
const results = vectorIndex.search(queryVector, 10);
console.log(results);
/* > [
    { id: 'doc-8842', score: 0.83 },
    { id: 'doc-1290', score: 0.79 },
    ...
] */
```

Use `searchDocuments()` when you need the [RxDocuments](./rx-document.md) instead of the ids.

```ts
const results = await vectorIndex.searchDocuments(queryVector, 10);
console.log(results[0].document.text);
```

</Steps>

## Combining Vector Search with Normal Queries

A vector search alone cannot express conditions like "only documents of this user" or "only from the last week". Run a normal [Mango query](./rx-query.md) first and pass its ids as the allowlist of the search. The scoring loop then only touches the allowed vectors.

```ts
const recent = await database.items.find({
    selector: {
        createdAt: { $gt: Date.now() - 1000 * 60 * 60 * 24 * 7 }
    }
}).exec();

const results = vectorIndex.search(queryVector, 10, {
    allowlist: recent.map(doc => doc.primary)
});
```

## Distance Methods

The index estimates the dot product between the query and a stored vector and derives the other methods from it. Set the default with the `distance` option and overwrite it per search.

- `cosine` (default): The angle between the vectors, ignores their length. A higher value is a better match. Use this for text embeddings.
- `dotProduct`: Includes the length of both vectors. A higher value is a better match.
- `euclidean`: The straight line distance. A lower value is a better match, so the results are sorted ascending.

```ts
const closest = vectorIndex.search(queryVector, 10, { distance: 'euclidean' });
```

The `vector` plugin has exact `euclideanDistance()`, `manhattanDistance()`, `cosineSimilarity()` and `jaccardSimilarity()` functions. Use them to rescore the results of a search when you need the exact order of the top hits.

```ts
import { cosineSimilarity } from 'rxdb/plugins/vector';

const candidates = await vectorIndex.searchDocuments(queryVector, 100);
const rescored = candidates
    .map(result => ({
        result,
        similarity: cosineSimilarity(queryVector, result.document.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10);
```

This is the usual way to get both speed and precision: the quantized index narrows `10k` documents down to `100` candidates, and the exact comparison orders those `100`.

## Calibration

The random rotation makes the coordinates normal distributed for most data. When your embeddings still do not fit the codebook, the optional calibration step of TurboQuant fits one factor per coordinate. Set `calibrationSampleSize` to the number of documents that are used as the sample.

```ts
const vectorIndex = await database.items.addVectorIndex({
    identifier: 'semantic-search',
    dimensions: 384,
    calibrationSampleSize: 2000,
    embedding: docData => docData.embedding
});
```

The sample is read before the index is filled, so those documents are read twice. Fitting the factors costs about `0.6` seconds for `2000` vectors of `384` dimensions and about `1` second at `768` dimensions, so keep the sample small. It runs once, when the index is created.

## Using the Index Without a Collection

`TurboQuantIndex` works standalone, for example inside a [WebWorker](./rx-storage-worker.md) or in a Node.js script.

```ts
import {
    TurboQuantIndex,
    serializeTurboQuantIndex,
    deserializeTurboQuantIndex
} from 'rxdb/plugins/vector-turboquant';

const index = new TurboQuantIndex({
    dimensions: 384,
    bitWidth: 4,
    distance: 'cosine'
});
index.add('doc-1', embedding);
index.remove('doc-1');

// write the whole index into a single binary blob
const binary = serializeTurboQuantIndex(index);
const restored = deserializeTurboQuantIndex(binary);
```

Store the blob with the [attachments plugin](./rx-attachment.md) or as a base64 string in a [local document](./rx-local-document.md) to skip the rebuild on the next start.

## Options

```ts
const vectorIndex = await database.items.addVectorIndex({
    /**
     * Must be unique per collection.
     */
    identifier: 'semantic-search',
    /**
     * Length of the vectors. All vectors of one index
     * must come from the same embedding model.
     */
    dimensions: 384,
    /**
     * Bits per dimension, one of 1, 2 or 4.
     * (optional) [default=4]
     */
    bitWidth: 4,
    /**
     * (optional) [default='cosine']
     */
    distance: 'cosine',
    /**
     * Seed of the random rotation. Two indexes can only be
     * compared when they use the same seed.
     * (optional) [default=1337]
     */
    seed: 1337,
    /**
     * How many documents are read at once while the index is filled.
     * (optional) [default=100]
     */
    batchSize: 100,
    /**
     * Amount of vectors used to calibrate the quantizer.
     * Zero means no calibration.
     * (optional) [default=0]
     */
    calibrationSampleSize: 0,
    /**
     * Returns the vector of a document.
     * Return null to keep the document out of the index.
     */
    embedding: docData => docData.embedding
});
```

## RxVectorIndex Methods

### search()

Returns the k best matches for a vector. Runs synchronously because the whole index is in memory. Takes an optional `allowlist` and `distance` option.

### searchDocuments()

Same as `search()` but resolves with the matching [RxDocuments](./rx-document.md) in the `document` field of every result.

### awaitInSync()

Resolves when all writes that happened before the call have been processed by the index. Use it in tests, in production the index is updated a few microseconds after the write event.

### error$

Emits the errors that your `embedding` function threw while a change event was processed. Errors that happen while the index is filled reject the promise of `addVectorIndex()` instead.

### close()

Stops following the collection and frees the memory of the index. It runs automatically when the collection is closed.

## Limitations

- The search is a full scan over the quantized vectors. It has no graph structure like HNSW, so the runtime grows linearly with the amount of documents. Scanning `100k` vectors of `768` dimensions at 4 bit takes about `100` milliseconds. Use the allowlist to cut down the candidates when you store more than that, or move the index into a [WebWorker](./rx-storage-worker.md) so the scan does not block the UI.
- The index lives in memory. It is rebuilt from the collection when your app starts, unless you persist it with `serializeTurboQuantIndex()`.
- Vectors of different embedding models cannot share an index. When you switch the model, you have to recreate all embeddings and the index.
- The scores are estimates. When the exact order of the top hits matters, rescore the candidates with the exact functions of the `vector` plugin.

## FAQ

<details>
<summary>How much memory does a vector index need?</summary>

At the default of 4 bits per dimension a vector needs `dimensions / 2` bytes plus 8 bytes of metadata. `100k` documents with `768` dimension embeddings need about `39` megabytes, compared to `307` megabytes as `float32`. At 2 bit the same corpus fits into `20` megabytes. The **[RxCollection](./rx-collection.md)** still holds the raw vectors in the storage, the index only keeps the compressed copy in memory.

</details>

<details>
<summary>Do I have to train the index on my data?</summary>

No. TurboQuant is data-oblivious. The random rotation turns the coordinates of any dataset into the same normal distribution, and the Lloyd-Max codebook for that distribution is precomputed. There is no training step, no fitting and no rebuild when documents are added. The optional calibration is a refinement, not a requirement.

</details>

<details>
<summary>Can I run a vector search in the browser?</summary>

Yes. The plugin is plain TypeScript on top of typed arrays and has no native dependencies, so it runs in every browser that runs **[RxDB](./rx-database.md)**. Together with a model from [transformers.js](https://github.com/huggingface/transformers.js) you get [semantic search](./articles/javascript-vector-database.md) without a server. Run the search inside a [WebWorker](./rx-storage-worker.md) when your index is large enough that the scan blocks the UI.

</details>

<details>
<summary>Does the vector search use WebAssembly and SIMD?</summary>

No. The scoring loop is plain TypeScript over typed arrays. A WASM kernel with SIMD runs the inner loop faster, but every search has to copy the query vector into the WASM memory and the results back out, and that boundary cost is paid on each call. **[RxDB](./rx-database.md)** optimizes for latency, so at the corpus sizes that fit on a user device the copying can cost more than SIMD wins back inside the kernel. Plain TypeScript also keeps the plugin free of dependencies and runs on every runtime RxDB supports, including [React Native](./react-native-database.md) and Deno, where WASM support is uneven.

</details>

<details>
<summary>What is the difference to the vector utils of RxDB?</summary>

The `vector` plugin has exact distance functions that compare two raw vectors. You need them for a full scan over all documents and for rescoring. The `vector-turboquant` plugin adds the index: it holds all vectors in a compressed form and answers a nearest neighbor search without reading the raw embeddings from the [RxStorage](./rx-storage.md).

</details>

<details>
<summary>How accurate is the search compared to an exact scan?</summary>

At 4 bit the estimated scores have a relative error of about **10%**, which matches the distortion of the Lloyd-Max quantizer at that bit width. On `10k` random test vectors the exact nearest neighbor was the top hit for **82.5%** of the queries and it was inside the first four results for **100%** of them. When you need the exact ranking, fetch more candidates than you need and rescore them with `cosineSimilarity()`.

</details>

## Follow Up

- Build a full semantic search app in the [local vector database tutorial](./articles/javascript-vector-database.md).
- Learn how to generate the embeddings on every write with the [RxPipeline plugin](./rx-pipeline.md).
- Read the [TurboQuant paper](https://arxiv.org/abs/2504.19874) for the theory behind the quantizer.
- Start with the [RxDB Quickstart](./quickstart.md) when you are new to RxDB.
- Check out the [RxDB github repo](/code/) and leave a star ⭐

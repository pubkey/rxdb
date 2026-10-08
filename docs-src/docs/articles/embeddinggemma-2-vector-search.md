---
title: EmbeddingGemma 2 Vector Search in the Browser with RxDB
slug: embeddinggemma-2-vector-search.html
description: Learn how to run Google's EmbeddingGemma 2 with transformers.js and store the embeddings in RxDB for an offline vector search in the browser.
image: /headers/embeddinggemma-2-vector-search.jpg
---

# EmbeddingGemma 2 Vector Search in the Browser with RxDB

On October 6, 2026, Google DeepMind released [**EmbeddingGemma 2**](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/), an open embedding model under the Apache 2.0 license that turns text, code, images, video, and audio into vectors in one shared 768-dimensional space. The text part of the model has 270M parameters and runs on-device, which makes it a good fit for a [local vector database](./javascript-vector-database.md) built with [RxDB](https://rxdb.info/). This page explains what changed in EmbeddingGemma 2, how to generate the embeddings with transformers.js in the browser, and how to store and query them in an [RxCollection](../rx-collection.md) so that your [semantic search works offline](../offline-first.md).

<RxdbLogo alt="EmbeddingGemma 2 vector search with RxDB" />

## What is New in EmbeddingGemma 2

EmbeddingGemma 2 is built on Gemma 4 and is the successor of [EmbeddingGemma](https://developers.googleblog.com/en/introducing-embeddinggemma/), which has more than 20 million downloads according to Google. The numbers below come from the [Google announcement](https://blog.google/innovation-and-ai/technology/developers-tools/embeddinggemma-2/), the [model card](https://huggingface.co/google/embeddinggemma-2), and the [developer guide](https://developers.googleblog.com/en/embeddinggemma-2-the-developer-guide/) (checked October 6, 2026):

- **Modular size**: 740M parameters in total, split into a 270M text and code backbone, a 170M vision encoder, and a 300M audio encoder. You only load the parts you need.
- **Low memory**: about **191 MB** of active RAM for the text-only weights and about **567 MB** for the full multimodal model (measured by Google on a Pixel 11 Pro with quantization).
- **Better code retrieval**: the MTEB Code score went from `68.76` to `78.68`.
- **Matryoshka embeddings**: you can cut the 768 dimensions down to 512, 256, or 128 and still get usable results. This saves up to **6x** of the vector storage.
- **8K context**: up to 8,192 tokens per input, shared across all modalities.
- **Browser support**: Google lists [transformers.js](https://huggingface.co/docs/transformers.js/index) and WebGPU as supported runtimes, and there is an [ONNX export](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX) on Hugging Face.

The Matryoshka feature matters most for local-first apps. On the client, every vector has to be read from disk on each search, so a smaller vector is a faster query. The model card shows how much quality you lose:

| Dimensions | MTEB Multilingual | MTEB English | MTEB Code |
| ---------- | ----------------- | ------------ | --------- |
| 768        | 61.36             | 68.46        | 78.68     |
| 512        | 61.17             | 68.41        | 77.24     |
| 256        | 60.41             | 67.78        | 76.18     |
| 128        | 57.89             | 65.68        | 71.41     |

Going from 768 to 256 dimensions costs less than one point on the English benchmark and stores a third of the numbers. This is why the code on this page uses 256 dimensions.

## Generating EmbeddingGemma 2 Embeddings with transformers.js

At first, install transformers.js and RxDB:

```bash
npm install @huggingface/transformers rxdb rxjs
```

The `onnx-community/embeddinggemma-2-ONNX` model runs with the `feature-extraction` pipeline. With `dtype: 'q4'` the text model download is about **175 MB**, a sixth of the `fp32` weights. According to the [ONNX model card](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX), `q4` text embeddings still have a cosine similarity of at least `0.988` to the `fp32` ones. Use `q8` (314 MB) when quality matters more than download size. In the [benchmark below](#embeddinggemma-2-vs-other-embedding-models-benchmark), `q4` lost less than one point of nDCG@10 compared to `q8` and was 4x faster on the CPU.

EmbeddingGemma 2 expects a task prefix in front of every input. For search, the query is prefixed with `task: search result | query: ` and the stored documents with `title: ... | text: `. When you skip the prefixes, the search quality drops.

```ts
// embedding.ts
import { pipeline } from '@huggingface/transformers';

export const DIMENSIONS = 256;

// Use WebGPU when the browser has it, otherwise fall back to WebAssembly.
const extractorPromise = pipeline(
    'feature-extraction',
    'onnx-community/embeddinggemma-2-ONNX',
    {
        device: (navigator as any).gpu ? 'webgpu' : 'wasm',
        dtype: 'q4'
    }
);

/**
 * Matryoshka truncation: keep the first dimensions
 * and L2-normalize again, because a sliced unit vector
 * no longer has a length of 1.
 */
function truncate(vector: number[], dimensions: number): number[] {
    const sliced = vector.slice(0, dimensions);
    const norm = Math.sqrt(sliced.reduce((sum, v) => sum + v * v, 0));
    return sliced.map(v => v / norm);
}

async function embed(input: string): Promise<number[]> {
    const extractor = await extractorPromise;
    const output = await extractor(input, { pooling: 'mean', normalize: true });
    return truncate(Array.from(output.data as Float32Array), DIMENSIONS);
}

export function embedDocument(title: string | undefined, text: string) {
    return embed('title: ' + (title ?? 'none') + ' | text: ' + text);
}

export function embedQuery(query: string) {
    return embed('task: search result | query: ' + query);
}
```

Keep in mind that embeddings from different models are not compatible with each other. When you switch from an older model like `all-MiniLM-L6-v2` to EmbeddingGemma 2, or change the number of dimensions, you have to recreate all stored embeddings.

## Storing the Embeddings in RxDB

Now create an [RxDatabase](../rx-database.md) with two collections: `items` stores the documents and `vectors` stores one embedding per document. The sample uses the [Dexie.js RxStorage](../rx-storage-dexie.md) which stores data in IndexedDB. The [localStorage RxStorage](../rx-storage-localstorage.md) is not a good fit here because 10k vectors with 256 numbers each do not fit into the localStorage quota. For production apps, the 👑 [IndexedDB RxStorage](../rx-storage-indexeddb.md) or the [OPFS RxStorage](../rx-storage-opfs.md) are faster.

The `vectors` schema also gets five index fields `idx0` to `idx4`. They implement the "distance to samples" index from the [JavaScript vector database article](./javascript-vector-database.md): each field stores the distance of the embedding to one fixed sample vector, so that a query only has to read the embeddings that are close to the search vector.

```ts
// database.ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const indexSchema = { type: 'string', maxLength: 10 } as const;

export const db = await createRxDatabase({
    name: 'search',
    storage: getRxStorageDexie()
});

await db.addCollections({
    items: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                title: { type: 'string' },
                text: { type: 'string' }
            },
            required: ['id', 'text']
        }
    },
    vectors: {
        schema: {
            version: 0,
            primaryKey: 'id',
            type: 'object',
            properties: {
                id: { type: 'string', maxLength: 100 },
                embedding: {
                    type: 'array',
                    items: { type: 'number' }
                },
                idx0: indexSchema,
                idx1: indexSchema,
                idx2: indexSchema,
                idx3: indexSchema,
                idx4: indexSchema
            },
            required: ['id', 'embedding', 'idx0', 'idx1', 'idx2', 'idx3', 'idx4'],
            indexes: ['idx0', 'idx1', 'idx2', 'idx3', 'idx4']
        }
    }
});
```

To keep the embeddings up to date, add an [RxPipeline](../rx-pipeline.md). The pipeline runs the handler for every written document, continues where it stopped after a page reload, and only runs in one browser tab at the same time thanks to [leader election](../leader-election.md). This means the model does not compute the same embedding twice when the user has multiple tabs open.

```ts
// pipeline.ts
import { euclideanDistance } from 'rxdb/plugins/vector';
import { db } from './database';
import { embedDocument } from './embedding';

/**
 * Five embeddings of random documents from your dataset,
 * created once with embedDocument() and shipped with the app.
 */
export const sampleVectors: number[][] = [/* ... */];

// Fixed-length strings keep the index values sortable.
export function indexNrToString(nr: number): string {
    return nr.toFixed(8).padStart(10, '0');
}

export const pipeline = await db.items.addPipeline({
    identifier: 'embeddinggemma-2-256',
    destination: db.vectors,
    batchSize: 10,
    handler: async (docs) => {
        for (const doc of docs) {
            const embedding = await embedDocument(doc.title, doc.text);
            const docData: any = { id: doc.primary, embedding };
            sampleVectors.forEach((sample, i) => {
                const distance = euclideanDistance(sample, embedding);
                docData['idx' + i] = indexNrToString(distance);
            });
            await db.vectors.upsert(docData);
        }
    }
});
```

The pipeline `identifier` contains the model name and the dimensions. When you later change one of them, use a new identifier so that RxDB processes all documents again instead of continuing from the last checkpoint.

## Querying the Vector Search

For a search, embed the user input with the query prefix, read the candidate embeddings in an index range around the search vector, and sort the candidates by similarity. Because all vectors are normalized, the cosine similarity and the euclidean distance return the same order.

```ts
// search.ts
import { cosineSimilarity, euclideanDistance } from 'rxdb/plugins/vector';
import { sortByObjectNumberProperty } from 'rxdb/plugins/utils';
import { db } from './database';
import { embedQuery } from './embedding';
import { pipeline, sampleVectors, indexNrToString } from './pipeline';

export async function search(userInput: string, indexDistance = 0.003) {
    // Make sure all documents have an embedding before searching.
    await pipeline.awaitIdle();
    const queryVector = await embedQuery(userInput);

    const candidates = new Map<string, number[]>();
    await Promise.all(sampleVectors.map(async (sample, i) => {
        const distanceToSample = euclideanDistance(sample, queryVector);
        const range = distanceToSample * indexDistance;
        const docs = await db.vectors.find({
            selector: {
                ['idx' + i]: {
                    $gt: indexNrToString(distanceToSample - range),
                    $lt: indexNrToString(distanceToSample + range)
                }
            }
        }).exec();
        docs.forEach(d => candidates.set(d.primary, d.embedding));
    }));

    const ranked = Array.from(candidates.entries())
        .map(([id, embedding]) => ({
            id,
            similarity: cosineSimilarity(queryVector, embedding)
        }))
        .sort(sortByObjectNumberProperty('similarity'))
        .slice(0, 10);

    const items = await db.items.findByIds(ranked.map(r => r.id)).exec();
    return ranked.map(r => ({ ...r, item: items.get(r.id) }));
}

const results = await search('how do I sync data between devices');
console.dir(results);
// > [{ id: '...', similarity: 0.71, item: RxDocument }, ...]
```

In the [benchmarks of the vector database article](./javascript-vector-database.md#performance-benchmarks), this index range query took `88` milliseconds on 10k documents with 384-dimensional vectors, compared to `765` milliseconds for a full table scan. The [benchmark below](#embeddinggemma-2-vs-other-embedding-models-benchmark) shows that EmbeddingGemma 2 needs another `38` milliseconds to embed the search query with the `q4` weights on a 4-core CPU. If a full scan is fast enough for your dataset, you can drop the `idx` fields and just compare the query vector against all stored embeddings.

## EmbeddingGemma 2 vs. Other Embedding Models: Benchmark

To compare EmbeddingGemma 2 with the models that are commonly used with transformers.js, we ran the same benchmark script for each model on October 8, 2026. The setup:

- **Dataset**: the test split of [BEIR SciFact](https://huggingface.co/datasets/BeIR/scifact), 300 search queries against 5,183 scientific abstracts with human relevance labels.
- **Runtime**: Node.js 22 with transformers.js `4.3.1` on the CPU (onnxruntime), on a cloud VM with 4 vCPUs (Intel Xeon @ 2.10GHz). No GPU.
- **Models**: the `q8` ONNX weights of each model (and also `q4` for EmbeddingGemma 2), with the query and document prefixes and the pooling that the model card recommends.
- **Search**: a full scan with cosine similarity over all vectors, so that the quality numbers only depend on the model and not on an index.
- **Metrics**: `nDCG@10` and `Recall@10` (higher is better), the median time to embed one search query, and how many documents per second are embedded when indexing in batches of 8 (higher is better).

To check the setup, compare the result for `bge-small-en-v1.5`: it scores `0.708` here, and its [model card](https://huggingface.co/BAAI/bge-small-en-v1.5) reports `0.713` on SciFact with the non-quantized weights.

| Model | Dimensions | Download | Query embedding (median) | Indexing | nDCG@10 | Recall@10 |
| ----- | ---------- | --------------- | ------------------------ | -------- | ------- | --------- |
| **EmbeddingGemma 2** (`q8`) | 768 | 314 MB | 167 ms | 1.6 docs/s | **0.853** | **0.944** |
| **EmbeddingGemma 2** (`q8`, truncated) | 256 | 314 MB | 167 ms | 1.6 docs/s | 0.836 | 0.918 |
| **EmbeddingGemma 2** (`q8`, truncated) | 128 | 314 MB | 167 ms | 1.6 docs/s | 0.793 | 0.867 |
| **EmbeddingGemma 2** (`q4`) | 768 | 175 MB | 38 ms | 2.0 docs/s | 0.849 | 0.924 |
| **EmbeddingGemma 2** (`q4`, truncated) | 256 | 175 MB | 38 ms | 2.0 docs/s | 0.831 | 0.919 |
| **EmbeddingGemma 2** (`q4`, truncated) | 128 | 175 MB | 38 ms | 2.0 docs/s | 0.783 | 0.878 |
| EmbeddingGemma 1 (`embeddinggemma-300m`) | 768 | 309 MB | 228 ms | 2.0 docs/s | 0.794 | 0.925 |
| EmbeddingGemma 1 (truncated) | 256 | 309 MB | 228 ms | 2.0 docs/s | 0.779 | 0.908 |
| `Supabase/gte-small` | 384 | 34 MB | 4.4 ms | 13.9 docs/s | 0.719 | 0.840 |
| `bge-small-en-v1.5` | 384 | 34 MB | 4.8 ms | 15.0 docs/s | 0.708 | 0.826 |
| `nomic-embed-text-v1.5` | 768 | 137 MB | 13.0 ms | 4.2 docs/s | 0.687 | 0.830 |
| `multilingual-e5-small` | 384 | 118 MB | 6.2 ms | 12.7 docs/s | 0.664 | 0.791 |
| `all-MiniLM-L6-v2` | 384 | 23 MB | 3.0 ms | 24.0 docs/s | 0.658 | 0.800 |

The results show a clear tradeoff:

- **Quality**: EmbeddingGemma 2 has the best search results of all tested models. Truncated to 256 dimensions it still scores `0.836`, which is higher than every other model at its full size. Compared to `all-MiniLM-L6-v2`, the model used in the [JavaScript vector database tutorial](./javascript-vector-database.md), the nDCG@10 goes from `0.658` to `0.853`, which is **30%** better. The `q4` weights from the code above score `0.849`, almost the same as `q8`.
- **Query time**: with the `q4` weights, embedding one search query takes `38` milliseconds, which is **13x** slower than `all-MiniLM-L6-v2`. The index range query from the [vector database article](./javascript-vector-database.md#performance-benchmarks) took `88` milliseconds (measured on a different machine), so a full search lands at roughly `130` milliseconds. Notice that `q4` was 4x faster than `q8` (`167` milliseconds) on this CPU.
- **Indexing time**: with `2.0` documents per second (`q4`) on 4 CPU cores, embedding the 5,183 SciFact abstracts took 44 minutes (55 minutes with `q8`). `all-MiniLM-L6-v2` did the same in 3.6 minutes. Notice that SciFact abstracts are long (215 words on average). Short texts like chat messages or product names embed faster.
- **Download**: 175 MB at `q4` (314 MB at `q8`) compared to 23 to 34 MB for the small models.

So EmbeddingGemma 2 is the better choice when search quality matters and the dataset is indexed once and then grows slowly, for example notes, documents, or support articles. When thousands of documents arrive at once on low-end devices, a small model like `gte-small` or `bge-small-en-v1.5` indexes about **7x** faster. Another option is to compute the document embeddings with EmbeddingGemma 2 on the server and sync them to the clients, so that the client only has to embed the search query.

Keep in mind that these numbers were measured on a server CPU in Node.js. In the browser, the [WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) backend can be faster, the WebAssembly fallback is usually slower, and phones in power-saving mode are slower again. Measure on the slowest device your users have before you ship it.

## Where EmbeddingGemma 2 Still Has Limits on the Client

Running the model in the browser has costs that a server-side setup does not have:

- **Download size**: the `q4` text model is about 175 MB. The browser caches it, but the first load needs a fast connection. You might want to download it in the background after the app has started.
- **Device speed**: in the [benchmark](#embeddinggemma-2-vs-other-embedding-models-benchmark), EmbeddingGemma 2 embedded `2.0` documents per second on 4 CPU cores, so 10k documents take about 80 minutes. WebGPU is not available in every browser, and low-end phones are slower than that. Run the model in a [Web Worker](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers) so that the UI does not freeze.
- **Multimodal weights**: images, video, and audio need the vision and audio encoders, which add another 109 MB and 189 MB at `q4` according to the [ONNX model page](https://huggingface.co/onnx-community/embeddinggemma-2-ONNX). For text search you do not need them.

When the client is too slow, compute the embeddings on the server with the same model and the same prefixes, and sync the `vectors` collection to the clients with the [RxDB Sync Engine](../replication.md). The search itself then still runs locally and works offline. The [local-first article](./local-first-future.md) explains this tradeoff in more detail.

## FAQ

<details>
<summary>Can EmbeddingGemma 2 run in the browser?</summary>

Yes. Google lists transformers.js and WebGPU as supported runtimes, and the ONNX export `onnx-community/embeddinggemma-2-ONNX` loads with the `feature-extraction` pipeline. With `q4` quantization the text model is about 175 MB. Store the resulting vectors in **[RxDB](../rx-database.md)** to search them offline.

</details>

<details>
<summary>How many dimensions should I store for EmbeddingGemma 2 in a local database?</summary>

256 dimensions are a good default. According to the model card, the MTEB English score drops from 68.46 at 768 dimensions to 67.78 at 256 dimensions, while the stored vectors are three times smaller. Always L2-normalize the vector again after truncating it. The **[RxDB vector plugin](./javascript-vector-database.md)** provides `cosineSimilarity()` and `euclideanDistance()` to compare them.

</details>

<details>
<summary>Is EmbeddingGemma 2 better than all-MiniLM-L6-v2 for search?</summary>

Yes, for quality. In our SciFact benchmark EmbeddingGemma 2 reached an nDCG@10 of `0.853`, compared to `0.658` for `all-MiniLM-L6-v2`. But with the `q4` weights it embeds a query in `38` ms instead of `3` ms and indexes documents 12x slower on the CPU. The **[benchmark section](#embeddinggemma-2-vs-other-embedding-models-benchmark)** compares seven models.

</details>

<details>
<summary>Do I need a server-side vector database for semantic search?</summary>

No. For datasets with thousands to tens of thousands of documents, a client-side database with a distance-to-samples index is fast enough. **[RxDB](../rx-database.md)** stores the embeddings in IndexedDB or OPFS and keeps them up to date with the **[RxPipeline](../rx-pipeline.md)**.

</details>

<details>
<summary>Do I have to recreate my embeddings when I switch to EmbeddingGemma 2?</summary>

Yes. Vectors from different models, and from the same model with different dimensions, are not comparable. Use a new pipeline identifier in RxDB so that all documents are processed again.

</details>

## Follow Up

- Read the full [JavaScript vector database tutorial](./javascript-vector-database.md) for the indexing methods and benchmarks.
- Learn how the [RxPipeline](../rx-pipeline.md) processes documents in the background.
- Compare it with the keyword-based [fulltext search](../fulltext-search.md).
- Start with the [RxDB Quickstart](../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐
- Ask questions in the [RxDB chat](/chat/).

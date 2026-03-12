# Fulltext Search 👑

> Master local fulltext search with RxDB's FlexSearch plugin. Enjoy real-time indexing, efficient queries, and offline-first support made easy.

# Fulltext Search

To run fulltext search queries on the local data, RxDB has a fulltext search plugin based on [flexsearch](https://github.com/nextapps-de/flexsearch) and [RxPipeline](./rx-pipeline.md). On each write to a given source [RxCollection](./rx-collection.md), an indexer is running to map the written document data into a fulltext search index.
The index can then be queried efficiently with complex fulltext search operations.

## Benefits of using a local fulltext search

1. Efficient Search and Indexing

The plugin utilizes the [FlexSearch library](https://github.com/nextapps-de/flexsearch), known for its speed and memory efficiency. This ensures that search operations are performed quickly, even with large datasets. The search engine can handle multi-field queries, partial matching, and complex search operations, providing users with highly relevant results.

2. Local Data Indexing

With the plugin, all search operations are performed on the local data stored within the RxDB collections. This means that users can execute fulltext search queries without the need for an external server or database, which is especially beneficial for offline-first applications. The local indexing ensures that search queries are executed quickly, reducing the latency typically associated with remote database queries. Also when used in multiple browser tabs, it is ensured that through [Leader Election](./leader-election.md), only exactly one tabs is doing the work of indexing without having an overhead in the other browser tabs.

3. Real-time Indexing

The plugin integrates seamlessly with RxDB's reactive nature. Every time a document is written to an [RxCollection](./rx-collection.md), an indexer updates the fulltext search index in real-time. This ensures that search results are always up-to-date, reflecting the most current state of the data without requiring manual reindexing.

4. Persistent indexing

The fulltext search index is efficiently persisted within the [RxCollection](./rx-collection.md), ensuring that the index remains intact across app restarts. When documents are added or updated in the collection, the index is incrementally updated in real-time, meaning only the changes are processed rather than reindexing the entire dataset. This incremental approach not only optimizes performance but also ensures that subsequent app launches are quick, as there's no need to reindex all the data from scratch, making the search feature both reliable and fast from the moment the app starts. When using an [encrypted storage](./encryption.md) the index itself and incremental updates to it are stored fully encrypted and are only decrypted in-memory.

5. Complex Query Support

The FlexSearch-based plugin allows for [sophisticated search queries](https://github.com/nextapps-de/flexsearch?tab=readme-ov-file#index.search), including multi-term and contextual searches. Users can perform complex searches that go beyond simple keyword matching, enabling more advanced use cases like searching for documents with specific phrases, relevance-based sorting, or even phonetic matching.

6. Offline-First Support and Privacy

As RxDB is designed with [offline-first applications](./offline-first.md) in mind, the fulltext search plugin supports this paradigm by ensuring that all search operations can be performed offline. This is crucial for applications that need to function in environments with intermittent or no internet connectivity, offering users a consistent and reliable search experience with [zero latency](./articles/zero-latency-local-first.md).

## Using the RxDB Fulltext Search

The flexsearch search is a [RxDB Premium Package 👑](/premium/) which must be purchased and imported from the `rxdb-premium` npm package.

Step 1: Add the `RxDBFlexSearchPlugin` to RxDB.

```ts
import { RxDBFlexSearchPlugin } from 'rxdb-premium/plugins/flexsearch';
import { addRxPlugin } from 'rxdb/plugins/core';
addRxPlugin(RxDBFlexSearchPlugin);
```

Step 2: Create a `RxFulltextSearch` instance on top of a collection with the `addFulltextSearch()` function.

```ts
import { addFulltextSearch } from 'rxdb-premium/plugins/flexsearch';
const flexSearch = await addFulltextSearch({
    // unique identifier. Used to store metadata and continue indexing on restarts/reloads.
    identifier: 'my-search',
    // The source collection on whose documents the search is based on
    collection: myRxCollection,
    /**
     * Transforms the document data to a given searchable string.
     * This can be done by returning a single string property of the document
     * or even by concatenating and transforming multiple fields like:
     * doc => doc.firstName + ' ' + doc.lastName
     */
    docToString: doc => doc.firstName,
    /**
     * (Optional)
     * Amount of documents to index at once.
     * See https://rxdb.info/rx-pipeline.html
     */
    batchSize: number;
    /**
     * (Optional)
     * lazy: Initialize the in memory fulltext index at the first search query.
     * instant: Directly initialize so that the index is already there on the first query.
     * Default: 'instant'
     */
    initialization: 'instant',
    /**
     * (Optional)
     * @link https://github.com/nextapps-de/flexsearch#index-options
     */
    indexOptions: {},
});
```

Step 3: Run a search operation:

```ts
// find all documents whose searchstring contains "foobar"
const foundDocuments = await flexSearch.find('foobar');

/**
 * You can also use search options as second parameter
 * @link https://github.com/nextapps-de/flexsearch#search-options
 */
const foundDocuments = await flexSearch.find('foobar', { limit: 10 });
```

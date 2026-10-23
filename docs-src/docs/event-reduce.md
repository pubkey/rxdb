---
title: EventReduce - Fast Realtime Queries in RxDB
slug: event-reduce.html
description: Learn how RxDB uses the EventReduce algorithm and the result window buffer to update observed queries without running them again, and how to configure or disable it.
---

# EventReduce

One big benefit of having a realtime database is that big performance optimizations can be done when the database knows a query is observed and the updated results are needed continuously. RxDB uses the [EventReduce Algorithm](https://github.com/pubkey/event-reduce) to optimize observed or recurring queries. When a document is written, RxDB calculates the new results of a query from the old results and the change event, instead of running the query against the storage again.

EventReduce is enabled by default. It is configured with the `eventReduce` option of [createRxDatabase()](./rx-database.md#eventreduce): `true` (the default) uses the default options, `false` disables EventReduce and an object sets your own options.

## Disable EventReduce

Set `eventReduce: false` to disable it. Then every query runs again against the storage after each write to its collection.

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageLocalstorage(),
  eventReduce: false
});
```

## Result Window Buffer

For queries with a `skip` or `limit`, RxDB also keeps some documents before and after the result window in memory,
the [result window buffer](https://github.com/pubkey/event-reduce/blob/master/docs/result-window-buffer.md).
When documents leave the result window, for example because they are deleted, the next documents are taken from the buffer
instead of running the query again.

### Default buffer sizes

By default, RxDB uses the [recommended buffer sizes of event-reduce](https://github.com/pubkey/event-reduce/blob/master/docs/result-window-buffer.md#recommended-sizes) on both sides of the result window.

### Custom buffer sizes

You can set your own buffer sizes with a function that gets the normalized query.
The sizes must be numbers of 0 or more:

```ts
import { createRxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const myDatabase = await createRxDatabase({
  name: 'mydatabase',
  storage: getRxStorageLocalstorage(),
  eventReduce: {
    resultWindowBuffer: (query) => ({
      // documents to keep before the result window (only used when the query has a skip)
      skip: Math.min(query.skip, 10),
      // documents to keep after the result window (only used when the query has a limit)
      limit: query.limit ? query.limit : 0
    })
  }
});
```

A bigger buffer saves more queries, but each query then reads more documents from the storage, and the buffer uses more memory.

To turn off only the buffer and keep EventReduce, return `{ skip: 0, limit: 0 }`.

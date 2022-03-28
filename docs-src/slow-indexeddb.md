# Why IndexedDB is slow and what to use instead

So you have a JavaScript web application that needs to store data at the client side, either to make it offline useable, just for caching purposes or for other reasons.

For in-browser data storage, you have some options:

- **Cookies** are send which each HTTP request, so you cannot store more then a few strings in them.
- **WebSQL** [is deprecated](https://hacks.mozilla.org/2010/06/beyond-html5-database-apis-and-the-road-to-indexeddb/) because it never was a real standard and turning it into a standard would have been too difficult.
- **LocalStorage** is a synchronous API over asynchronous IO-access. Storing and reading data can fully block the JavaScript process so you cannot use LocalStorage for more then few simple key-value pairs.
- The **FileSystem API** could be used to store plain binary files, but it is [only supported in chrome](https://caniuse.com/filesystem) for now.
- **IndexedDB** is an indexed key-object database. It can store json data and iterate over its indexes. It is [widely supported](https://caniuse.com/indexeddb) and stable.

It becomes clear that the only way to go is IndexedDB. You start developing your app and everything goes fine.
But as soon as your app gets bigger, more complex or just handles more data, you might notice something. **IndexedDB is slow**. Not slow like a database on a cheap server, **even slower**! Inserting a few hundred documents can take up several seconds. Time which can be critical for a fast page load. Even sending data over the internet to the backend can be faster then storing it inside of an IndexedDB database.

> Transactions vs Throughput

So before we start complaining, lets analyze what exactly is slow. When you run tests on Nolans [Browser Database Comparison](http://nolanlawson.github.io/database-comparison/) you can see that inserting 1k documents into IndexedDB takes about 80 milliseconds, 0.08ms per document. This is not really slow. It is quite fast and it is very unlikely that you want to store that many document at the same time at the client side. But the key point here is that all these documents get written in a `single transaction`.

I forked the comparison tool [here](https://pubkey.github.io/client-side-databases/database-comparison/index.html) and changed it to use one transaction per document write. And there we have it. Inserting 1k documents with one transaction per write, takes about 2 seconds. Interestingly if we increase the document size to be 100x bigger, it still takes about the same time to store them. This makes clear that the limiting factor to IndexedDB performance is the transaction handling, not the data throughput.

<p align="center">
  <img src="./files/indexeddb-transaction-throughput.png" alt="IndexedDB transaction throughput" width="700" />
</p>


To fix your IndexedDB performance problems you have to make sure to use as less transactions as possible.
Sometimes this is easy, as instead of iterating over a documents list and calling single inserts, with RxDB you could use the [bulk methods](https://rxdb.info/rx-collection.html#bulkinsert) to store many document at once.
But most of the time is not so easy. Your user clicks around, data gets replicated from the backend, another browser tab writes data. All these things can happen at random time and you cannot crunch all that data in a single transaction.

Another solution is to just not care about performance at all.
In a few releases the browser vendors will have optimized IndexedDB and everything is fast again. Well, IndexedDB was slow [in 2013](https://www.researchgate.net/publication/281065948_Performance_Testing_and_Comparison_of_Client_Side_Databases_Versus_Server_Side) and it is still slow today. If this trend continues, it will still be slow in a few years from now. Waiting is not an option. The chromium devs made [a statement](https://bugs.chromium.org/p/chromium/issues/detail?id=1025456#c15) to focus on optimizing read performance, not write performance.

Switching to WebSQL (even if it is deprecated) is also not an option because, like [the comparsion tool shows](https://pubkey.github.io/client-side-databases/database-comparison/index.html), it has even slower transactions.

## Do not use IndexedDB as a database

To prevent transaction handling and to fix the performance problems, we need to stop using IndexedDB as a database. Instead all data is loaded into the memory on the inital page load. Here all reads and writes happen in memory which is about 100x faster. Only some time after a write occured, the memory state is persisted into IndexedDB with a **single write transaction**. In this scenario IndexedDB is used as a filesystem, not as a database.

There are some libraries that already do that:

- LokiJS with the [IndexedDB Adapter](https://techfort.github.io/LokiJS/LokiIndexedAdapter.html)
- [Absurd-SQL](https://github.com/jlongster/absurd-sql)
- SQL.js with the [empscripten Filesystem API](https://emscripten.org/docs/api_reference/Filesystem-API.html#filesystem-api-idbfs)
- [DuckDB Wasm](https://duckdb.org/2021/10/29/duckdb-wasm.html)

## Persistence

One downsite of not directly using IndexedDB, is that your data is not persistend all the time. And when the JavaScript process exists without having persisted to IndexedDB, data can be lost. To prevent this from happening, we have to ensure that the in-memory state is written down to the disc. One point is make persisting as fast as possible. LokiJS for example has the `incremental-indexeddb-adapter` which only saves new writes to the disc instead of persisting the whole state. Another point is to run the persisting at the correct point in time. For example the RxDB [LokiJS storage](https://rxdb.info/rx-storage-lokijs.html) persists in the following situations:

- When the database is idle and no write or query is running. In that time we can persist the state if any new writes appeared before.
- When the `window` fires the [beforeunload event](https://developer.mozilla.org/en-US/docs/Web/API/WindowEventHandlers/onbeforeunload) we can assume that the JavaScript process is exited any moment and we have to persiste the state. After `beforeunload` there are several seconds time which are sufficient to store all new changes. This has shown to work quite reliable.

The only missing event that can happen is when the browser exists unexpectedly like when it crashes or when the power of the computer is shut of.



## Multi Tab Support

One big difference between a web application and a 'normal' app, is that your users can use the app in multiple browser tabs at the same time. But when you have all database state in memory and only periodically write it to disc, multiple browser tabs could overwrite each other and you would loose data. This might not be a problem when you rely on a client-server replication, because the lost data might already be replicated with the backend and therefore with the other tabs. But this would not work when the client is offline.

The ideal way to solve that problem, is to use a [SharedWorker](https://developer.mozilla.org/en/docs/Web/API/SharedWorker). A SharedWorker is like a [WebWorker](https://developer.mozilla.org/en/docs/Web/API/Web_Workers_API) that runs its own JavaScript process only that the SharedWorker is shared between multiple contexts. You could create the database in the SharedWorker and then all browser tabs could request the Worker for data instead of having their own database. But unfortunately the SharedWorker API does [not work](https://caniuse.com/sharedworkers) in all browsers. Safari [dropped](https://bugs.webkit.org/show_bug.cgi?id=140344) its support and InternetExplorer or Android Chrome, never addopted it. Also it cannot be polyfilled.

Instead, we could use the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) to communicate between tabs and then apply a [leader election](https://github.com/pubkey/broadcast-channel#using-the-leaderelection) between them. The leader election ensures that, no matter how many tabs are open, always one tab is the `Leader`.

<p align="center">
  <img src="./files/leader-election.gif" alt="Leader Election" width="500" />
</p>

The disadvantage is that the leader election process takes some time on the inital page load (about 150 milliseconds). Also the leader election can break when a JavaScript process is fully blocked for a longer time. When this happens, a good way is to just reload the browser tab to restart the election process.

Using a leader election is implemented in the [RxDB LokiJS Storage](./rx-storage-lokijs.md).

## Further read

- [Offline First Database Comparison](https://github.com/pubkey/client-side-databases)
- [Speeding up IndexedDB reads and writes](https://nolanlawson.com/2021/08/22/speeding-up-indexeddb-reads-and-writes/)
- [SQLITE ON THE WEB: ABSURD-SQL](https://hackaday.com/2021/08/24/sqlite-on-the-web-absurd-sql/)
- [SQLite in a PWA with FileSystemAccessAPI](https://anita-app.com/blog/articles/sqlite-in-a-pwa-with-file-system-access-api.html)
- [Response to this article by Oren Eini](https://ravendb.net/articles/re-why-indexeddb-is-slow-and-what-to-use-instead)

# Why IndexedDB is slow and what to use instead

So you have a JavaScript web application that needs to store data at the client side, either to make it offline useable, just for caching purposes or for other reasons.

For in-browser data storage, you have some options:

- **Cookies** are send which each HTTP request, so you cannot store more then a few string in them.
- **WebSQL** [is deprecated](https://hacks.mozilla.org/2010/06/beyond-html5-database-apis-and-the-road-to-indexeddb/) because it never was a real standard and turning it into a standard would have been too difficult.
- **LocalStorage** is a synchronous API over asynchronous IO-access. Storing and reading data can fully block the JavaScript process so you cannot use LocalStorage for more then few simple key-value pairs.
- The **FileSystem API** could be used to store plain binary files, but it is [only supported in chrome](https://caniuse.com/filesystem) for now.
- **IndexedDB** is an indexed key-object database. It can store json data and itterate over its indexes. It is [widely supported](https://caniuse.com/indexeddb) and stable.

It becomes clear that the only way to go is IndexedDB. You start developing your app and everything goes fine.
But as soon as your app gets bigger, more complex or just handles more data, you might notice something. **IndexedDB is slow**. Not slow like a database on a cheap server, **even slower**! Inserting a few hundred documents can take up several seconds. Time which can be critical for a fast page load. Even sending data over the internet to the backend can be faster then storing it inside of an IndexedDB database.

> Transactions vs Throughput

So before we start complaining, lets analyze what exactly is slow. When you run tests on Nolans [Browser Database Comparison](http://nolanlawson.github.io/database-comparison/) you can see that inserting 1k documents into IndexedDB takes about 80 milliseconds, 0.08ms per document. This is not really slow. It is quite fast and it is very unlikely that you want to store that many document at the same time at the client side. But the key point here is that all these documents get written in a `single transaction`.

I forked the comparison tool [here](https://pubkey.github.io/client-side-databases/database-comparison/index.html) and changed it to use one transaction per document write. And there we have it. Inserting 1k documents with one transaction per write, takes about 2 seconds. And even if we increase the document size to be 100x bigger, it still takes about the same time to store them. This makes clear that the limiting factor to IndexedDB performance is the transaction handling, not the data throughput.

<p align="center">
  <img src="./files/indexeddb-transaction-throughput.png" alt="IndexedDB transaction throughput" width="700" />
</p>

To fix your IndexedDB performance problems you have to make sure to use as least transactions as possible.
Sometimes this is easy, as instead of iterating over a documents list and calling single inserts, with RxDB you could use the [bulk methods](https://rxdb.info/rx-collection.html#bulkinsert) to store many document at once.
But most of the time is not so easy. You user clicks around, data gets replicated from the backend, another browser tab writes data. All these things can happen at random time and you cannot crunch all that data in a single transaction.

Another solution is to just not care about performance at all.
In a few releases the browser vendors will have optimized IndexedDB and everything is fast again. Well, IndexedDB was slow [in 2013](https://www.researchgate.net/publication/281065948_Performance_Testing_and_Comparison_of_Client_Side_Databases_Versus_Server_Side) and it is still slow today. If this trend continues, it will still be slow in a few years from now. Waiting is not an option.

> Do not use IndexedDB as a database

## Multi Tab Support

One big difference between a web application and a 'normal' app, is that your users can use the app in multiple browser tabs at the same time. But when you have all database state in memory and only periodically write it to disc, multiple browser tabs could overwrite each other and you would loose data. This might not be a problem when you rely on a client-server replication, because the lost data might already be replicated with the backend and therefore with the other tabs. But this would not work when the client is offline.

The ideal way to solve that problem, is to use a [SharedWorker](https://developer.mozilla.org/en/docs/Web/API/SharedWorker). A SharedWorker is like a [WebWorker](https://developer.mozilla.org/en/docs/Web/API/Web_Workers_API) that runs its own JavaScript process only that the SharedWorker is shared between multiple contexts. You could create the database in the SharedWorker and then all browser tabs could request the Worker for data instead of having their own database.

But unfortunately the SharedWorker API does [not work](https://caniuse.com/sharedworkers) in all browsers. Safari [dropped](https://bugs.webkit.org/show_bug.cgi?id=140344) its support and InternetExplorer or Android Chrome, never addopted it. Also it cannot be polyfilled.

Instead, we could use the [BroadcastChannel API](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API) to communicate between tabs and then apply a [leader election](https://github.com/pubkey/broadcast-channel#using-the-leaderelection) between them. The leader election ensures that, no matter how many tabs are open, always one tab is the `Leader`.

<p align="center">
  <img src="./files/leader-election.gif" alt="Leader Election" width="500" />
</p>

The disadvantage is that the leader election process takes some time on the inital page load (about 150 milliseconds). Also the leader election can break when a JavaScript process is fully blocked for a longer time. When this happens, a good way is to just reload the browser tab to restart the election process.

Using a leader election is implemented in the [RxDB LokiJS Storage](./rx-storage-lokijs.md).

## Data persistence

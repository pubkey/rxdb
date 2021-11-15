# Why IndexedDB is slow and what to use instead

So you have a JavaScript web application that needs to store data at the client side, either to make it offline useable or just for caching purposes.

For in-browser data storage, you have some options:

- **Cookies** are send which each HTTP request, so you cannot store more then a few string in them.
- **WebSQL** [is deprecated](https://hacks.mozilla.org/2010/06/beyond-html5-database-apis-and-the-road-to-indexeddb/) because it never was a real standard and turning it into a standard would have been too difficult.
- **LocalStorage** is a synchronous API over asynchronous IO-access. Storing and reading data fully blocks the JavaScript process so you cannot use it for more then few simple key-value pairs.
- The **FileSystem API** could be used to store plain binary files, but it is [only supported in chrome](https://caniuse.com/filesystem) for now.
- **IndexedDB** is an indexed key-object database. It can store json data and itterate over its indexes. It is [widely supported](https://caniuse.com/indexeddb) and stable.

It becomes clear that the only way to go is IndexedDB. And when you start programming your application, the first thing that you will find out, is that **IndexedDB is slow**. Not slow like a database on a cheap server, even slower! Inserting a few hundred lines can take up several seconds. Time which can be critical for a fast page load. But browsers become better, so why should I care about performance now, when in a few releases the browser vendors will have optimized IndexedDB? Well, IndexedDB was slow [in 2013](https://www.researchgate.net/publication/281065948_Performance_Testing_and_Comparison_of_Client_Side_Databases_Versus_Server_Side) and it is still slow today. If this trend continues, it will still be slow in a few years from now.



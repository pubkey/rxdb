# RxDB Premium

To make RxDB a sustainable Project, some plugins are not part of the RxDB open source project. Instead they are part of the `rxdb-premium` package.


## Premium plugins

- [Query Optimizer](./query-optimizer.md) A tool to find the best index for a given query. You can use this during build time to find the best index and then use that index during runtime.
- [RxStorage IndexedDB](./rx-storage-indexeddb.md) a really fast [RxStorage](./rx-storage.md) implementation based on **IndexedDB**. Made to be used in browsers.
- [RxStorage SQLite](./rx-storage-sqlite.md) a really fast [RxStorage](./rx-storage.md) implementation based on **SQLite**. Made to be used on **Node.js**, **Electron**, **React Native**, **Cordova** or **Capacitor**.
- [RxStorage Sharding](./rx-storage-sharding.md) a wrapper around any other [RxStorage](./rx-storage.md) that improves performance by applying the sharding technique.
- [Storage migration](./storage-migration.md) A plugins that migrates data from one storage to another. Use this when you want to change the used RxStorage or to migrate data from an older RxDB major version.
- [RxStorage Memory Synced](./rx-storage-memory-synced.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly useful in browser based applications.
- [RxStorage Localstorage Meta Optimizer](./rx-storage-localstorage-meta-optimizer.md) is a wrapper around any other RxStorage. The wrapper uses the original RxStorage for normal collection documents. But to optimize the initial page load time, it uses localstorage to store the plain key-value metadata that RxDB needs to create databases and collections. This plugin can only be used in browsers.

## Getting Premium

### As a company

If you use RxDB in your company project, you can purchase access by filling out [this form](https://rxdb.info/form-premium.html).

### For your side project

If you are a **single developer** and you use RxDB in your **side project**, you can get 5 years access to the premium package by solving one Task of the [Premium Tasks](https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md) list.

**Notice:** It is not possible to get premium access via github sponsorships.

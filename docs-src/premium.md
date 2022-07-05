# RxDB Premium

To make RxDB a sustainable Project, some plugins are not part of the RxDB open source project. Instead they are part of the `rxdb-premium` package.


## Premium plugins

- [Query Optimizer](./query-optimizer.md) A tool to find the best index for a given query. You can use this during build time to find the best index and then use that index during runtime.
- [RxStorage IndexedDB](./rx-storage-indexeddb.md) a really fast [RxStorage](./rx-storage.md) implementation based on **IndexedDB**. Made to be used in browsers.
- [RxStorage SQLite](./rx-storage-sqlite.md) a really fast [RxStorage](./rx-storage.md) implementation based on **SQLite**. Made to be used on **Node.js**, **Electron**, **React Native**, **Cordova** or **Capacitor**.
- [RxStorage Sharding](./rx-storage-sharding.md) a wrapper around any other [RxStorage](./rx-storage.md) that improves performance by applying the sharding technique.
- **migrateRxDBV11ToV12** A plugins that migrates data from any RxDB v11 storage to a new RxDB v12 database. Use this when you upgrade from RxDB 11->12 and you have to keep your database state.
- [RxStorage Memory Synced](./rx-storage-memory-synced.md) is a wrapper around any other RxStorage. The wrapper creates an in-memory storage that is used for query and write operations. This memory instance is replicated with the underlaying storage for persistence.
The main reason to use this is to improve initial page load and query/write times. This is mostly usefull in browser based applications.

## Getting Premium

### As a company

If you use RxDB in your company project, you can purchase access by filling out [this form](https://forms.gle/SVjUuPdVtrSM4ZGW7).

### For your side project

If you are a **single developer** and you use RxDB in your **side project**, you can get livetime access to the premium package by solving one Task of the [Premium Tasks](https://github.com/pubkey/rxdb/blob/master/orga/premium-tasks.md) list.

**Notice:** It is not possible to get premium access via github sponsorships.

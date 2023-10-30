# RxDB Database on top of Deno Key Value Store

With the DenoKV [RxStorage](./rx-storage.md) layer for [RxDB](https://rxdb.info), you can run a fully featured NoSQL database on top of the [DenoKV](https://docs.deno.com/kv/manual) storage.


Deno KV is a key-value database built directly into the Deno runtime, available in the Deno.Kv namespace. It can be used for many kinds of data storage use cases, but excels at storing simple data structures that benefit from very fast reads and writes. Deno KV is available in the Deno CLI and on Deno Deploy.




## Using non-DenoKV storages in Deno

When you use other storages than the DenoKV storage inside of a Deno app, make sure you set `multiInstance: false` when creating the database. Also you should only run one process per Deno-Deploy instance. This ensures your events are not mixed up by the [BroadcastChannel](https://docs.deno.com/deploy/api/runtime-broadcast-channel) accross instances which would lead to wrong behavior.


```ts

// DenoKV based database
const db = await createRxDatabase({
  name: 'denokvdatabase',
  storage: getRxStorageDenoKV(),
  /**
   * Use multiInstance: true so that the Deno Broadcast Channel
   * emits event accross DenoDeploy instances
   * (true is also the default, so you can skip this setting)
   */
  multiInstance: true
});


// Non-DenoKV based database
const db = await createRxDatabase({
  name: 'denokvdatabase',
  storage: getRxStorageFilesystemNode(),
  /**
   * Use multiInstance: false so that it does not share events
   * accross instances because the stored data is anyway not shared
   * between them.
   */
  multiInstance: false
});
```

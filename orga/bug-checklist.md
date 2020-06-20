# Bug checklist

This is a list of stuff wich could be done to analyse a bug you have found in RxDB.


## Different browsers

If you use RxDB in the browser, try different browser and observe if the behavior changes.

## Different adapters

Check if your problem still occurs when you change the adapter of the data storage.
If not done before, start trying with the memory adapter.

## Disable EventReduce

RxDB uses an algorithm to optimize queries. 
You should disable that when creating the database and check if the behavior changes.

```ts
const db = await createRxDatabase({
    name,
    adapter: 'memory'
    eventReduce: true,
});
```

## Disable KeyCompression

If you use the key-compression, disable it and check if the behavior changes.

## Pouch Debug

By enabling the pouchdb debugging, you can observe what is going on in the internal pouchdb of your database.
With this you can screenshot your console and provide for information for a quick analysis.

```ts
import pouchdbDebug from 'pouchdb-debug';
import {
    PouchDB
} from 'rxdb';
PouchDB.plugin(pouchdbDebug);

// debug all
PouchDB.debug.enable('*');

// only debug queries
PouchDB.debug.enable('pouchdb:find');
```

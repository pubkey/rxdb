---
title: RxState - Reactive Persistent State with RxDB
slug: rx-state.html
description: Get real-time, persistent state without the hassle. RxState integrates easily with signals and hooks, ensuring smooth updates across tabs and devices.
---

# RxState - Reactive Persistent State with RxDB

RxState is a flexible state library build on top of the [RxDB Database](https://rxdb.info/). While RxDB stores similar documents inside of collections, RxState can store any complex JSON data without having a predefined schema.

The state is automatically persisted through RxDB and states changes are propagated between browser tabs. Even setting up replication is simple by using the RxDB [Replication feature](./replication.md).

## Creating a RxState

A `RxState` instance is created on top of a [RxDatabase](./rx-database.md). The state will automatically be persisted with the [storage](./rx-storage.md) that was used when setting up the RxDatabase. To use it you first have to import the `RxDBStatePlugin` and add it to RxDB with `addRxPlugin()`.
To create a state call the `addState()` method on the database instance. Calling `addState` multiple times will automatically de-duplicated and only create a single RxState object.

```javascript
import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

// first add the RxState plugin to RxDB
import { RxDBStatePlugin } from 'rxdb/plugins/state';
addRxPlugin(RxDBStatePlugin);

const database = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
});

// create a state instance
const myState = await database.addState();

// you can also create states with a given namespace
const myChildState = await database.addState('myNamepsace');
```

## Writing data and Persistence

Writing data to the state happen by a so called `modifier`. It is a simple JavaScript function that gets the current value as input and returns the new, modified value.

For example to increase the value of `myField` by one, you would use a modifier that increases the current value: 
```ts
// initially set value to zero
await myState.set('myField', v => 0);

// increase value by one
await myState.set('myField', v => v + 1);

// update value to be 42
await myState.set('myField', v => 42);
```

The modifier is used instead of a direct assignment to ensure correct behavior when other JavaScript realms write to the state at the same time, like other browser tabs or webworkers. On conflicts, the modifier will just be run again to ensure deterministic and correct behavior. Therefore mutation is `async`, you have to `await` the call to the set function when you care about the moment when the change actually happened.


## Get State Data

The state stored inside of a RxState instance can be seen as a big single JSON object that contains all data.
You can fetch the whole object or partially get a single properties or nested ones.
Fetching data can either happen with the `.get()` method or by accessing the field directly like `myRxState.myField`. 

```ts
// get root state data
const val = myState.get();

// get single property
const val = myState.get('myField');
const val = myState.myField;

// get nested property
const val = myState.get('myField.childfield');
const val = myState.myField.childfield;

// get nested array property
const val = myState.get('myArrayField[0].foobar');
const val = myState.myArrayField[0].foobar;
```

## Observability

Instead of fetching the state once, you can also observe the state with either rxjs observables or [custom reactivity handlers](#rxstate-with-signals-and-hooks) like signals or hooks.

Rxjs observables can be created by either using the `.get$()` method or by accessing the top level property suffixed with a dollar sign like `myState.myField$`.

```ts
const observable = myState.get$('myField');
const observable = myState.myField$;

// then you can subscribe to that observable
observable.subscribe(newValue => {
    // update the UI
});
```
Subscription works across multiple JavaScript realms like browser tabs or Webworkers.

## RxState with signals and hooks

With the double-dollar sign you can also access [custom reactivity](./reactivity.md) instances like signals or hooks. These are easier to use compared to rxjs, depending on which JavaScript framework you are using.

For example in angular to use signals, you would first add a reactivity factory to your database and then access the signals of the RxState:

```ts
import { RxReactivityFactory, createRxDatabase } from 'rxdb/plugins/core';
import { toSignal } from '@angular/core/rxjs-interop';
const reactivityFactory: RxReactivityFactory<ReactivityType> = {
    fromObservable(obs, initialValue) {
        return toSignal(obs, { initialValue });
    }
};
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: reactivityFactory
});
const myState = await database.addState();

const mySignal = myState.get$$('myField');
const mySignal = myState.myField$$;
```


## Cleanup RxState operations

For faster writes, changes to the state are only written as list of operations to disc. After some time you might have too
many operations written which would delay the initial state creation. To automatically merge the state operations into a single operation and clear the old operations, you should add the [Cleanup Plugin](./cleanup.md) before creating the [RxDatabase](./rx-database.md):

```ts
import { addRxPlugin } from 'rxdb';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';
addRxPlugin(RxDBCleanupPlugin);
```

## Correctness over Performance

RxState is optimized for correctness, not for performance. Compared to other state libraries, RxState directly persists data to storage and ensures write conflicts are handled properly. Other state libraries are handles mainly in-memory and lazily persist to disc without caring about conflicts or multiple browser tabs which can cause problems and hard to reproduce bugs.

RxState still uses RxDB which has a range of [great performing storages](./rx-storage-performance.md) so the write speed is more than sufficient. Also to further improve write performance you can use more RxState instances (with an different namespace) to split writes across multiple storage instances.

Reads happen directly in-memory which makes RxState read performance comparable to other state libraries.

## RxState Replication

Because the state data is stored inside of an internal [RxCollection](./rx-collection.md) you can easily use the [RxDB Replication](./replication.md) to sync data between users or devices of the same user.

For example with the [P2P WebRTC replication](./replication-webrtc.md) you can start the replication on the collection and automatically sync the RxState operations between users directly:

```ts
import {
    replicateWebRTC,
    getConnectionHandlerSimplePeer
} from 'rxdb/plugins/replication-webrtc';

const database = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageLocalstorage(),
});

const myState = await database.addState();

const replicationPool = await replicateWebRTC(
    {
        collection: myState.collection,
        topic: 'my-state-replication-pool',
        connectionHandlerCreator: getConnectionHandlerSimplePeer({}),
        pull: {},
        push: {}
    }
);
```

# RxState

RxState is a flexible state library build on top of the [RxDB Database](https://rxdb.info/). While RxDB stores similar documents inside of collections, RxState can store any complex JSON data without having a predefined schema.

The state is automatically persisted through RxDB and states changes are propagated between browser tabs. Even setting up replication is simple by using the RxDB [Replication feature](./replication.md).

## Creating a RxState

A `RxState` instance is created on top of a [RxDatabase](./rx-database.md). The state will automatically be persisted with the [storage](./rx-storage.md) that was used when setting up the RxDatabase.
To create a state call the `addState()` method on the database instance. Calling `addState` multiple times will automatically de-duplicated and only create a single RxState object.

```javascript
import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

const database = await createRxDatabase({
  name: 'heroesdb',
  storage: getRxStorageDexie(),
});

// create a state instance
const myState = await database.addState();

// you can also create sub-states with a given name
const myChildState = await database.addState('myChildName');
```

## Writing data and Persistense

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
    storage: getRxStorageDexie(),
    reactivity: reactivityFactory
});
const myState = await database.addState();

const mySignal = myState.get$$('myField');
const mySignal = myState.myField$$;
```


## Correctness over Performance


## RxState Replication

## Limitations

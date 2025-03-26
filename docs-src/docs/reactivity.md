---
title: Signals & Custom Reactivity with RxDB
slug: reactivity.html
description: Level up reactivity with Angular signals, Vue refs, or Preact signals in RxDB. Learn how to integrate custom reactivity to power your dynamic UI.
---

# Signals & Co. - Custom reactivity adapters instead of RxJS Observables

RxDB internally uses the [rxjs library](https://rxjs.dev/) for observables and streams. All functionalities of RxDB like [query](./rx-query.md#observe) results or [document fields](./rx-document.md#observe) that expose values that change over time return a rxjs `Observable` that allows you to observe the values and update your UI accordingly depending on the changes to the database state.

However there are many reasons to use other reactivity libraries that use a different datatype to represent changing values. For example when you use **signals** in angular or react, the **template refs** of vue or state libraries like MobX and redux.

RxDB allows you to pass a custom reactivity factory on [RxDatabase](./rx-database.md) creation so that you can easily access values wrapped with your custom datatype in a convenient way.


## Adding a custom reactivity factory (in angular projects)

If you have an angular project, to get custom reactivity objects out of RxDB, you have to pass a `RxReactivityFactory` during database creation. The `RxReactivityFactory` has the `fromObservable()` method that creates your custom reactivity object based on an observable and an initial value.

For example to use signals in angular, you can use the angular [toSignal](https://angular.io/api/core/rxjs-interop/toSignal) function:

```ts
import { RxReactivityFactory } from 'rxdb/plugins/core';
import { Signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

export function createReactivityFactory(injector: Injector): RxReactivityFactory<Signal<any>> {
  return {
    fromObservable(observable$, initialValue: any) {
      return untracked(() =>
        toSignal(observable$, {
          initialValue,
          injector,
          rejectErrors: true
        })
      );
    }
  };
}
```

Then you can pass this factory when you create the [RxDatabase](./rx-database.md):

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: createReactivityFactory(inject(Injector))
});
```

An example of how signals are used in angular with RxDB, can be found at the [RxDB Angular Example](https://github.com/pubkey/rxdb/tree/master/examples/angular/src/app/components/heroes-list)

## Adding reactivity for other Frameworks

When adding custom reactivity for other JavaScript frameworks or libraries, make sure to correctly unsubscribe whenever you call `observable.subscribe()` in the `fromObservable()` method.

There are also some [👑 Premium Plugins](/premium/) that can be used with other (non-angular frameworks):

### Vue Shallow Refs

```ts
// npm install vue --save
import { VueRxReactivityFactory } from 'rxdb-premium/plugins/reactivity-vue';
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: VueRxReactivityFactory
});
```

### Preact Signals

```ts
// npm install @preact/signals-core --save
import { PreactSignalsRxReactivityFactory } from 'rxdb-premium/plugins/reactivity-preact-signals';
import { createRxDatabase } from 'rxdb/plugins/core';
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: PreactSignalsRxReactivityFactory
});
```


## Accessing custom reactivity objects

All observable data in RxDB is marked by the single dollar sign `$` like `RxCollection.$` for events or `RxDocument.myField$` to get the observable for a document field. To make custom reactivity objects distinguable, they are marked with double-dollar signs `$$` instead. Here are some example on how to get custom reactivity objects from RxDB specific instances:

```ts
// RxDocument
const signal = myRxDocument.get$$('foobar'); // get signal that represents the document field 'foobar'
const signal = myRxDocument.foobar$$; // same as above
const signal = myRxDocument.$$; // get signal that represents whole document over time
const signal = myRxDocument.deleted$$; // get signal that represents the deleted state of the document
```

```ts
// RxQuery
const signal = collection.find().$$; // get signal that represents the query result set over time
const signal = collection.findOne().$$; // get signal that represents the query result set over time
```

```ts
// RxLocalDocument
const signal = myRxLocalDocument.$$; // get signal that represents the whole local document state
const signal = myRxLocalDocument.get$$('foobar'); // get signal that represents the foobar field
```

## Limitations

- TypeScript typings are not fully implemented, make a PR if something is missing or not working for you.
- Currently not all observables things in RxDB are implemented to work with custom reactivity. Please make a PR if you have the need for any missing one.

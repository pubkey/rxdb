---
title: Signals & Custom Reactivity with RxDB
slug: reactivity.html
description: Level up reactivity with Angular signals, Vue refs, or Preact signals in RxDB. Learn how to integrate custom reactivity to power your dynamic UI.
image: /headers/reactivity.jpg
---

import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';

# Signals & Co. - Custom reactivity adapters instead of RxJS Observables

RxDB internally uses the [rxjs library](https://rxjs.dev/) for observables and streams. All functionalities of RxDB like [query](./rx-query.md#observe) results or [document fields](./rx-document.md#observe) that expose values that change over time return a rxjs `Observable` that allows you to observe the values and update your UI accordingly depending on the changes to the database state.

However there are many reasons to use other reactivity libraries that use a different datatype to represent changing values. For example when you use **signals** in angular or react, the **template refs** of vue or state libraries like MobX and redux.

RxDB allows you to pass a custom reactivity factory on [RxDatabase](./rx-database.md) creation so that you can easily access values wrapped with your custom datatype in a convenient way.


## Adding a reactivity factory


<Tabs>

### Angular

In angular we use [Angular Signals](https://angular.dev/guide/signals) as custom reactivity objects.

<Steps>

#### Import

```ts
import { createReactivityFactory } from 'rxdb/plugins/reactivity-angular';
import { Injectable, inject } from '@angular/core';
```

#### Set the reactivity factory

Set the factory as `reactivity` option when calling `createRxDatabase`.

```ts
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: createReactivityFactory(inject(Injector))
});

// add collections/sync etc...
```

#### Use the Signal in an Angular component

```ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DbService } from '../db.service';

@Component({
  selector: 'app-todos-list',
  standalone: true,
  imports: [CommonModule],
  template: `
      <ul>
        <li
          *ngFor="let t of todosSignal();"
        >{{ t.title }}</li>
      </ul>
  `,
})
export class TodosListComponent {
  private dbService = inject(DbService);

  // RxDB query - Angular Signal
  readonly todosSignal = this.dbService.db.todos.find().$$;
}

```

</Steps>

An example of how signals are used in angular with RxDB, can be found at the [RxDB Angular Example](https://github.com/pubkey/rxdb/blob/master/examples/angular/src/app/components/heroes-list/heroes-list.component.ts#L46)

### React

For React, we use the [Preact Signals](https://preactjs.com/guide/v10/signals/) for custom reactivity.

<Steps>

#### Install Preact Signals

```bash
npm install @preact/signals-core --save
```

#### Import

```ts
import {
  PreactSignalsRxReactivityFactory
} from 'rxdb/plugins/reactivity-preact-signals';
```

#### Set the reactivity factory

```ts
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: PreactSignalsRxReactivityFactory
});

// add collections/sync etc...
```

#### Use the Signal in a React component

```tsx
import { useEffect, useState } from 'preact/hooks';
import { getDatabase } from './db';

export function TodosList() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    getDatabase().then(setDb);
  }, []);

  if (!db) return null;

  // RxQuery -> Preact Signal
  const todosSignal = db.todos.find().$$;

  return (
    <ul>
      {todosSignal.value.map((doc: any) => (
        <li key={doc.primary}>
            {doc.title}
        </li>
      ))}
    </ul>
  );
}
```

</Steps>


### Vue

For Vue, we use the [Vue Shallow Refs](https://vuejs.org/api/reactivity-advanced) for custom reactivity.

<Steps>

#### Import
```ts
import { VueRxReactivityFactory } from 'rxdb/plugins/reactivity-vue';
```

#### Set the reactivity factory

```ts
const database = await createRxDatabase({
    name: 'mydb',
    storage: getRxStorageLocalstorage(),
    reactivity: VueRxReactivityFactory
});

// add collections/sync etc...
```

#### Use the Shallow Ref in a Vue component

```html
<script setup lang="ts">
import { getDatabase } from './db';

const db = getDatabase();

// RxQuery to Vue shallowRef signal
const todosSignal = db.todos.find().$$;
</script>

<template>
  <ul>
    <li v-for="t in todosSignal" :key="t.primary">
      <label>{{ t.title }}</label>
    </li>
  </ul>
</template>
```

</Steps>


</Tabs>

## Accessing custom reactivity objects

All observable data in RxDB is marked by the single dollar sign `$` like [RxCollection](./rx-collection.md).$ for events or `RxDocument.myField$` to get the observable for a document field. To make custom reactivity objects distinguable, they are marked with double-dollar signs `$$` instead. Here are some example on how to get custom reactivity objects from RxDB specific instances:

```ts
// RxDocument

// get signal that represents the document field 'foobar'
const signal = myRxDocument.get$$('foobar');

// same as above
const signal = myRxDocument.foobar$$;

// get signal that represents whole document over time
const signal = myRxDocument.$$;

// get signal that represents the deleted state of the document
const signal = myRxDocument.deleted$$;
```

```ts
// RxQuery

// get signal that represents the query result set over time
const signal = collection.find().$$;

// get signal that represents the query result set over time
const signal = collection.findOne().$$;
```

```ts
// RxLocalDocument

// get signal that represents the whole local document state
const signal = myRxLocalDocument.$$;

// get signal that represents the foobar field
const signal = myRxLocalDocument.get$$('foobar');
```

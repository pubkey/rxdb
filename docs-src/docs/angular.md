---
title: Angular RxDB Integration with Signals and Observables
slug: angular.html
description: Learn how to use RxDB in Angular. Create the database in a service, render queries as Angular Signals, and use observables with the async pipe.
image: /headers/angular.jpg
---

import {Steps} from '@site/src/components/steps';
import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';
import {Faq, FaqItem} from '@site/src/components/faq';

# <HeadlineWithIcon h1 icon={<img src="/files/icons/angular.svg" alt="Angular" />}>Using RxDB with Angular</HeadlineWithIcon>

RxDB works in **Angular** out of the box because both are built on [RxJS](https://rxjs.dev/). Each [RxQuery](./rx-query.md) and each [RxDocument](./rx-document.md) exposes an observable that you can render with the `async` pipe. With the `reactivity-angular` plugin, the same values are also available as [Angular Signals](https://angular.dev/guide/signals).

This page shows how to create the [RxDatabase](./rx-database.md) in an Angular service and how to read and write data in components. The same code runs in the browser, in [Ionic](./articles/ionic-database.md), and in [Capacitor](./capacitor-database.md) apps. Only the [storage](./rx-storage.md) differs between these platforms.

## General Concept

The database is created once, before the app renders, and is then handed to the components through a service. Components never create or configure the database. They only consume it.

There are two ways to bind RxDB data to a template:

- **Signals**: The `reactivity-angular` plugin converts each observable into a `Signal`. Reactive values are accessed with a double dollar sign like `query.$$` or `document.name$$`.
- **Observables**: Each reactive value has a single dollar sign variant like `query.$` which returns an RxJS `Observable` for the `async` pipe.

Both ways can be used at the same time in the same component.

## Usage

<Steps>

### Installation

Install RxDB and RxJS into your Angular project:

```bash
npm install rxdb rxjs
```

### Create the Database Service

Create the database in an init function and expose it through an injectable service. The reactivity factory needs the Angular `Injector`, so `inject(Injector)` has to be called before the first `await` while the injection context is still active.

```ts
// database.service.ts
import { Injectable, Injector, inject } from '@angular/core';
import { createRxDatabase } from 'rxdb';
import type { RxCollection, RxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { createReactivityFactory } from 'rxdb/plugins/reactivity-angular';
import type {
    AngularSignalReactivityLambda
} from 'rxdb/plugins/reactivity-angular';

export type TodoDocType = {
    id: string;
    name: string;
    done: boolean;
    dueAt: string;
    priority: number;
};

const todoSchema = {
    title: 'todo schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        done: { type: 'boolean', default: false },
        dueAt: { type: 'string', format: 'date-time', maxLength: 30 },
        priority: { type: 'integer', minimum: 0, maximum: 10, multipleOf: 1 }
    },
    required: ['id', 'name', 'done', 'dueAt', 'priority'],
    indexes: ['dueAt']
} as const;

// The Reactivity type parameter makes $$ return a typed Signal.
export type MyCollections = {
    todos: RxCollection<
        TodoDocType, {}, {}, {}, AngularSignalReactivityLambda
    >;
};
export type MyDatabase = RxDatabase<
    MyCollections, any, any, AngularSignalReactivityLambda
>;

let myDatabase: MyDatabase;

export async function initDatabase() {
    // must run before the first await
    const injector = inject(Injector);

    myDatabase = await createRxDatabase<
        MyCollections, any, any, AngularSignalReactivityLambda
    >({
        name: 'mydatabase',
        storage: getRxStorageLocalstorage(),
        reactivity: createReactivityFactory(injector)
    });
    await myDatabase.addCollections({
        todos: {
            schema: todoSchema
        }
    });

    /**
     * Start the replication
     * or add middleware hooks here.
     */
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
    get db(): MyDatabase {
        return myDatabase;
    }
}
```

### Initialize the Database on App Start

Run `initDatabase()` in an app initializer. Angular waits for the returned promise before it renders the first component, so each component can use the database without a loading check.

```ts
// app.config.ts
import { ApplicationConfig, provideAppInitializer } from '@angular/core';
import { initDatabase } from './database.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideAppInitializer(() => initDatabase())
    ]
};
```

### Render a Query with Signals

Access the `$$` property of a query to get a `Signal` with the query results. The signal updates each time a matching document is inserted, updated, or deleted. The value is `undefined` until the query has emitted its first result.

```ts
// todo-list.component.ts
import { Component, inject } from '@angular/core';
import { DatabaseService } from './database.service';

@Component({
    selector: 'todo-list',
    template: `
        @if (todos(); as list) {
            <ul>
                @for (todo of list; track todo.id) {
                    <li>{{ todo.name }}</li>
                }
            </ul>
            <span>Open todos: {{ openCount() }}</span>
        } @else {
            <span>Loading...</span>
        }
    `
})
export class TodoListComponent {
    private dbService = inject(DatabaseService);

    // Signal<RxDocument[]>
    readonly todos = this.dbService.db.todos.find({
        selector: {},
        sort: [{ dueAt: 'asc' }]
    }).$$;

    // Signal<number>
    readonly openCount = this.dbService.db.todos.count({
        selector: { done: false }
    }).$$;
}
```

The signals are bound to the injector that was passed to `createReactivityFactory()`. This is why they also work with `ChangeDetectionStrategy.OnPush` and in zoneless applications.

### Render a Query with Observables

Instead of signals you can use the observable of the query together with the `async` pipe. The pipe subscribes when the component is created and unsubscribes when it is destroyed.

```ts
// todo-list-observable.component.ts
import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { DatabaseService } from './database.service';

@Component({
    selector: 'todo-list-observable',
    imports: [AsyncPipe],
    template: `
        <ul>
            @for (todo of todos$ | async; track todo.id) {
                <li>{{ todo.name }}</li>
            }
        </ul>
    `
})
export class TodoListObservableComponent {
    private dbService = inject(DatabaseService);

    // Observable<RxDocument[]>
    readonly todos$ = this.dbService.db.todos.find({
        selector: {},
        sort: [{ dueAt: 'asc' }]
    }).$;
}
```

### Write Data

Writes are done with the normal [RxCollection](./rx-collection.md) and RxDocument methods. Each query that is affected by the write emits a new result, so the templates update without any additional code.

```ts
// insert a document
await this.dbService.db.todos.insert({
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    dueAt: '2026-01-01T10:00:00.000Z',
    priority: 8
});

// update a document
await todo.incrementalPatch({ done: true });

// delete a document
await todo.remove();
```

</Steps>

## Signals for Single Documents and Fields

Signals are not limited to queries. An RxDocument exposes a signal for the whole document, for each field, and for its deleted state. This is useful for detail views and edit forms.

```ts
const todo = await this.dbService.db.todos.findOne('todo1').exec(true);

// Signal with the latest state of the document
const todoSignal = todo.$$;

// Signal<string> with the value of a single field
const nameSignal = todo.name$$;

// Signal<boolean> that is true after the document was deleted
const deletedSignal = todo.deleted$$;
```

A `findOne()` query also has a `$$` property. Its signal contains the document or `null` when no document matches. All available reactive getters are listed in the [custom reactivity documentation](./reactivity.md#accessing-custom-reactivity-objects).

## Replication Status

An [RxReplicationState](./replication.md) exposes observables like `active$` and `error$`. Convert them with `toSignal()` from `@angular/core/rxjs-interop` to show a sync indicator.

```ts
import { Component, input, computed } from '@angular/core';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import type { RxReplicationState } from 'rxdb/plugins/replication';

@Component({
    selector: 'sync-indicator',
    template: `<span>{{ label() }}</span>`
})
export class SyncIndicatorComponent {
    readonly replicationState = input.required<RxReplicationState<any, any>>();

    private readonly active = toSignal(
        toObservable(this.replicationState).pipe(
            switchMap(state => state.active$)
        ),
        { initialValue: false }
    );

    readonly label = computed(() => this.active() ? 'Syncing...' : 'Idle');
}
```

## Server-Side Rendering

RxDB also runs during Angular server-side rendering. On the server there is no IndexedDB or localStorage, so you have to use the [memory storage](./rx-storage-memory.md) there and skip the replication. The [RxDB Angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular) switches the storage through the Angular environment files.

## FAQ

<Faq>
<FaqItem question="Does RxDB work with Angular Signals?">

Yes. The `reactivity-angular` plugin of **[RxDB](./rx-database.md)** converts each observable value into an Angular `Signal`. You get the signal with the double dollar sign, for example `collection.find().$$` or `document.name$$`. The plugin uses `toSignal()` from `@angular/core/rxjs-interop` under the hood.

</FaqItem>
<FaqItem question="Do I need NgZone or zone.js to use RxDB in Angular?">

No. Signals from the **[reactivity plugin](./reactivity.md)** notify Angular directly and the `async` pipe marks the component for check on each emit. Both work in zoneless applications and with `ChangeDetectionStrategy.OnPush`.

</FaqItem>
<FaqItem question="Where should I create the RxDB database in an Angular app?">

Create it once in an app initializer with `provideAppInitializer()` and expose it through an injectable service. Do not create the **[RxDatabase](./rx-database.md)** inside of a component, because components are created and destroyed many times while the database must exist only once.

</FaqItem>
<FaqItem question="Which RxDB storage should I use in Angular?">

For a quick start in the browser use the **[localStorage RxStorage](./rx-storage-localstorage.md)**. For bigger datasets use the [IndexedDB RxStorage](./rx-storage-indexeddb.md) or the [OPFS RxStorage](./rx-storage-opfs.md). In Ionic and Capacitor apps the [SQLite RxStorage](./rx-storage-sqlite.md) is the recommended choice.

</FaqItem>
</Faq>

## Follow Up

- The [RxDB Angular example](https://github.com/pubkey/rxdb/tree/master/examples/angular) contains a full application with signals, observables, replication, and server-side rendering.
- Read how [signals and custom reactivity](./reactivity.md) work in RxDB.
- Learn why RxDB fits Angular apps in the [Angular database article](./articles/angular-database.md) and how it compares to plain IndexedDB in [IndexedDB in Angular](./articles/angular-indexeddb.md).
- RxDB also has integrations for [React](./react.md), [Vue](./vue.md), and [Svelte](./svelte.md).
- Start with the [RxDB Quickstart](./quickstart.md).

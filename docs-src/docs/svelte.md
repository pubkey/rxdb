---
title: Svelte RxDB Integration with Stores and Runes
slug: svelte.html
description: Learn how to use RxDB in Svelte 5. Render queries with the store syntax, bind results to runes, and write data from your Svelte components.
image: /headers/svelte.jpg
---

import {Steps} from '@site/src/components/steps';
import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';
import {Faq, FaqItem} from '@site/src/components/faq';

# <HeadlineWithIcon h1 icon={<img src="/files/icons/svelte.svg" alt="Svelte" />}>Using RxDB with Svelte</HeadlineWithIcon>

RxDB works in **Svelte** without an additional plugin. Each [RxQuery](./rx-query.md) and each [RxDocument](./rx-document.md) exposes an RxJS observable, and Svelte accepts an observable wherever it accepts a store. This means you can prefix an RxDB observable with `$` in a component and Svelte subscribes, re-renders, and unsubscribes for you.

This page shows how to create the [RxDatabase](./rx-database.md), provide it to your components, and read and write data with the store syntax and with Svelte 5 runes. The same code runs in the browser, in [Capacitor](./capacitor-database.md), and in Tauri apps. Only the [storage](./rx-storage.md) differs between these platforms.

## General Concept

RxDB is internally reactive and emits changes via RxJS observables. All observables in RxDB are marked with a dollar sign at the end, like `query.$` or `document.name$`.

The [Svelte store contract](https://svelte.dev/docs/svelte/stores#Store-contract) requires an object with a `subscribe()` method and explicitly allows that method to return an object with `unsubscribe()` for interoperability with RxJS. An RxDB observable fulfills this contract. When you write `$todos` in a component, Svelte subscribes to the `todos` observable and ends the subscription when the component is destroyed.

There are two ways to bind RxDB data to a component:

- **Store syntax**: Reference the observable with the `$` prefix. This is the shortest way and needs no cleanup code.
- **Runes**: Subscribe inside of an `$effect` and write the results into `$state`. Use this when you want to process the results before rendering or when you work in a `.svelte.ts` module.

## Usage

<Steps>

### Installation

Install RxDB and RxJS into your Svelte project:

```bash
npm install rxdb rxjs
```

### Create the Database

Create the database in its own module, outside of your components. Components should never create or configure the database. They should only consume it.

```ts
// database.ts
import { createRxDatabase } from 'rxdb';
import type { RxCollection, RxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

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

export type MyCollections = {
    todos: RxCollection<TodoDocType>;
};
export type MyDatabase = RxDatabase<MyCollections>;

export async function createDatabase(): Promise<MyDatabase> {
    const myDatabase = await createRxDatabase<MyCollections>({
        name: 'mydatabase',
        storage: getRxStorageLocalstorage()
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

    return myDatabase;
}
```

### Provide the Database to the App

Wait for the database before you mount the app and pass it to the root component. The root component puts it into the Svelte context so that each child component can access it without a loading check.

```ts
// main.ts
import { mount } from 'svelte';
import App from './App.svelte';
import { createDatabase } from './database';

const myDatabase = await createDatabase();

mount(App, {
    target: document.getElementById('app')!,
    props: { myDatabase }
});
```

```svelte
<!-- App.svelte -->
<script lang="ts">
    import { setContext } from 'svelte';
    import type { MyDatabase } from './database';
    import TodoList from './TodoList.svelte';

    let { myDatabase }: { myDatabase: MyDatabase } = $props();
    setContext('myDatabase', myDatabase);
</script>

<TodoList />
```

### Render a Query with the Store Syntax

Store the observable of a query in a variable and reference it with the `$` prefix. The component re-renders each time a matching document is inserted, updated, or deleted. The value is `undefined` until the query has emitted its first result.

```svelte
<!-- TodoList.svelte -->
<script lang="ts">
    import { getContext } from 'svelte';
    import type { MyDatabase } from './database';

    const myDatabase = getContext<MyDatabase>('myDatabase');

    // Observable<RxDocument[]>
    const todos = myDatabase.todos.find({
        selector: {},
        sort: [{ dueAt: 'asc' }]
    }).$;

    // Observable<number>
    const openCount = myDatabase.todos.count({
        selector: { done: false }
    }).$;
</script>

{#if $todos === undefined}
    <span>Loading...</span>
{:else}
    <ul>
        {#each $todos as todo (todo.id)}
            <li>{todo.name}</li>
        {/each}
    </ul>
    <span>Open todos: {$openCount}</span>
{/if}
```

No manual subscription or cleanup code is required. Svelte ends the subscription when the component is destroyed.

### Render a Query with Runes

When you want to keep the query results in `$state`, subscribe to the observable inside of an `$effect`. The function that is returned from the effect runs when the component is destroyed, so the subscription is cleaned up there.

```svelte
<!-- TodoListRunes.svelte -->
<script lang="ts">
    import { getContext } from 'svelte';
    import type { RxDocument } from 'rxdb';
    import type { MyDatabase, TodoDocType } from './database';

    const myDatabase = getContext<MyDatabase>('myDatabase');

    let todos = $state.raw<RxDocument<TodoDocType>[]>([]);
    let loading = $state(true);

    $effect(() => {
        const subscription = myDatabase.todos
            .find({
                selector: { done: false },
                sort: [{ dueAt: 'asc' }]
            })
            .$.subscribe(result => {
                todos = result;
                loading = false;
            });
        return () => subscription.unsubscribe();
    });
</script>

{#if loading}
    <span>Loading...</span>
{:else}
    <ul>
        {#each todos as todo (todo.id)}
            <li>{todo.name}</li>
        {/each}
    </ul>
{/if}
```

Use `$state.raw()` for query results. RxDocuments are class instances with their own change tracking, so they must not be wrapped into the deep proxies of `$state()`.

### Write Data

Writes are done with the normal [RxCollection](./rx-collection.md) and RxDocument methods. Each query that is affected by the write emits a new result, so the components update without any additional code.

```svelte
<!-- TodoInsert.svelte -->
<script lang="ts">
    import { getContext } from 'svelte';
    import type { MyDatabase } from './database';

    const myDatabase = getContext<MyDatabase>('myDatabase');
    let name = $state('');

    async function addTodo(event: SubmitEvent) {
        event.preventDefault();
        await myDatabase.todos.insert({
            id: 'todo-' + Date.now(),
            name,
            done: false,
            dueAt: new Date().toISOString(),
            priority: 5
        });
        name = '';
    }
</script>

<form onsubmit={addTodo}>
    <input bind:value={name} placeholder="What has to be done" />
    <button type="submit">Add</button>
</form>
```

To change or delete a document, call the methods of the RxDocument from the query result:

```ts
// update a document
await todo.incrementalPatch({ done: true });

// delete a document
await todo.remove();
```

</Steps>

## Single Documents and Fields

The store syntax is not limited to queries. A `findOne()` query emits a single document or `null`, and an RxDocument has observables for the whole document and for each field. This is useful for detail views and edit forms.

```svelte
<!-- TodoDetail.svelte -->
<script lang="ts">
    import { getContext } from 'svelte';
    import type { MyDatabase } from './database';

    let { todoId }: { todoId: string } = $props();
    const myDatabase = getContext<MyDatabase>('myDatabase');

    // Observable<RxDocument | null>
    const todo = myDatabase.todos.findOne(todoId).$;
</script>

{#if $todo}
    <span>{$todo.name} (priority {$todo.priority})</span>
{/if}
```

When you already have an RxDocument, you can get observables from it directly:

```ts
// Observable with the latest state of the document
const todo$ = todo.$;

// Observable<string> with the value of a single field
const name$ = todo.name$;

// Observable<boolean> that emits true after the document was deleted
const deleted$ = todo.deleted$;
```

## Replication Status

An [RxReplicationState](./replication.md) exposes observables like `active$` and `error$`. Because they are observables, they also work with the store syntax and you can use them to show a sync indicator.

```svelte
<!-- SyncIndicator.svelte -->
<script lang="ts">
    import type { RxReplicationState } from 'rxdb/plugins/replication';

    let { replicationState }: {
        replicationState: RxReplicationState<any, any>
    } = $props();

    const active = replicationState.active$;
</script>

<span>{$active ? 'Syncing...' : 'Idle'}</span>
```

## SvelteKit and Server-Side Rendering

The browser storages of RxDB need APIs like IndexedDB or localStorage, which do not exist on the server. In a SvelteKit app, create the database only in the browser, for example inside of `onMount()`, or disable server-side rendering for the routes that use RxDB with `export const ssr = false`.

## FAQ

<Faq>
<FaqItem question="Does RxDB work with Svelte 5 and runes?">

Yes. **[RxDB](./rx-database.md)** observables work with the `$` store syntax in Svelte 5 components, and you can also subscribe inside of an `$effect` and write the results into `$state.raw()`. The RxDB Svelte example runs on Svelte 5.

</FaqItem>
<FaqItem question="Do I need a plugin to use RxDB with Svelte?">

No. Svelte accepts RxJS observables as stores, so the observables of an **[RxQuery](./rx-query.md)** or an RxDocument can be used directly with the `$` prefix. There is no Svelte-specific RxDB package to install.

</FaqItem>
<FaqItem question="Do I have to unsubscribe from RxDB queries in Svelte components?">

No, not when you use the `$` store syntax. Svelte subscribes when the component is created and unsubscribes when it is destroyed. You only have to unsubscribe yourself when you call `.subscribe()` on an observable, which is done by returning a cleanup function from the `$effect`.

</FaqItem>
<FaqItem question="Which RxDB storage should I use in Svelte?">

For a quick start in the browser use the **[localStorage RxStorage](./rx-storage-localstorage.md)**. For bigger datasets use the [IndexedDB RxStorage](./rx-storage-indexeddb.md) or the [OPFS RxStorage](./rx-storage-opfs.md). In Capacitor and Tauri apps the [SQLite RxStorage](./rx-storage-sqlite.md) is the recommended choice.

</FaqItem>
</Faq>

## Follow Up

- The [RxDB Svelte example](https://github.com/pubkey/rxdb/tree/master/examples/svelte) contains a full note-taking application that runs on Svelte 5.
- Read how [signals and custom reactivity](./reactivity.md) work in RxDB when you want to use a different reactive primitive.
- RxDB also has integrations for [React](./react.md), [Angular](./angular.md), and [Vue](./vue.md).
- Start with the [RxDB Quickstart](./quickstart.md).

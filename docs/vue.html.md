# Vue RxDB Integration with Refs and the Composition API

> Learn how to use RxDB in Vue 3. Provide the database with a plugin, render queries as Vue refs, and write data from components with the Composition API.

import {Steps} from '@site/src/components/steps';
import {HeadlineWithIcon} from '@site/src/components/headline-with-icon';
import {Faq, FaqItem} from '@site/src/components/faq';

# Using RxDB with Vue

RxDB integrates into **Vue** through the `reactivity-vue` plugin. The plugin converts the observables of each [RxQuery](./rx-query.md) and each [RxDocument](./rx-document.md) into Vue refs, so that you can use them in a template like any other reactive state.

This page shows how to create the [RxDatabase](./rx-database.md), provide it to your components with a Vue plugin, and read and write data with the Composition API. The same code runs in the browser, in [Electron](./electron-database.md), and in [Capacitor](./capacitor-database.md) apps. Only the [storage](./rx-storage.md) differs between these platforms.

## General Concept

RxDB is internally reactive and emits changes via RxJS observables. Vue tracks changes through refs. The `reactivity-vue` plugin bridges these two models: reactive values that are accessed with a double dollar sign like `query.$$` or `document.name$$` return a Vue [shallowRef](https://vuejs.org/api/reactivity-advanced.html#shallowref) instead of an observable.

The ref subscribes to the observable when it is created and unsubscribes when the current effect scope is disposed. This means you have to access `$$` inside of `setup()` or `<script setup>`, where Vue ties the subscription to the lifetime of the component.

## Usage

### Installation

Install RxDB and RxJS into your Vue project:

```bash
npm install rxdb rxjs
```

### Create the Database

Create the database outside of your components and set `VueRxReactivityFactory` as the `reactivity` option. The returned Vue plugin provides the database to all components, and `useDatabase()` injects it.

```ts
// database.ts
import { inject } from 'vue';
import type { Plugin } from 'vue';
import { createRxDatabase } from 'rxdb';
import type { RxCollection, RxDatabase } from 'rxdb';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';
import { VueRxReactivityFactory } from 'rxdb/plugins/reactivity-vue';
import type { VueRefReactivityLambda } from 'rxdb/plugins/reactivity-vue';

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

// The Reactivity type parameter makes $$ return a typed Ref.
export type MyCollections = {
    todos: RxCollection<TodoDocType, {}, {}, {}, VueRefReactivityLambda>;
};
export type MyDatabase = RxDatabase<
    MyCollections, any, any, VueRefReactivityLambda
>;

const KEY_DATABASE = Symbol('database');

export function useDatabase(): MyDatabase {
    return inject(KEY_DATABASE) as MyDatabase;
}

export async function createDatabase(): Promise<Plugin> {
    const myDatabase = await createRxDatabase<
        MyCollections, any, any, VueRefReactivityLambda
    >({
        name: 'mydatabase',
        storage: getRxStorageLocalstorage(),
        reactivity: VueRxReactivityFactory
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

    return {
        install(app) {
            app.provide(KEY_DATABASE, myDatabase);
        }
    };
}
```

### Provide the Database to the App

Wait for the database before you mount the app. This way each component can use the database without a loading check.

```ts
// main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { createDatabase } from './database';

const app = createApp(App);
createDatabase().then(databasePlugin => {
    app.use(databasePlugin).mount('#app');
});
```

### Render a Query

Access the `$$` property of a query to get a ref with the query results. The ref updates each time a matching document is inserted, updated, or deleted. The value is `undefined` until the query has emitted its first result.

```html
<!-- TodoList.vue -->
<script setup lang="ts">
import { useDatabase } from './database';

const myDatabase = useDatabase();

// Ref<RxDocument[]>
const todos = myDatabase.todos.find({
    selector: {},
    sort: [{ dueAt: 'asc' }]
}).$$;

// Ref<number>
const openCount = myDatabase.todos.count({
    selector: { done: false }
}).$$;
</script>

<template>
    <span v-if="!todos">Loading...</span>
    <template v-else>
        <ul>
            <li v-for="todo in todos" :key="todo.id">{{ todo.name }}</li>
        </ul>
        <span>Open todos: {{ openCount }}</span>
    </template>
</template>
```

No manual subscription or cleanup code is required. The subscription ends when the component is unmounted.

### Write Data

Writes are done with the normal [RxCollection](./rx-collection.md) and RxDocument methods. Each query that is affected by the write emits a new result, so the templates update without any additional code.

```html
<!-- TodoInsert.vue -->
<script setup lang="ts">
import { ref } from 'vue';
import { useDatabase } from './database';

const myDatabase = useDatabase();
const name = ref('');

async function addTodo() {
    await myDatabase.todos.insert({
        id: 'todo-' + Date.now(),
        name: name.value,
        done: false,
        dueAt: new Date().toISOString(),
        priority: 5
    });
    name.value = '';
}
</script>

<template>
    <form @submit.prevent="addTodo">
        <input v-model="name" placeholder="What has to be done" />
        <button type="submit">Add</button>
    </form>
</template>
```

To change or delete a document, call the methods of the RxDocument from the query result:

```ts
// update a document
await todo.incrementalPatch({ done: true });

// delete a document
await todo.remove();
```

## Refs for Single Documents and Fields

Refs are not limited to queries. An RxDocument exposes a ref for the whole document, for each field, and for its deleted state. This is useful for detail views and edit forms.

```html
<!-- TodoDetail.vue -->
<script setup lang="ts">
import { useDatabase } from './database';

const props = defineProps<{ todoId: string }>();
const myDatabase = useDatabase();

// Ref with the document, or null when no document matches
const todo = myDatabase.todos.findOne(props.todoId).$$;
</script>

<template>
    <span v-if="todo">{{ todo.name }} (priority {{ todo.priority }})</span>
</template>
```

When you already have an RxDocument, you can get refs from it directly:

```ts
// Ref with the latest state of the document
const todoRef = todo.$$;

// Ref<string> with the value of a single field
const nameRef = todo.name$$;

// Ref<boolean> that is true after the document was deleted
const deletedRef = todo.deleted$$;
```

All available reactive getters are listed in the [custom reactivity documentation](./reactivity.md#accessing-custom-reactivity-objects).

## Using Observables Without the Plugin

The reactivity plugin is optional. Each reactive value also has a single dollar sign variant like `query.$` that returns an RxJS `Observable`. You can subscribe to it and write the results into your own ref. In this case you have to unsubscribe when the component is unmounted.

```html
<script setup lang="ts">
import { shallowRef, onUnmounted } from 'vue';
import type { RxDocument } from 'rxdb';
import { useDatabase } from './database';
import type { TodoDocType } from './database';

const myDatabase = useDatabase();
const todos = shallowRef<RxDocument<TodoDocType>[]>([]);

const subscription = myDatabase.todos
    .find({ selector: { done: false } })
    .$.subscribe(result => {
        todos.value = result;
    });

onUnmounted(() => subscription.unsubscribe());
</script>
```

The same pattern works for the observables of an [RxReplicationState](./replication.md) like `active$` and `error$` when you want to show a sync indicator.

## FAQ

Yes. The `reactivity-vue` plugin of **[RxDB](./rx-database.md)** returns Vue refs for queries, documents, and document fields. You access them with the double dollar sign inside of `<script setup>`, for example `collection.find().$$`, and use them in the template like any other ref.

No, not when you use the `$$` refs of the **[reactivity plugin](./reactivity.md)**. The plugin registers the cleanup with `onScopeDispose()`, so the subscription ends when the component is unmounted. You only have to unsubscribe yourself when you call `.subscribe()` on an observable.

Yes. Pinia and **[RxDB](./rx-database.md)** solve different problems. Keep persistent data in RxDB collections and query it with refs, and use Pinia for temporary UI state like the selected tab or an open dialog. Do not copy query results into a Pinia store, because the RxDB refs are already reactive.

For a quick start in the browser use the **[localStorage RxStorage](./rx-storage-localstorage.md)**. For bigger datasets use the [IndexedDB RxStorage](./rx-storage-indexeddb.md) or the [OPFS RxStorage](./rx-storage-opfs.md). In Capacitor and Electron apps the [SQLite RxStorage](./rx-storage-sqlite.md) is the recommended choice.

## Follow Up

- The [RxDB Vue example](https://github.com/pubkey/rxdb/tree/master/examples/vue) contains a full application with the database plugin, live queries, and replication.
- Read how [signals and custom reactivity](./reactivity.md) work in RxDB.
- Learn why RxDB fits Vue apps in the [Vue database article](./articles/vue-database.md) and how it compares to plain IndexedDB in [IndexedDB in Vue](./articles/vue-indexeddb.md).
- RxDB also has integrations for [React](./react.md), [Angular](./angular.md), and [Svelte](./svelte.md).
- Start with the [RxDB Quickstart](./quickstart.md).

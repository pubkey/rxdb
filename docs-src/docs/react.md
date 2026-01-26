---
title: React
slug: react.html
---

import {Tabs} from '@site/src/components/tabs';
import {Steps} from '@site/src/components/steps';

# React

RxDB provides first-class support for both React and React Native via a dedicated React integration. This integration makes it possible to use RxDB inside functional components using React Context and hooks, without manually subscribing to observables or managing cleanup logic.

The same APIs work in **React** for the web and in [React Native](./react-native-database.md). The only difference between platforms is the storage and environment setup. The React integration itself behaves identically in both.

## General concept

RxDB is internally reactive and emits changes via RxJS observables. React and React Native, however, are render-driven frameworks that rely on component state and hooks. The RxDB React integration bridges these two models by exposing a small set of hooks that translate RxDB state into React renders.

Instead of hiding reactivity behind configuration flags, the integration uses explicit hooks. This makes component behavior predictable, avoids accidental subscriptions, and keeps performance characteristics easy to reason about.


## Usage

<Steps>

### Installation

Install RxDB and React as usual:

```bash
npm install rxdb react react-dom
```

### Database creation

Database creation is not part of the React integration itself. RxDB is created in the same way as in non-React applications, including storage selection, plugins, replication, hooks, and schema definitions.

This separation is intentional. React components should never be responsible for creating or configuring the database. They should only consume it.

```ts
import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';
import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';

async function getDatabase() {
    const db = await createRxDatabase({
        name: 'heroesreactdb',
        storage: getRxStorageLocalstorage()
    });
    await db.addCollections({
        heroes: {
            schema: myRxSchema
        }
    });

    /**
     * Do other stuff here
     * like setting up middleware
     * or starting replication.
     */

    return db;
}
```


### Providing the database

To use RxDB in a React or React Native application, the database instance must be provided via a context. This is done using `RxDatabaseProvider`.

The database itself is created outside of React, usually in a separate module. The provider is only responsible for making the database available to components once it has been initialized.


```tsx
import React, { useEffect, useState } from 'react';
import { RxDatabaseProvider } from 'rxdb/plugins/react';
import { getDatabase } from './Database';


const App = () => {
    const [database, setDatabase] = useState();

    useEffect(() => {
        const initDb = async () => {
            const db = await getDatabase();
            setDatabase(db);
        };
        initDb();
    }, []);

    if (database == null) {
        return <span>
            Loading <a href="https://rxdb.info/react.html">RxDB</a> database...
        </span>;
    }

    return (
        <RxDatabaseProvider database={database}>
            {/* your application */}
        </RxDatabaseProvider>
    );
};

export default App;
```

### Accessing collections

```ts
import { useRxCollection } from 'rxdb/plugins/react';

const collection = useRxCollection('heroes');
```

The hook returns the collection once it becomes available. During the initial render, the value may be `undefined`, so components must handle this case.

This hook does not subscribe to any data. It only provides access to the collection instance.

### Queries

To render query results in your component, use the `useRxQuery` hook. 

```tsx
import { useRxQuery } from 'rxdb/plugins/react';

const query = {
    collection: 'heroes',
    query: {
        selector: {},
        sort: [{ name: 'asc' }]
    }
};

const HeroCount = () => {
    const { results, loading } = useRxQuery(query);

    if (loading) {
        return <span>Loading...</span>;
    }

    return <span>Total heroes: {results.length}</span>;
};
```

The query is executed when the component renders. If the component re-renders, the query may be re-executed, but changes in the underlying data will not automatically trigger updates.

This hook is well suited for static views, server-side rendering, and cases where live updates are not required.

### Live queries

Most React applications require views that automatically update when the database changes. For this purpose, RxDB provides the `useLiveRxQuery` hook.

The hook accepts a query description object and returns the current results together with a loading state.

```tsx
import { useLiveRxQuery } from 'rxdb/plugins/react';

const query = {
    collection: 'heroes',
    query: {
        selector: {},
        sort: [{ name: 'asc' }]
    }
};

const HeroList = () => {
    const { results, loading } = useLiveRxQuery(query);

    if (loading) {
        return <span>Loading...</span>;
    }

    return (
        <ul>
            {results.map(hero => (
                <li key={hero.name}>{hero.name}</li>
            ))}
        </ul>
    );
};
```

The component automatically re-renders whenever the query result changes. Subscriptions are created when the component mounts and are cleaned up automatically when the component unmounts.

The returned documents are fully reactive RxDB documents and can be modified or removed directly.

</Steps>


## React Native compatibility

All hooks and providers described on this page work the same way in React Native. The React integration does not rely on any browser-specific APIs.

The only platform-specific part of a React Native setup is database creation, where a different storage plugin is typically used. Once the database is created, the React integration behaves identically.

## Signals

In addition to the React hooks shown on this page, RxDB also supports alternative reactivity models such as [signals](./reactivity.md#react). RxDB's core reactivity system can be configured to expose reactive values using different primitives instead of RxJS observables, which makes it possible to integrate RxDB with signal-based approaches in React or other frameworks. This is an advanced capability and is independent of the React integration described here. For more details about how RxDB's reactivity system works and how custom reactivity can be configured, see the [Reactivity documentation](./reactivity.md).

## Follow Up

- RxDB includes a full [React example application](https://github.com/pubkey/rxdb/tree/master/examples/react) that demonstrates the patterns described on this page, including database creation outside of React, usage of `RxDatabaseProvider`, and data access via `useRxQuery`, `useLiveRxQuery`, and `useRxCollection.

- A corresponding [React Native example](https://github.com/pubkey/rxdb/tree/master/examples/react-native) is also available and shows the same integration concepts applied in a mobile environment, with only the platform-specific storage and setup differing.

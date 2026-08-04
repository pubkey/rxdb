---
title: 'TanStack DB + GraphQL: Offline-First Sync with RxDB'
slug: tanstack-db-graphql.html
description: Sync TanStack DB with a GraphQL backend using RxDB's GraphQL replication plugin - offline-first, real-time, and typed. A step-by-step integration guide.
image: /headers/tanstack-db-graphql.jpg
---

import {Steps} from '@site/src/components/steps';

# TanStack DB + GraphQL: Offline-First Sync with RxDB

**TanStack DB** is a reactive client store with live queries and optimistic mutations, and it keeps its collections in memory while persistence and networking come from the collection implementation you choose. The official `@tanstack/rxdb-db-collection` package puts [RxDB](https://rxdb.info/) underneath, as described in [TanStack DB + RxDB](./rxdb-collection-for-tanstack-db.md). Because RxDB owns storage and sync, a **TanStack DB GraphQL** setup becomes a configuration task: you run RxDB's [GraphQL replication plugin](../../replication-graphql.md) on the underlying collection and the synced data streams into TanStack DB automatically. This page explains what your GraphQL server must provide, how to set up pull, push, and subscriptions, and how the result wires into `createCollection()` and `useLiveQuery`.

<RxdbLogo alt="TanStack DB GraphQL sync with RxDB" />

## How TanStack DB Talks to GraphQL

It does not, and that is the point. TanStack DB never contacts your backend. The RxDB collection underneath handles storage and replication, and the RxDB [Sync Engine](../../replication.md) needs three endpoints: a pull handler that returns documents changed after a checkpoint, a push handler that accepts local writes and returns conflicts, and an optional pull stream for realtime events. The [GraphQL replication plugin](../../replication-graphql.md) maps these to a GraphQL `Query`, a `Mutation`, and a `Subscription`.

Every document that arrives through replication is written to the local [RxStorage](../../rx-storage.md) first and then streams into the TanStack DB collection through RxDB's change feed. Every local mutation on the TanStack DB collection is persisted to RxDB and pushed to the GraphQL server in the background. Your components only ever see the TanStack DB collection.

## What Your GraphQL Server Must Provide

The [Sync Engine](../../replication.md) has two requirements on the server-side data layout:

- **Documents are deterministically sortable by their last write time.** The common pattern is an `updatedAt` timestamp with the primary key as tiebreaker, and both fields together form the replication checkpoint.
- **Documents are never physically deleted.** Instead a boolean flag like `deleted` is set to `true`, so that deletions can be replicated to other clients. RxDB maps this field to its internal `_deleted` flag through the `deletedField` option.

For a todo app, the matching GraphQL schema looks like this:

```graphql
type Todo {
    id: ID!
    text: String!
    completed: Boolean!
    updatedAt: Float!
    deleted: Boolean!
}
input TodoInput {
    id: ID!
    text: String!
    completed: Boolean!
    updatedAt: Float!
    deleted: Boolean!
}
input CheckpointInput {
    id: String!
    updatedAt: Float!
}
type Checkpoint {
    id: String!
    updatedAt: Float!
}
type TodoPullBulk {
    documents: [Todo]!
    checkpoint: Checkpoint
}
input TodoInputPushRow {
    assumedMasterState: TodoInput
    newDocumentState: TodoInput!
}
# headers are used to authenticate the
# subscription over websockets.
input Headers {
    AUTH_TOKEN: String!
}

type Query {
    pullTodo(checkpoint: CheckpointInput, limit: Int!): TodoPullBulk!
}
type Mutation {
    # Returns a list of all conflicts.
    # If no document write caused a conflict, return an empty list.
    pushTodo(rows: [TodoInputPushRow!]): [Todo]
}
type Subscription {
    streamTodo(headers: Headers): TodoPullBulk!
}
```

The `pullTodo` resolver sorts all documents by `updatedAt` first and `id` second, filters out everything at or before the given checkpoint, returns up to `limit` documents, and builds the new checkpoint from the last returned document. The `pushTodo` resolver compares the `assumedMasterState` of each row with the current server state and returns the conflicting server documents, or an empty list when there are none. A complete server implementation with all three resolvers is in the [GraphQL example project](https://github.com/pubkey/rxdb/tree/master/examples/graphql).

## Setup

<Steps>

### Install the Packages

```bash
npm install rxdb rxjs @tanstack/react-db @tanstack/rxdb-db-collection
```

The GraphQL replication plugin ships inside the `rxdb` package. No extra install is needed.

### Create the Database and Collection

The setup matches the [hub article](./rxdb-collection-for-tanstack-db.md), with an added `updatedAt` field so the server can build checkpoints.

```ts
import { createRxDatabase } from 'rxdb/plugins/core';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

const db = await createRxDatabase({
    name: 'tododb',
    storage: getRxStorageLocalstorage()
});

await db.addCollections({
    todos: {
        schema: {
            title: 'todos',
            version: 0,
            type: 'object',
            primaryKey: 'id',
            properties: {
                id: { type: 'string', maxLength: 100 },
                text: { type: 'string' },
                completed: { type: 'boolean' },
                updatedAt: { type: 'number' }
            },
            required: ['id', 'text', 'completed', 'updatedAt']
        }
    }
});
```

### Write the Pull Query Builder

The `pullQueryBuilder` gets the last checkpoint and a `limit` as input and returns the GraphQL query with its variables.

```ts
const pullQueryBuilder = (checkpoint, limit) => {
    /**
     * The first pull does not have a checkpoint
     * so we fill it up with defaults.
     */
    if (!checkpoint) {
        checkpoint = {
            id: '',
            updatedAt: 0
        };
    }
    const query = `query PullTodo($checkpoint: CheckpointInput, $limit: Int!) {
        pullTodo(checkpoint: $checkpoint, limit: $limit) {
            documents {
                id
                text
                completed
                updatedAt
                deleted
            }
            checkpoint {
                id
                updatedAt
            }
        }
    }`;
    return {
        query,
        operationName: 'PullTodo',
        variables: {
            checkpoint,
            limit
        }
    };
};
```

### Write the Push Query Builder

The push builder receives the changed document rows and returns the mutation that sends them to the server.

```ts
const pushQueryBuilder = rows => {
    const query = `mutation PushTodo($rows: [TodoInputPushRow!]) {
        pushTodo(rows: $rows) {
            id
            text
            completed
            updatedAt
            deleted
        }
    }`;
    return {
        query,
        operationName: 'PushTodo',
        variables: {
            rows
        }
    };
};
```

### Add a Stream Query Builder for Realtime Updates

To receive server changes in realtime through a GraphQL subscription, add a `pullStreamQueryBuilder`. It gets the `headers` of the replication state as input so the websocket connection can be authenticated.

```ts
const pullStreamQueryBuilder = (headers) => {
    const query = `subscription StreamTodo($headers: Headers) {
        streamTodo(headers: $headers) {
            documents {
                id
                text
                completed
                updatedAt
                deleted
            }
            checkpoint {
                id
                updatedAt
            }
        }
    }`;
    return {
        query,
        variables: {
            headers
        }
    };
};
```

### Start the GraphQL Replication

Now start the replication with `replicateGraphQL()`. Notice that the subscription runs over a separate websocket url.

```ts
import { replicateGraphQL } from 'rxdb/plugins/replication-graphql';

const replicationState = replicateGraphQL({
    collection: db.todos,
    // urls to the GraphQL endpoints
    url: {
        http: 'https://example.com/graphql',
        // The websocket has to use a different url.
        ws: 'wss://example.com/subscriptions'
    },
    pull: {
        queryBuilder: pullQueryBuilder,
        streamQueryBuilder: pullStreamQueryBuilder,
        // must equal the limit used in the pullTodo() resolver
        batchSize: 50
    },
    push: {
        queryBuilder: pushQueryBuilder,
        batchSize: 50
    },
    // headers which will be used in http requests against the server.
    headers: {
        Authorization: 'Bearer abcde...'
    },
    // map the servers 'deleted' field to RxDB's internal '_deleted'
    deletedField: 'deleted',
    live: true,
    retryTime: 1000 * 5,
    waitForLeadership: true,
    autoStart: true
});
```

When your backend cannot host a websocket server, leave out the stream builder and send server events into `replicationState.emitEvent()` through any other transport, or rely on the periodic checkpoint iteration alone.

### Wrap the RxCollection in a TanStack DB Collection

```ts
import { createCollection } from '@tanstack/react-db';
import { rxdbCollectionOptions } from '@tanstack/rxdb-db-collection';

const todosCollection = createCollection(
    rxdbCollectionOptions({
        rxCollection: db.todos,
        startSync: true
    })
);
```

### Use Live Queries in Your Components

Every document that the GraphQL replication pulls or receives through the subscription lands in RxDB and streams into `todosCollection`. The live query below re-renders on local mutations and on server pushes alike.

```tsx
import { useLiveQuery, eq } from '@tanstack/react-db';

function TodoList() {
    const { data: openTodos } = useLiveQuery((q) =>
        q
            .from({ todo: todosCollection })
            .where(({ todo }) => eq(todo.completed, false))
    );

    return (
        <ul>
            {openTodos.map((todo) => (
                <li
                    key={todo.id}
                    onClick={() =>
                        todosCollection.update(todo.id, (draft) => {
                            draft.completed = true;
                            draft.updatedAt = Date.now();
                        })
                    }
                >
                    {todo.text}
                </li>
            ))}
        </ul>
    );
}

// Inserts are pushed to the GraphQL server in the background:
todosCollection.insert({
    id: 'todo-1',
    text: 'buy milk',
    completed: false,
    updatedAt: Date.now()
});
```

</Steps>

## Realtime Updates Through the Subscription

With the `streamQueryBuilder` in place, the replication runs in two modes. On startup and after reconnects it iterates the checkpoint through `pullTodo` until the server returns fewer documents than `batchSize`. From then on it observes the `streamTodo` subscription and applies incoming batches directly. Documents arriving over the websocket are written to RxDB and appear in the TanStack DB collection without any component code changing.

The websocket connection can be tuned with the `pull.includeWsHeaders` flag, which includes the headers as connection parameter, and with `pull.wsOptions`, which accepts the `graphql-ws` client options like `retryAttempts`. Both are documented on the [GraphQL replication page](../../replication-graphql.md).

One GraphQL-specific detail: GraphQL returns `null` for optional fields that do not exist, while RxDB expects them to be `undefined`. When your schema has optional properties, add a `pull.modifier` that deletes `null` values from the pulled documents, as shown in the [plugin docs](../../replication-graphql.md).

## Offline Behavior

All reads and writes go against the local database first, so the app keeps working without a connection. Mutations made through TanStack DB are persisted to the local [RxStorage](../../rx-storage.md) immediately. When the client is offline, the push simply fails and is retried after `retryTime`, and the retry is skipped when an offline-to-online switch is detected. After reconnecting, the replication catches up through checkpoint iteration, so no server change is lost even when the websocket missed events.

Conflicts are resolved on the client. When the server rejects a push because another client changed the same document, the conflicting server state is returned by `pushTodo` and RxDB runs the collection's [conflict handler](../../transactions-conflicts-revisions.md). The broader offline pattern is described in [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md), and multi-tab behavior in [Multi-Tab Sync for TanStack DB](./tanstack-db-multi-tab.md).

## Generating Queries from the RxDB Schema

Writing three query builders per collection is repetitive. RxDB ships the helper functions `graphQLSchemaFromRxSchema()`, `pullQueryBuilderFromRxSchema()`, `pullStreamBuilderFromRxSchema()`, and `pushQueryBuilderFromRxSchema()` that generate the GraphQL schema parts and the builders from your [RxJsonSchema](../../rx-schema.md). The [GraphQL example project](https://github.com/pubkey/rxdb/tree/master/examples/graphql) shows them in use on both the server and the client.

## FAQ

<details>
    <summary>Can TanStack DB sync with a GraphQL backend?</summary>

Yes. TanStack DB itself has no GraphQL client, but with the RxDB collection underneath you configure the **[GraphQL replication plugin](../../replication-graphql.md)** on the RxCollection. Pulled and streamed documents then flow into the TanStack DB collection automatically and local mutations are pushed back as GraphQL mutations.

</details>

<details>
    <summary>Does TanStack DB support GraphQL subscriptions for realtime updates?</summary>

Yes, through RxDB's pull stream. You provide a `streamQueryBuilder` and a websocket url, and the **[Sync Engine](../../replication.md)** applies every subscription event to the local database, which updates the TanStack DB live queries in the same render cycle as local writes.

</details>

<details>
    <summary>Does the TanStack DB GraphQL sync work offline?</summary>

Yes. Writes are stored in the local **[RxStorage](../../rx-storage.md)** first and pushed when the client is online again. The replication resumes from its last checkpoint after a reconnect, so the client catches up on all server changes it missed while offline.

</details>

<details>
    <summary>Do I need Apollo Client or urql to sync TanStack DB with GraphQL?</summary>

No. The **[GraphQL replication plugin](../../replication-graphql.md)** sends plain GraphQL queries over `fetch` and uses `graphql-ws` for subscriptions. You can still use Apollo or urql elsewhere in your app, but the replication does not depend on them.

</details>

<details>
    <summary>What does my GraphQL server need for the replication to work?</summary>

No special sync service is required. Your server needs a pull `Query` that returns documents changed after a checkpoint, a push `Mutation` that returns conflicts, and optionally a `Subscription` for realtime events. Documents must be sortable by last write time and carry a boolean deleted flag, as described in the **[replication docs](../../replication.md)**.

</details>

## Follow Up

- Read the full guide to the [RxDB collection for TanStack DB](./rxdb-collection-for-tanstack-db.md).
- See the [GraphQL replication plugin docs](../../replication-graphql.md) for all options.
- Learn the general pattern in [How to Sync TanStack DB with Your Backend](./sync-tanstack-db.md).
- Go deeper with [Building an Offline-First App with TanStack DB and RxDB](./tanstack-db-offline-first.md).
- New to RxDB? Start with the [Quickstart](../../quickstart.md).
- Check out the [RxDB GitHub repository](/code/) and leave a star ⭐.
- Join the [RxDB Discord](/chat/) to discuss your setup.

# Replication with GraphQL

With RxDB you can do a two-way replication with a GraphQL endpoint. This allows you to replicate data from the server into the client-side database and then query and modify it in **realtime**.

When the user is offline, you still can use the data and later sync it with the server when the client is online again like in other [Offline-First](http://offlinefirst.org/) systems.

## Comparison to Couchdb-Sync

Pros:
 * The GraphQL-replication is faster and needs less resources
 * You do not need a couchdb-compliant endpoint, only a GraphQL-endpoint

Cons:
 * You can not replicate multiple databases with each other
 * It is assumed that the GraphQL-server is the single source of truth
 * You have to setup things at the server side while with couchdb-sync you only have to start a server

**NOTICE:** To play around, check out the full example of the RxDB [GraphQL replication with server and client](https://github.com/pubkey/rxdb/tree/master/examples/graphql)

## Usage

### Data Design

To use the GraphQL-replication you first have to ensure that your data is sortable by update time and your documents never get deleted, only have a deleted-flag set.

For example if your documents look like this,


```json
{
    "id": "foobar",
    "name": "Alice",
    "lastName": "Wilson",
    "updatedAt": 1564783474,
    "deleted": false
}
```

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes, it can send the latest `updatedAt` to the GraphQL-endpoint and then recieve all newer documents.

Deleted documents still exist but have `deleted: true` set. This ensures that when RxDB fetches new documents, even the deleted documents are send back and can be known at the client-side.


### GraphQL Server

At the server-side, there must exist an endpoint which returns newer rows when the last replicated document is used as input. For example lets say you create a Query `feedForRxDBReplication` which returns a list of newer documents, related to the given one, sorted by `updatedAt`.

For the push-replication, you also need a modifier which lets RxDB update data with a changed document as input.

```
input HumanInput {
    id: ID!,
    name: String!,
    lastName: String!,
    updatedAt: Int!,
    deleted: Boolean!
}
type Human {
    id: ID!,
    name: String!,
    lastName: String!,
    updatedAt: Int!,
    deleted: Boolean!
}
type Query {
    feedForRxDBReplication(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Human!]!
}
type Mutation {
    setHuman(human: HumanInput): Human
}
```

The resolver would then look like:

```js
const rootValue = {
    feedForRxDBReplication: args => {
        // sorted by updatedAt first and the id as second
        const sortedDocuments = documents.sort((a, b) => {
            if (a.updatedAt > b.updatedAt) return 1;
            if (a.updatedAt < b.updatedAt) return -1;
            if (a.updatedAt === b.updatedAt) {
                if (a.id > b.id) return 1;
                if (a.id < b.id) return -1;
            else return 0;
            }
        });

        // only return documents newer then the input document
        const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
            if (doc.updatedAt < args.minUpdatedAt) return false;
            if (doc.updatedAt > args.minUpdatedAt) return true;
            if (doc.updatedAt === args.minUpdatedAt) {
                // if updatedAt is equal, compare by id
                if (doc.id > args.lastId) return true;
                else return false;
            }
        });

        // only return some documents in one batch
        const limited = filterForMinUpdatedAtAndId.slice(0, args.limit);

        return limited;
    },
    // a modifier that updates the state on the server
    setHuman: args => {
        const doc = args.human;
        documents = documents.filter(d => d.id !== doc.id);
        doc.updatedAt = Math.round(new Date().getTime() / 1000);
        documents.push(doc);
        return doc;
    },
}
```

### RxDB Client

#### Import the plugin
The graphql-replication is not part of the default-build of RxDB. You have to import the plugin before you can use it.

```js
import { RxDBReplicationGraphQLPlugin } from 'rxdb/plugins/replication-graphql';
addRxPlugin(RxDBReplicationGraphQLPlugin);
```

#### Pull replication

For the pull-replication, you first need a `pullQueryBuilder`. This is a function that gets the last replicated document as input and returns an object with a GraphQL-query and its variables (or a promise that resolves to the same object). RxDB will use the query builder to construct what is later send to the GraphQL endpoint.

```js
const pullQueryBuilder = doc => {
    if (!doc) {
        // the first pull does not have a start-document
        doc = {
            id: '',
            updatedAt: 0
        };
    }
    const query = `{
        feedForRxDBReplication(lastId: "${doc.name}", minUpdatedAt: ${doc.updatedAt}, limit: 5) {
            id,
            name,
            lastName,
            updatedAt
            deleted
        }
    }`;
    return {
        query,
        variables: {}
    };
};
```

With the queryBuilder, you can then setup the pull-replication.

```js
const replicationState = myCollection.syncGraphQL({
    url: 'http://example.com/graphql', // url to the GraphQL endpoint
    pull: {
        queryBuilder: pullQueryBuilder, // the queryBuilder from above
        modifier: doc => doc // (optional) modifies all pulled documents before they are handeled by RxDB. Returning null will skip the document.
    },
    deletedFlag: 'deleted', // the flag which indicates if a pulled document is deleted
    live: true // if this is true, rxdb will watch for ongoing changes and sync them, when false, a one-time-replication will be done
});
```

#### Push replication

For the push-replication, you also need a `queryBuilder`. Here, the builder recieves a changed document as input which has to be send to the server. It also returns a GraphQL-Query and its data.

```js
const pushQueryBuilder = doc => {
    const query = `
        mutation CreateHuman($human: HumanInput) {
            setHuman(human: $human) {
                id,
                updatedAt
            }
        }
    `;
    const variables = {
        human: doc
    };
    return {
        query,
        variables
    };
};
```

With the queryBuilder, you can then setup the push-replication.

```js
const replicationState = myCollection.syncGraphQL({
    url: 'http://example.com/graphql', // url to the GraphQL endpoint
    push: {
        queryBuilder: pushQueryBuilder, // the queryBuilder from above
        batchSize: 5, // (optional) amount of documents that will be send in one batch
        modifier: d => d // (optional) modifies all pushed documents before they are send to the GraphQL endpoint. Returning null will skip the document.
    },
    deletedFlag: 'deleted', // the flag which indicates if a pulled document is deleted
    live: true // if this is true, rxdb will watch for ongoing changes and sync them
});
```

Of course you can start the push- and the pull-replication in a single call to `myCollection.syncGraphQL()`.

#### Using subscriptions

For the pull-replication, RxDB will run the pull-function every 10 seconds to fetch new documents from the server.
This means that when a change happens on the server, RxDB will, in the worst case, take 10 seconds until the changes is replicated to the client.

To improve this, it is recommended to setup [GraphQL Subscriptions](https://blog.apollographql.com/tutorial-graphql-subscriptions-server-side-e51c32dc2951) which will trigger the replication cycle when a change happens on the server.


```js
import {
    SubscriptionClient
} from 'subscriptions-transport-ws';

// start the replication
const replicationState = myCollection.syncGraphQL({
    url: 'http://example.com/graphql',
    pull: {
        pullQueryBuilder,
    },
    deletedFlag: 'deleted', // the flag which indicates if a pulled document is deleted
    live: true,
    /**
     * Because we use the subscriptions as notifiers,
     * we can set the liveInterval to a very height value.
     */
    liveInterval: 60 * 1000
});


// setup the subscription client
const wsClient = new SubscriptionClient(
    'ws://example.com/subscriptions', {
        reconnect: true,
    }
);

const query = `subscription onHumanChanged {
    humanChanged {
        id
    }
}`;
const changeObservable = wsClient.request({ query });
// subscribe to all events
changeObservable.subscribe({
    next(data) {
        /**
         * When a change happens, call .run() on the replicationState.
         * This will trigger the pull-handler and download changes from the server.
         */
        replicationState.run();
    }
});

```

#### Helper Functions (beta)

RxDB provides the helper functions `graphQLSchemaFromRxSchema()`, `pullQueryBuilderFromRxSchema()` and `pushQueryBuilderFromRxSchema()` that can be used to generate the GraphQL Schema from the `RxJsonSchema`. To learn how to use them, please inspect the (GraphQL Example)[https://github.com/pubkey/rxdb/tree/master/examples/graphql]


### Conflict Resolution
RxDB assumes that the Conflict Resolution will happen on the server side.
When the clients sends a document to the server which causes a conflict, this has to be resolved there and then the resulting document can be synced down to RxDB. While CouchDB uses revision-flags for conflicts, you can use any logic like relying on the `updatedAt` date or other flags.


### RxGraphQLReplicationState

When you call `myCollection.syncGraphQL()` it returns a `RxGraphQLReplicationState` which can be used to subscribe to events, for debugging or other functions.



#### .isStopped()

Returns true if the replication is stopped. This can be if a non-live replication is finished or a replication got canceled.

```js
replicationState.isStopped(); // true/false
```

#### .setHeaders()

Changes the headers for the replication after it has been set up.

```js
replicationState.setHeaders({
    Authorization: `...`
});
```

#### .awaitInitialReplication()

Returns a `Promise` that is resolved as soon as the initial replication is done.

```js
await replicationState.awaitInitialReplication();
console.log('initial sync done, client data is equal to server data');
```

#### .run()

Triggers a replication cycle with the server. This is done automatically if the data changes on the client side or the pull-interval is called. This returns a `Promise` which is resolved when the run-cycle is done. Calling `run()` many times is no problem because it is queued internally.

```js
await replicationState.run();
```


#### .cancel()

Cancels the replication. This is done autmatically if the `RxCollection` or it's `RxDatabase` is destroyed.

```js
await replicationState.cancel();
```

#### .recieved$

An `Observable` that emits each document that is recieved from the endpoint.

#### .send$

An `Observable` that emits each document that is send to the endpoint.

#### .error$

An `Observable` that emits each error that happens during the replication. Use this if something does not work for debugging. RxDB will handle network errors automatically, other errors must be solved by the developer.

```js
replicationState.error$.subscribe(error => {
    console.log('something was wrong');
    console.dir(error);
});
```

#### .canceled$

An `Observable` that emits `true` when the replication is canceled, `false` if not.

#### .active$

An `Observable` that emits `true` when the replication is doing something, `false` when not.




**NOTICE:** To play around, check out the full example of the RxDB [GraphQL replication with server and client](https://github.com/pubkey/rxdb/tree/master/examples/graphql)


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./in-memory.md)

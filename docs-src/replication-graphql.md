# Replication with GraphQL (in beta)

With RxDB you can do a two-way replication with a GraphQL endpoint. This allows you to replicate data into the client-side database and the use it even when the client is offline.

## Comparison to Couchdb-Sync

Pros:
 * The GraphQL-replication is faster and needs less resources
 * You do not need a couchdb-compliant endpoint, only a GraphQL-endpoint

Cons:
 * You can not replicate multiple databases with each other
 * It is assumed that the GraphQL-server is the single source of truth
 * You have to setup things at the server side while with couchdb-sync you only have to start a server

NOTICE: There is a full example of the RxDB GraphQL replication with server and client [here](https://github.com/pubkey/rxdb/tree/master/examples/graphql)

## Usage

### Data Design

To use the GraphQL-replication you first have to ensure that you data is sortable and you objects never get deleted, only have a deleted-flag set.

For example if you documents look like this:


```json
{
    "id": "foobar",
    "name": "Alice",
    "lastName": "Wilson",
    "updatedAt": 1564783474,
    "deleted": false
}
```

Then your data is always sortable by `updatedAt`. This ensures that when RxDB fetches 'new' changes, it can send the latest `updatedAt` to the GraphQL-endpoint and then recieve all newer rows.

Deleted rows still exist but have `deleted: true` set. This ensures that when RxDB fetches new rows, even the deleted rows are send back and can be known at the client-side.


### GraphQL Server

At the server-side, there must exist an endpoint which returns newer rows. For example lets say you create a Query `feedForRxDBReplication` which returns a list of newer objects.

Also you have to create a modifier which lets RxDB update data when the push-sync is run.

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
        // sorted by updatedAt and primary
        const sortedDocuments = documents.sort((a, b) => {
            if (a.updatedAt > b.updatedAt) return 1;
            if (a.updatedAt < b.updatedAt) return -1;
            if (a.updatedAt === b.updatedAt) {
                if (a.id > b.id) return 1;
                if (a.id < b.id) return -1;
            else return 0;
            }
        });

        // only return where updatedAt >= minUpdatedAt
        const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
            if (doc.updatedAt < args.minUpdatedAt) return false;
            if (doc.updatedAt > args.minUpdatedAt) return true;
            if (doc.updatedAt === args.minUpdatedAt) {
                // if updatedAt is equal, compare by id
                if (doc.id > args.lastId) return true;
                else return false;
            }
        });

        const limited = filterForMinUpdatedAtAndId.slice(0, args.limit);
        return limited;
    },
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
The graphql-replication is not part of the default-build. You have to add the plugin before you can use it.

```js
// es6-import
import RxDBReplicationGraphQL from 'rxdb/plugins/replication-graphql';
RxDB.plugin(RxDBReplicationGraphQL);

// es5-require
RxDB.plugin(require('rxdb/plugins/replication-graphql'));
```

#### Pull replication

For the pull-replication, you first need a `pullQueryBuilder`. This is a function that gets the last replicated document as input and returns an object with a GraphQL-query and its variables. RxDB will use the query builder to construct what is later send to the GraphQL endpoint.

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
        pullQueryBuilder, // the queryBuilder from above
        modifier: d => d // (optional) modifies all pulled documents before they are saved to the database
    },
    deletedFlag: 'deleted', // the flag which indicates if a pulled document is deleted
    live: true // if this is true, rxdb will watch for ongoing changes and sync them
});
```

#### Push replication

For the push-replication, you also need a `queryBuilder`. This time, the builder recieves a changed document as input which has to be send to the server.

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
        pullQueryBuilder, // the queryBuilder from above
        batchSize: 5, // (optional) amount of documents that will be send in one batch
        modifier: d => d // (optional) modifies all pushed documents before they are send to the GraphQL endpoint
    },
    deletedFlag: 'deleted', // the flag which indicates if a pulled document is deleted
    live: true // if this is true, rxdb will watch for ongoing changes and sync them
});
```



#### Using subscriptions

For the pull-replication, RxDB will run the pull-function every 10 seconds to fetch new documents from the server.
This means that when a change happens on the server, RxDB will, in the worst case, take 10 seconds until the changes is replicated to the client.

To improve this, it is recommended to setup GraphQL Subscriptions which will trigger the replication run when a change happens.


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

### RxGraphQLReplicationState

When you call `myCollection.syncGraphQL()` it returns a RxGraphQLReplicationState which can be used to subscribe to events or for debugging.



#### isStopped

Returns true if the replication is stopped. This can be if a non-live replication is finished or a replication got canceled.
```js
replicationState.isStopped(); // true/false
```

#### awaitInitialReplication

Returns a `Promise` that is resolved as soon as the initial replication is done.

```js
await replicationState.awaitInitialReplication();
console.log('initial sync done, client data is equal to server data');
```

#### run

Triggers a replication cycle with the server. This is done automatically if the data changes on the client side or the pull-interval is called. This returns a `Promise` which is resolved when the run-cycle is done. Calling `run()` many times is no problem because it is queued internally.

```js
await replicationState.run();
```


#### cancel

Cancels the replication. This is done autmatically if the collection or it's database is destroyed.

```js
await replicationState.cancel();
```

#### revieved$

An `Observable` that emits each document that is recieved from the endpoint.

#### send$

An `Observable` that emits each document that is send to the endpoint.

#### error$

An `Observable` that emits each error that happens during the replication. Use this if something does not work for debugging. RxDB will handle network errors automatically, other errors must be solved by the developer.

```js
replicationState.error$.subscribe(error => {
    console.log('something was wrong');
    console.dir(error);
});
```

#### canceled$

An `Observable` that emits `true` when the replication is canceled, `false` if not.

#### active$

An `Observable` that emits `true` when the replication is doing something, `false` when not.



NOTICE: There is a full example of the RxDB GraphQL replication with server and client [here](https://github.com/pubkey/rxdb/tree/master/examples/graphql)


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./query-change-detection.md)

# GraphQL Replication

> The GraphQL replication provides handlers for GraphQL to run [replication](./replication.md) with GraphQL as the transportation layer.

# Replication with GraphQL

The GraphQL replication provides handlers for GraphQL to run [replication](./replication.md) with GraphQL as the transportation layer.

The GraphQL replication is mostly used when you already have a backend that exposes a GraphQL API that can be adjusted to serve as a replication endpoint. If you do not already have a GraphQL endpoint, using the [HTTP replication](./replication-http.md) is an easier solution.

:::note
To play around, check out the full example of the RxDB [GraphQL replication with server and client](https://github.com/pubkey/rxdb/tree/master/examples/graphql)
:::

## Usage

Before you use the GraphQL replication, make sure you've learned how the [RxDB replication](./replication.md) works.

### Creating a compatible GraphQL Server

At the server-side, there must exist an endpoint which returns newer rows when the last `checkpoint` is used as input. For example lets say you create a `Query` `pullHuman` which returns a list of document writes that happened after the given checkpoint.

For the push-replication, you also need a `Mutation` `pushHuman` which lets RxDB update data of documents by sending the previous document state and the new client document state.
Also for being able to stream all ongoing events, we need a `Subscription` called `streamHuman`.

```graphql
input HumanInput {
    id: ID!,
    name: String!,
    lastName: String!,
    updatedAt: Float!,
    deleted: Boolean!
}
type Human {
    id: ID!,
    name: String!,
    lastName: String!,
    updatedAt: Float!,
    deleted: Boolean!
}
input Checkpoint {
    id: String!,
    updatedAt: Float!
}
type HumanPullBulk {
    documents: [Human]!
    checkpoint: Checkpoint
}

type Query {
    pullHuman(checkpoint: Checkpoint, limit: Int!): HumanPullBulk!
}

input HumanInputPushRow {
    assumedMasterState: HeroInputPushRowT0AssumedMasterStateT0
    newDocumentState: HeroInputPushRowT0NewDocumentStateT0!
}

type Mutation {
    # Returns a list of all conflicts
    # If no document write caused a conflict, return an empty list.
    pushHuman(rows: [HumanInputPushRow!]): [Human]
}

# headers are used to authenticate the subscriptions
# over websockets.
input Headers {
    AUTH_TOKEN: String!;
}
type Subscription {
    streamHuman(headers: Headers): HumanPullBulk!
}

```

The GraphQL resolver for the `pullHuman` would then look like:

```js
const rootValue = {
    pullHuman: args => {
        const minId = args.checkpoint ? args.checkpoint.id : '';
        const minUpdatedAt = args.checkpoint ? args.checkpoint.updatedAt : 0;

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

        // only return documents newer than the input document
        const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
            if (doc.updatedAt < minUpdatedAt) return false;
            if (doc.updatedAt > minUpdatedAt) return true;
            if (doc.updatedAt === minUpdatedAt) {
                // if updatedAt is equal, compare by id
                if (doc.id > minId) return true;
                else return false;
            }
        });

        // only return some documents in one batch
        const limitedDocs = filterForMinUpdatedAtAndId.slice(0, args.limit);

        // use the last document for the checkpoint
        const lastDoc = limitedDocs[limitedDocs.length - 1];
        const retCheckpoint = {
            id: lastDoc.id,
            updatedAt: lastDoc.updatedAt
        }

        return {
            documents: limitedDocs,
            checkpoint: retCheckpoint
        }

        return limited;
    }
}
```

For examples for the other resolvers, consult the [GraphQL Example Project](https://github.com/pubkey/rxdb/blob/master/examples/graphql/server/index.js).

### RxDB Client

#### Pull replication

For the pull-replication, you first need a `pullQueryBuilder`. This is a function that gets the last replication `checkpoint` and a `limit` as input and returns an object with a GraphQL-query and its variables (or a promise that resolves to the same object). RxDB will use the query builder to construct what is later sent to the GraphQL endpoint.

```js
const pullQueryBuilder = (checkpoint, limit) => {
    /**
     * The first pull does not have a checkpoint
     * so we fill it up with defaults
     */
    if (!checkpoint) {
        checkpoint = {
            id: '',
            updatedAt: 0
        };
    }
    const query = `query PullHuman($checkpoint: CheckpointInput, $limit: Int!) {
        pullHuman(checkpoint: $checkpoint, limit: $limit) {
            documents {
                id
                name
                age
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
        operationName: 'PullHuman',
        variables: {
            checkpoint,
            limit
        }
    };
};
```

With the queryBuilder, you can then setup the pull-replication.

```js
import { replicateGraphQL } from 'rxdb/plugins/replication-graphql';
const replicationState = replicateGraphQL(
    {
        collection: myRxCollection,
        // urls to the GraphQL endpoints
        url: {
            http: 'http://example.com/graphql'
        },
        pull: {
            queryBuilder: pullQueryBuilder, // the queryBuilder from above
            modifier: doc => doc, // (optional) modifies all pulled documents before they are handled by RxDB
            dataPath: undefined, // (optional) specifies the object path to access the document(s). Otherwise, the first result of the response data is used.
            /**
             * Amount of documents that the remote will send in one request.
             * If the response contains less than [batchSize] documents,
             * RxDB will assume there are no more changes on the backend
             * that are not replicated.
             * This value is the same as the limit in the pullHuman() schema.
             * [default=100]
             */
            batchSize: 50
        },
        // headers which will be used in http requests against the server.
        headers: {
            Authorization: 'Bearer abcde...'
        },

        /**
         * Options that have been inherited from the RxReplication
         */
        deletedField: 'deleted',
        live: true,
        retryTime = 1000 * 5,
        waitForLeadership = true,
        autoStart = true,
    }
);
```

#### Push replication

For the push-replication, you also need a `queryBuilder`. Here, the builder receives a changed document as input which has to be send to the server. It also returns a GraphQL-Query and its data.

```js
const pushQueryBuilder = rows => {
    const query = `
    mutation PushHuman($writeRows: [HumanInputPushRow!]) {
        pushHuman(writeRows: $writeRows) {
            id
            name
            age
            updatedAt
            deleted
        }
    }
    `;
    const variables = {
        writeRows: rows
    };
    return {
        query,
        operationName: 'PushHuman',
        variables
    };
};
```

With the queryBuilder, you can then setup the push-replication.

```js
const replicationState = replicateGraphQL(
    {
        collection: myRxCollection,
        // urls to the GraphQL endpoints
        url: {
            http: 'http://example.com/graphql'
        },
        push: {
            queryBuilder: pushQueryBuilder, // the queryBuilder from above
            /**
             * batchSize (optional)
             * Amount of document that will be pushed to the server in a single request.
             */
            batchSize: 5,
            /**
             * modifier (optional)
             * Modifies all pushed documents before they are send to the GraphQL endpoint.
             * Returning null will skip the document.
             */
            modifier: doc => doc
        },
        headers: {
            Authorization: 'Bearer abcde...'
        },
        pull: {
            /* ... */
        },
        /* ... */
    }
);
```

#### Pull Stream

To create a **realtime** replication, you need to create a pull stream that pulls ongoing writes from the server.
The pull stream gets the `headers` of the `RxReplicationState` as input, so that it can be authenticated on the backend.

```js
const pullStreamQueryBuilder = (headers) => {
    const query = `subscription onStream($headers: Headers) {
        streamHero(headers: $headers) {
            documents {
                id,
                name,
                age,
                updatedAt,
                deleted
            },
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

With the `pullStreamQueryBuilder` you can then start a realtime replication.

```js
const replicationState = replicateGraphQL(
    {
        collection: myRxCollection,
        // urls to the GraphQL endpoints
        url: {
            http: 'http://example.com/graphql',
            ws: 'ws://example.com/subscriptions' // <- The websocket has to use a different url.
        },
        push: {
            batchSize: 100,
            queryBuilder: pushQueryBuilder
        },
        headers: {
            Authorization: 'Bearer abcde...'
        },
        pull: {
            batchSize: 100,
            queryBuilder: pullQueryBuilder,
            streamQueryBuilder: pullStreamQueryBuilder,
            includeWsHeaders: false, // Includes headers as connection parameter to Websocket.

            // Websocket options that can be passed as a parameter to initialize the subscription
            // Can be applied anything from the graphql-ws ClientOptions - https://the-guild.dev/graphql/ws/docs/interfaces/client.ClientOptions
            // Except these parameters: 'url', 'shouldRetry', 'webSocketImpl' - locked for internal usage
            // Note: if you provide connectionParams as a wsOption, make sure it returns any necessary headers (e.g. authorization)
            // because providing your own connectionParams prevents headers from being included automatically
            wsOptions: { 
                retryAttempts: 10,
            }
        },
        deletedField: 'deleted'
    }
);
```

:::note
If it is not possible to create a websocket server on your backend, you can use any other method of pull out the ongoing events from the backend and then you can send them into `RxReplicationState.emitEvent()`.
:::

### Transforming null to undefined in optional fields

GraphQL fills up non-existent optional values with `null` while RxDB required them to be `undefined`.
Therefore, if your schema contains optional properties, you have to transform the pulled data to switch out `null` to `undefined`
```js
const replicationState: RxGraphQLReplicationState<RxDocType> = replicateGraphQL(
    {
        collection: myRxCollection,
        url: {/* ... */},
        headers: {/* ... */},
        push: {/* ... */},
        pull: {
            queryBuilder: pullQueryBuilder,
            modifier: (doc => {
                // We have to remove optional non-existent field values
                // they are set as null by GraphQL but should be undefined
                Object.entries(doc).forEach(([k, v]) => {
                    if (v === null) {
                        delete doc[k];
                    }
                });
                return doc;
            })
        },
        /* ... */
    }
);
```

### pull.responseModifier

With the `pull.responseModifier` you can modify the whole response from the GraphQL endpoint **before** it is processed by RxDB.
For example if your endpoint is not capable of returning a valid checkpoint, but instead only returns the plain document array, you can use the `responseModifier` to aggregate the checkpoint from the returned documents.

```ts
import {

} from 'rxdb';
const replicationState: RxGraphQLReplicationState<RxDocType> = replicateGraphQL(
    {
        collection: myRxCollection,
        url: {/* ... */},
        headers: {/* ... */},
        push: {/* ... */},
        pull: {
            responseModifier: async function(
                plainResponse, // the exact response that was returned from the server
                origin, // either 'handler' if plainResponse came from the pull.handler, or 'stream' if it came from the pull.stream
                requestCheckpoint // if origin==='handler', the requestCheckpoint contains the checkpoint that was send to the backend
            ) {
                /**
                 * In this example we aggregate the checkpoint from the documents array
                 * that was returned from the graphql endpoint.
                 */
                const docs = plainResponse;
                return {
                    documents: docs,
                    checkpoint: docs.length === 0 ? requestCheckpoint : {
                        name: lastOfArray(docs).name,
                        updatedAt: lastOfArray(docs).updatedAt
                    }
                };
            }
        },
        /* ... */
    }
);
```

### push.responseModifier

It's also possible to modify the response of a push mutation. For example if your server returns more than the just conflicting docs:

```graphql
type PushResponse {
    conflicts: [Human]
    conflictMessages: [ReplicationConflictMessage]
}

type Mutation {
    # Returns a PushResponse type that contains the conflicts along with other information
    pushHuman(rows: [HumanInputPushRow!]): PushResponse!
}
```

```ts
import {} from "rxdb";
const replicationState: RxGraphQLReplicationState<RxDocType> = replicateGraphQL(
    {
        collection: myRxCollection,
        url: {/* ... */},
        headers: {/* ... */},
        push: {
            responseModifier: async function (plainResponse) {
                /**
                 * In this example we aggregate the conflicting documents from a response object
                 */
                return plainResponse.conflicts;
            },
        },
        pull: {/* ... */},
        /* ... */
    }
);
```

#### Helper Functions

RxDB provides the helper functions `graphQLSchemaFromRxSchema()`, `pullQueryBuilderFromRxSchema()`, `pullStreamBuilderFromRxSchema()` and `pushQueryBuilderFromRxSchema()` that can be used to generate handlers and schemas from the `RxJsonSchema`. To learn how to use them, please inspect the [GraphQL Example](https://github.com/pubkey/rxdb/tree/master/examples/graphql).

### RxGraphQLReplicationState

When you call `myCollection.syncGraphQL()` it returns a `RxGraphQLReplicationState` which can be used to subscribe to events, for debugging or other functions. It extends the [RxReplicationState](./replication.md) with some GraphQL specific methods.

#### .setHeaders()

Changes the headers for the replication after it has been set up.

```js
replicationState.setHeaders({
    Authorization: `...`
});
```

#### Sending Cookies

The underlying fetch framework uses a `same-origin` policy for credentials per default. That means, cookies and session data is only shared if you backend and frontend run on the same domain and port. Pass the credential parameter to `include` cookies in requests to servers from different origins via:

```js
replicationState.setCredentials('include');
```

or directly pass it in the `replicateGraphQL` function:

```js
replicateGraphQL(
    {
        collection: myRxCollection,
        /* ... */
        credentials: 'include',
        /* ... */
    }
);
```

See [the fetch spec](https://fetch.spec.whatwg.org/#concept-request-credentials-mode) for more information about available options.

:::note
To play around, check out the full example of the RxDB [GraphQL replication with server and client](https://github.com/pubkey/rxdb/tree/master/examples/graphql)
:::

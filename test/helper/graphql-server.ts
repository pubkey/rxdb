/**
 * spawns a graphql-server
 * that can be used in tests and examples
 * @link https://graphql.org/graphql-js/running-an-express-graphql-server/
 */

import { PubSub } from 'graphql-subscriptions';
import {
    buildSchema,
    execute,
    subscribe
} from 'graphql';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { Request, Response, NextFunction } from 'express';

import express from 'express';
// we need cors because this server is also used in browser-tests
import cors from 'cors';
import { createHandler } from 'graphql-http/lib/use/express';

import {
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PATH
} from './graphql-config.ts';
import { ensureNotFalsy, lastOfArray } from 'event-reduce-js';
import { RxReplicationWriteToMasterRow } from '../../plugins/core/index.mjs';
import {
    HumanWithTimestampDocumentType,
    nextPort
} from '../../plugins/test-utils/index.mjs';
import { GraphQLServerUrl, RxGraphQLReplicationClientState } from '../../plugins/core/index.mjs';

import {
    graphQLRequest
} from '../../plugins/replication-graphql/index.mjs';

function sortByUpdatedAtAndPrimary(
    a: any,
    b: any
): 0 | 1 | -1 {
    if (a.updatedAt > b.updatedAt) return 1;
    if (a.updatedAt < b.updatedAt) return -1;

    if (a.updatedAt === b.updatedAt) {
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        else return 0;
    }
    return 0;
}

export interface GraphqlServer<T> {
    port: number;
    wsPort: number;
    subServer: any;
    url: GraphQLServerUrl;
    setDocument(doc: T): Promise<{ data: any; }>;
    overwriteDocuments(docs: T[]): void;
    getDocuments(): T[];
    requireHeader(name: string, value: string): void;
    close(now?: boolean): Promise<void>;
}

export interface GraphQLServerModule {
    spawn<T = HumanWithTimestampDocumentType>(docs?: T[]): Promise<GraphqlServer<T>>;
}

declare type Human = {
    id: string;
    name: string;
    age: number;
    updatedAt: number;
    deleted: boolean;
};

export async function spawn(
    documents: Human[] = [],
    portNumber?: number
): Promise<GraphqlServer<Human>> {
    const port = portNumber ? portNumber : await nextPort();
    const app = express();
    app.use(cors());

    /**
     * schema in graphql
     * matches ./schemas.js#humanWithTimestamp
     */
    const schema = buildSchema(`
        type Checkpoint {
            id: String!
            updatedAt: Float!
        }
        input CheckpointInput {
            id: String!
            updatedAt: Float!
        }
        type FeedResponse {
            documents: [Human!]!
            checkpoint: Checkpoint!
        }
        type Query {
            info: Int
            feedForRxDBReplication(checkpoint: CheckpointInput, limit: Int!): FeedResponse!
            collectionFeedForRxDBReplication(checkpoint: CheckpointInput, limit: Int!): CollectionFeedResponse!
            getAll: [Human!]!
        }
        type Mutation {
            writeHumans(writeRows: [HumanWriteRow!]): [Human!]
            writeHumansFail(writeRows: [HumanWriteRow!]): [Human!]
        }
        input HumanWriteRow {
            assumedMasterState: HumanInput,
            newDocumentState: HumanInput!
        }
        input HumanInput {
            id: ID!,
            name: String!,
            age: Int!,
            updatedAt: Float!,
            deleted: Boolean!
        }
        type Human {
            id: ID!,
            name: String!,
            age: Int!,
            updatedAt: Float!,
            deleted: Boolean!,
            deletedAt: Float
        }
        input Headers {
            token: String
        }
        type CollectionFeedResponse {
            collection: FeedResponse!
            count: Int!
        }
        type Subscription {
            humanChanged(headers: Headers): FeedResponse
        }
        schema {
            query: Query
            mutation: Mutation
            subscription: Subscription
        }
    `);

    const pubsub = new PubSub();
    /* pubsub.subscribe('humanChanged', data => {
        console.log('pubsub received!!');
        console.dir(data);
    });*/

    // The root provides a resolver function for each API endpoint
    const root = {
        info: () => 1,
        collectionFeedForRxDBReplication: (args: any) => {
            const result = root.feedForRxDBReplication(args);

            // console.log('collection');
            // console.dir(result);

            return {
                collection: result,
                count: result.documents.length
            };
        },
        feedForRxDBReplication: (args: any) => {
            const lastId = args.checkpoint ? args.checkpoint.id : '';
            const minUpdatedAt = args.checkpoint ? args.checkpoint.updatedAt : 0;

            // console.log('## feedForRxDBReplication');
            // console.dir(args);
            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filteredByMinUpdatedAtAndId = sortedDocuments.filter((doc) => {
                if (doc.updatedAt < minUpdatedAt) {
                    return false;
                } else if (doc.updatedAt > minUpdatedAt) {
                    return true;
                } else if (doc.updatedAt === minUpdatedAt) {
                    if (doc.id > lastId) {
                        return true;
                    } else return false;
                }
            });

            // limit if requested
            const limited = args.limit ? filteredByMinUpdatedAtAndId.slice(0, args.limit) : filteredByMinUpdatedAtAndId;

            const last = lastOfArray(limited);
            const ret = {
                documents: limited,
                checkpoint: last ? {
                    id: last.id,
                    updatedAt: last.updatedAt
                } : {
                    id: lastId,
                    updatedAt: minUpdatedAt
                }
            };
            return ret;
        },
        getAll: () => {
            return documents;
        },
        writeHumans: (args: any) => {
            const rows: RxReplicationWriteToMasterRow<Human>[] = args.writeRows;


            let last: Human | undefined = null as any;
            const conflicts: Human[] = [];

            const storedDocs = rows.map(row => {
                const doc = row.newDocumentState;
                const previousDoc = documents.find((d: Human) => d.id === doc.id);
                if (
                    (previousDoc && !row.assumedMasterState) ||
                    (
                        previousDoc && row.assumedMasterState &&
                        previousDoc.updatedAt > row.assumedMasterState.updatedAt &&
                        row.newDocumentState.deleted === previousDoc.deleted
                    )
                ) {
                    conflicts.push(previousDoc);
                    return;
                }

                documents = documents.filter((d: Human) => d.id !== doc.id);
                documents.push(doc);

                last = doc;
                return doc;
            });

            if (last) {
                pubsub.publish(
                    'humanChanged',
                    {
                        humanChanged: {
                            documents: storedDocs.filter(d => !!d),
                            checkpoint: {
                                id: ensureNotFalsy(last).id,
                                updatedAt: ensureNotFalsy(last).updatedAt
                            }
                        },
                    }
                );
            }

            return conflicts;
        },
        // used in tests
        writeHumansFail: (_args: any) => {
            throw new Error('writeHumansFail called');
        },
        humanChanged: () => pubsub.asyncIterableIterator('humanChanged')
    };

    // header simulation middleware
    let reqHeaderName: string = '';
    let reqHeaderValue: string = '';
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (!reqHeaderName) {
            next();
            return;
        }
        if (req.header(reqHeaderName.toLowerCase()) !== reqHeaderValue) {
            res.status(200).json({
                'errors': [
                    {
                        'extensions': {
                            'code': 'UNAUTHENTICATED'
                        },
                        'message': 'user not authenticated'
                    }
                ]
            });
        } else {
            next();
        }
    });

    app.use(
        GRAPHQL_PATH,
        createHandler({
            schema,
            rootValue: root,
        })
    );

    const httpUrl = 'http://localhost:' + port + GRAPHQL_PATH;
    const clientState: RxGraphQLReplicationClientState = {
        headers: {},
        credentials: undefined
    };
    const retServer: Promise<GraphqlServer<Human>> = new Promise(res => {
        const server = app.listen(port, function () {

            const wsPort = port + 500;
            const wss = createServer(server);
            const wsServer = new WebSocketServer({
                server: wss,
                path: GRAPHQL_SUBSCRIPTION_PATH,
            });
            const websocketUrl = 'ws://localhost:' + wsPort + GRAPHQL_SUBSCRIPTION_PATH;

            wss.listen(wsPort, () => {
                // console.log(`GraphQL Server is now running on http://localhost:${wsPort}`);
                // Set up the WebSocket for handling GraphQL subscriptions
                const subServer = useServer(
                    {
                        onConnect: (ctx) => {
                            if (reqHeaderName) { // Only check auth when required header was set
                                const headers = ctx.connectionParams?.headers as Record<string, string>;
                                if (headers[reqHeaderName] !== reqHeaderValue) {
                                    return false;
                                }
                            }
                        },
                        schema,
                        execute,
                        subscribe,
                        roots: {
                            subscription: {
                                humanChanged: root.humanChanged,
                            },
                        },
                    },
                    wsServer
                );

                res({
                    port,
                    wsPort,
                    subServer,
                    url: {
                        http: httpUrl,
                        ws: websocketUrl
                    },
                    async setDocument(doc: Human) {

                        const previous = documents.find(d => d.id === doc.id);
                        const row = {
                            assumedMasterState: previous ? previous : undefined,
                            newDocumentState: doc
                        };


                        const result = await graphQLRequest(
                            fetch,
                            httpUrl,
                            clientState,
                            {

                                query: `
                                    mutation CreateHumans($writeRows: [HumanWriteRow!]) {
                                        writeHumans(writeRows: $writeRows) { id }
                                    }
                                `,
                                operationName: 'CreateHumans',
                                variables: {
                                    writeRows: [row]
                                }
                            }
                        );
                        if (result.data.writeHumans.length > 0) {
                            throw new Error('setDocument() caused a conflict');
                        }
                        return result;
                    },
                    overwriteDocuments(docs: any[]) {
                        documents = docs.slice();
                    },
                    getDocuments() {
                        return documents.slice(0);
                    },
                    requireHeader(name: string, value: string) {
                        reqHeaderName = name;
                        reqHeaderValue = value;
                        if (!name) {
                            reqHeaderName = '';
                            reqHeaderValue = '';

                            clientState.headers = {};
                        } else {
                            clientState.headers = {
                                [name]: value
                            };
                        }
                    },
                    close(now = false) {
                        if (now) {
                            server.close();
                            subServer.dispose();
                            return Promise.resolve();
                        } else {
                            return new Promise(res2 => {
                                setTimeout(() => {
                                    server.close();
                                    subServer.dispose();
                                    res2();
                                }, 1000);
                            });
                        }
                    }
                });

                return subServer;
            });
        });
    });
    return retServer;
}

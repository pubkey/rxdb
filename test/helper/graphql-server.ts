/**
 * spawns a graphql-server
 * that can be used in tests and examples
 * @link https://graphql.org/graphql-js/running-an-express-graphql-server/
 */

import graphQlClient from 'graphql-client';
import { PubSub } from 'graphql-subscriptions';
import {
    buildSchema,
    execute,
    subscribe
} from 'graphql';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';

const express = require('express');
// we need cors because this server is also used in browser-tests
const cors = require('cors');
const graphqlHTTP = require('express-graphql');

import {
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PATH
} from './graphql-config';

let lastPort = 16121;
export function getPort() {
    lastPort = lastPort + 1;
    return lastPort;
}

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
    client: any;
    url: string;
    setDocument(doc: T): Promise<{ data: any }>;
    overwriteDocuments(docs: T[]): void;
    getDocuments(): T[];
    close(now?: boolean): void;
}

export interface GraphQLServerModule {
    spawn<T>(docs?: T[]): Promise<GraphqlServer<T>>;
}

export async function spawn<T>(
    documents: T[] = [],
    port = getPort()
): Promise<GraphqlServer<T>> {
    const app = express();
    app.use(cors());

    /**
     * schema in graphql
     * matches ./schemas.js#humanWithTimestamp
     */
    const schema = buildSchema(`
        type Query {
            info: Int
            feedForRxDBReplication(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Human!]!
            getAll: [Human!]!
        }
        type Mutation {
            setHuman(human: HumanInput): Human
        }
        input RevisionInput {
          start: Int!,
          ids: [String!]!
        }
        input HumanInput {
            id: ID!,
            name: String!,
            age: Int!,
            updatedAt: Int!,
            deleted: Boolean!,
            _rev: String,
            _revisions: RevisionInput,
        }
        type Revision {
          start: Int!,
          ids: [String!]!
        }
        type Human {
            id: ID!,
            name: String!,
            age: Int!,
            updatedAt: Int!,
            deleted: Boolean!
            _rev: String,
            _revisions: Revision,
        }
        type Subscription {
            humanChanged: Human
        }

        schema {
            query: Query
            mutation: Mutation
            subscription: Subscription
        }
    `);

    const pubsub = new PubSub();
    /*pubsub.subscribe('humanChanged', data => {
        console.log('pubsub recieved!!');
        console.dir(data);
    });*/

    // The root provides a resolver function for each API endpoint
    const root = {
        info: () => 1,
        feedForRxDBReplication: (args: any) => {
            // console.log('## feedForRxDBReplication');
            // console.dir(args);
            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filterForMinUpdatedAtAndId = sortedDocuments.filter((doc: any) => {
                if (doc.updatedAt < args.minUpdatedAt) return false;
                if (doc.updatedAt > args.minUpdatedAt) return true;
                if (doc.updatedAt === args.minUpdatedAt) {
                    if (doc.id > args.lastId) return true;
                    else return false;
                }

            });

            // limit
            const limited = filterForMinUpdatedAtAndId.slice(0, args.limit);

            /*
            console.log('sortedDocuments:');
            console.dir(sortedDocuments);
            console.log('filterForMinUpdatedAt:');
            console.dir(filterForMinUpdatedAtAndId);
            console.log('return docs:');
            console.dir(limited);
*/
            return limited;
        },
        getAll: () => {
            return documents;
        },
        setHuman: (args: any) => {
            // console.log('## setHuman()');
            // console.dir(args);
            const doc: any = args.human;
            documents = documents.filter((d: any) => d.id !== doc.id);
            doc.updatedAt = Math.round(new Date().getTime() / 1000);
            documents.push(doc);
            // console.dir(documents);

            pubsub.publish(
                'humanChanged',
                {
                    humanChanged: doc
                }
            );
            return doc;
        },
        humanChanged: () => pubsub.asyncIterator('humanChanged')
    };

    app.use(GRAPHQL_PATH, graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true,
    }));

    const ret = 'http://localhost:' + port + GRAPHQL_PATH;
    const client = graphQlClient({
        url: ret
    });
    const retServer: Promise<GraphqlServer<T>> = new Promise(res => {
        const server = app.listen(port, function () {

            const wsPort = port + 500;
            const ws = createServer(server);
            ws.listen(wsPort, () => {
                // console.log(`GraphQL Server is now running on http://localhost:${wsPort}`);
                // Set up the WebSocket for handling GraphQL subscriptions
                const subServer = new SubscriptionServer(
                    {
                        execute,
                        subscribe,
                        schema,
                        rootValue: root
                    }, {
                    server: ws,
                    path: GRAPHQL_SUBSCRIPTION_PATH,
                }
                );

                res({
                    port,
                    wsPort,
                    subServer,
                    client,
                    url: ret,
                    async setDocument(doc: any) {
                        const result = await client.query(
                            `
            mutation CreateHuman($human: HumanInput) {
                setHuman(human: $human) {
                    id,
                    updatedAt
                }
              }

                        `, {
                            human: doc
                        }
                        );
                        // console.dir(result);
                        return result;
                    },
                    overwriteDocuments(docs: any[]) {
                        documents = docs.slice();
                    },
                    getDocuments() {
                        return documents;
                    },
                    close(now = false) {
                        if (now) {
                            server.close();
                            subServer.close();
                        } else {
                            return new Promise(res2 => {
                                setTimeout(() => {
                                    server.close();
                                    subServer.close();
                                    res2();
                                }, 1000);
                            });
                        }
                    }
                });
            });
        });
    });
    return retServer;
}

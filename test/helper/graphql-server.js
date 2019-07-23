/**
 * spawns a graphql-server
 * that can be used in tests and examples
 * @link https://graphql.org/graphql-js/running-an-express-graphql-server/
 */

import * as schemaObjects from './schema-objects';
import graphQlClient from 'graphql-client';
import {
    randomBoolean
} from 'async-test-util';
import {
    buildSchema
} from 'graphql';

const express = require('express');
const graphqlHTTP = require('express-graphql');

let lastPort = 16121;

function sortByUpdatedAtAndPrimary(a, b) {
    if (a.updatedAt > b.updatedAt) return 1;
    if (a.updatedAt < b.updatedAt) return -1;

    if (a.updatedAt === b.updatedAt) {
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        else return 0;
    }
}

export async function spawn(documents = []) {
    const app = express();
    lastPort++;

    /**
     * schema in graphql
     * matches ./schemas.js#humanWithTimestamp
     */
    const schema = buildSchema(`
    type Query {
        info: Int
        feedForRxDBReplication(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Human!]!
    }
    type Mutation {
        setHuman(human: HumanInput): Human
    }
    input HumanInput {
        id: ID!,
        name: String!,
        age: Int!,
        updatedAt: Int!,
        deleted: Boolean!
    }
    type Human {
        id: ID!,
        name: String!,
        age: Int!,
        updatedAt: Int!,
        deleted: Boolean!
    }
    `);

    // The root provides a resolver function for each API endpoint
    const root = {
        info: () => 1,
        feedForRxDBReplication: args => {
            console.log('## feedForRxDBReplication');
            console.dir(args);
            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
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
        setHuman: args => {
            console.log('## setHuman()');
            console.dir(args);
            const doc = args.human;
            documents = documents.filter(d => d.id !== doc.id);
            doc.updatedAt = Math.round(new Date().getTime() / 1000);
            documents.push(doc);
            // console.dir(documents);
            return doc;
        }
    };

    const path = '/graphql';
    app.use(path, graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true,
    }));

    const ret = 'http://localhost:' + lastPort + path;
    const client = graphQlClient({
        url: ret
    });
    return new Promise(res => {
        const server = app.listen(lastPort, function () {
            res({
                client,
                url: ret,
                async setDocument(doc) {
                    const result = await client.query(

                        `
                        mutation CreateHuman($human: HumanInput) {
                            setHuman(human: $human) {
                                id,
                                updatedAt
                            }
                          }
                        
`,
                        {
                            human: doc
                        }
                    );
                    console.dir(result);
                    return result;
                },
                overwriteDocuments(docs) {
                    documents = docs.slice();
                },
                getDocuments() {
                    return documents;
                },
                close(now = false) {
                    if (now) {
                        server.close();
                    } else {
                        return new Promise(res2 => {
                            setTimeout(() => {
                                server.close();
                                res2();
                            }, 1000);
                        });
                    }
                }
            });
        });
    });
}
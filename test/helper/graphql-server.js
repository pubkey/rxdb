/**
 * spawns a graphql-server
 * that can be used in tests and examples
 * @link https://graphql.org/graphql-js/running-an-express-graphql-server/
 */

import * as schemaObjects from './schema-objects';
import {
    buildSchema
} from 'graphql';

const express = require('express');
const graphqlHTTP = require('express-graphql');
const app = express();

let lastPort = 16121;

/**
 * schema in graphql
 * matches ./schemas.js#humanWithTimestamp
 */
const schema = buildSchema(`
    type Query {
        info: Int
        feedForRxDBReplication(lastId: String!, minUpdatedAt: Int!, limit: Int!): [Human!]!
    }
    type Human {
        id: ID!,
        name: String!,
        age: Int!,
        updatedAt: Int!,
        deleted: Boolean!
    }
`);

function sortByUpdatedAtAndPrimary(a, b) {
    if (a.updatedAt > b.updatedAt) return 1;
    if (a.updatedAt < b.updatedAt) return -1;

    if (a.updatedAt === b.updatedAt) {
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        else return 0;
    }
}

export async function spawn(testDataAmount = 0) {
    lastPort++;

    // initial state
    const documents = new Array(testDataAmount)
        .fill(0)
        .map(() => schemaObjects.humanWithTimestamp());

    // The root provides a resolver function for each API endpoint
    const root = {
        info: () => 1,
        feedForRxDBReplication: args => {
            console.log('feed resolver:');
            console.dir(args);

            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filterForMinUpdatedAt = sortedDocuments.filter(doc => doc.updatedAt >= args.minUpdatedAt);

            // limit
            const limited = filterForMinUpdatedAt.slice(0, args.limit);

            console.dir(limited);
            return limited;
        }
    };

    const path = '/graphql';
    app.use(path, graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true,
    }));

    const ret = 'http://localhost:' + lastPort + path;
    return new Promise(res => {
        const server = app.listen(lastPort, function () {
            res({
                url: ret,
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

/*
async function spawn2() {


    const documents = new Array(100).fill(0).map(() => humanWithTimestamp());

    // The root provides a resolver function for each API endpoint
    const root = {
        feedForRxDBReplication: (args, context, info) => {
            console.log('feed resolver:');
            console.dir(args);

            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filterForMinUpdatedAt = sortedDocuments.filter(doc => doc.updatedAt >= args.minUpdatedAt);

            // limit
            const limited = filterForMinUpdatedAt.slice(0, args.limit);


            console.dir(limited);
            return limited;
        }
    };

    const latestDocument = {
        id: '94nyn7sdnd1v',
        name: 'Marty',
        age: 60,
        updatedAt: 1561928001,
        deleted: true
    };

    const queryBuilder = doc => `{
        feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: 10) {
            id
            name
            age
            updatedAt
            deleted
        }
    }`;

    const query = queryBuilder(latestDocument);
    graphql(schema, query, root).then((response) => {
        console.dir(response);
        console.dir(response.data.feed[0]);
    });
}

spawn2();
*/

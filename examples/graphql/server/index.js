import {
    buildSchema
} from 'graphql';

const express = require('express');
const graphqlHTTP = require('express-graphql');
const cors = require('cors');

const port = 10102;
const path = '/graphql';

function sortByUpdatedAtAndPrimary(a, b) {
    if (a.updatedAt > b.updatedAt) return 1;
    if (a.updatedAt < b.updatedAt) return -1;

    if (a.updatedAt === b.updatedAt) {
        if (a.id > b.id) return 1;
        if (a.id < b.id) return -1;
        else return 0;
    }
}

export async function run() {
    let documents = [];
    const app = express();
    app.use(cors());

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
        color: String!,
        updatedAt: Int,
        deleted: Boolean!
    }
    type Human {
        id: ID!,
        name: String!,
        color: String!,
        updatedAt: Int!,
        deleted: Boolean!
    }
    `);

    // The root provides a resolver function for each API endpoint
    const root = {
        info: () => 1,
        feedForRxDBReplication: args => {
            console.log('## feedForRxDBReplication()');
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

    app.use(path, graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true,
    }));

    const server = app.listen(port, function () {
        console.log('Started server at http://localhost:'+ port + path);
    });

}

run();
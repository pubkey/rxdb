import express from 'express';
import * as path from 'path';
const graphqlHTTP = require('express-graphql');
const cors = require('cors');
import { PubSub } from 'graphql-subscriptions';
import {
    buildSchema,
    execute,
    subscribe
} from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { createServer } from 'http';

import {
    GRAPHQL_PORT,
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PORT,
    GRAPHQL_SUBSCRIPTION_PATH
} from '../shared';

function log(msg) {
    const prefix = '# GraphQL Server: ';
    if (typeof msg === 'string')
        console.log(prefix + msg);
    else console.log(prefix + JSON.stringify(msg, null, 2));
}

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

    // The root provides a resolver function for each API endpoint
    const root = {
        info: () => 1,
        feedForRxDBReplication: args => {
            log('## feedForRxDBReplication()');
            log(args);
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
            log('## setHuman()');
            log(args);
            const doc = args.human;
            documents = documents.filter(d => d.id !== doc.id);
            doc.updatedAt = Math.round(new Date().getTime() / 1000);
            documents.push(doc);

            pubsub.publish(
                'humanChanged',
                {
                    humanChanged: doc
                }
            );
            log('published humanChanged ' + doc.id);

            return doc;
        },
        humanChanged: () => pubsub.asyncIterator('humanChanged')
    };

    // server multitab.html - used in the e2e test
    app.use('/static', express.static(path.join(__dirname, '/static')));

    // server graphql-endpoint
    app.use(GRAPHQL_PATH, graphqlHTTP({
        schema: schema,
        rootValue: root,
        graphiql: true,
    }));


    app.listen(GRAPHQL_PORT, function () {
        log('Started graphql-endpoint at http://localhost:' +
            GRAPHQL_PORT + GRAPHQL_PATH
        );
    });



    const appSubscription = express();
    appSubscription.use(cors);
    const serverSubscription = createServer(appSubscription);
    serverSubscription.listen(GRAPHQL_SUBSCRIPTION_PORT, () => {
        log(
            'Started graphql-subscription endpoint at http://localhost:' +
            GRAPHQL_SUBSCRIPTION_PORT + GRAPHQL_SUBSCRIPTION_PATH
        );
        const subServer = new SubscriptionServer(
            {
                execute,
                subscribe,
                schema,
                rootValue: root
            },
            {
                server: serverSubscription,
                path: GRAPHQL_SUBSCRIPTION_PATH,
            }
        );
        return subServer;
    });


    // comment this in for testing of the subscriptions
    /*
    setInterval(() => {
        const flag = new Date().getTime();
        pubsub.publish(
            'humanChanged',
            {
                humanChanged: {
                    id: 'foobar-' + flag,
                    name: 'name-' + flag
                }
            }
        );
        console.log('published humanChanged ' + flag);
    }, 1000);*/
}

run();
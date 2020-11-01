import express from 'express';
import * as path from 'path';
const { graphqlHTTP } = require('express-graphql');
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
    GRAPHQL_SUBSCRIPTION_PATH,
    graphQLGenerationInput,
    JWT_BEARER_TOKEN
} from '../shared';

import {
    graphQLSchemaFromRxSchema
} from 'rxdb/plugins/replication-graphql';

function log(msg) {
    const prefix = '# GraphQL Server: ';
    if (typeof msg === 'string') {
        console.log(prefix + msg);
    } else {
        console.log(prefix + JSON.stringify(msg, null, 2));
    }
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


/**
 * Returns true if the request is authenticated
 * throws if not.
 * In a real world app you would parse and validate the bearer token.
 * @link https://graphql.org/graphql-js/authentication-and-express-middleware/
 */
export function authenticateRequest(request) {
    const authHeader = request.header('authorization');
    const splitted = authHeader.split(' ');
    const token = splitted[1];
    validateBearerToken(token);
}

export function validateBearerToken(token) {
    if (token === JWT_BEARER_TOKEN) {
        return true;
    } else {
        console.log('token not valid ' + token);
        throw new Error('not authenticated');
    }
}

export async function run() {
    let documents = [];
    const app = express();
    app.use(cors());

    /**
     * In this example we generate the GraphQL schema from the RxDB schema.
     * Of course you could also write it by hand or extend and existing one.
     */
    const generatedSchema = graphQLSchemaFromRxSchema(graphQLGenerationInput);
    const graphQLSchema = generatedSchema.asString;

    console.log('Server side GraphQL Schema:');
    console.log(graphQLSchema);
    const schema = buildSchema(graphQLSchema);

    const pubsub = new PubSub();

    // The root provides a resolver function for each API endpoint
    const root = {
        feedHero: (args, request) => {
            log('## feedHero()');
            log(args);
            authenticateRequest(request);

            if (!args.id) {
                // use empty string because it will always be first on sorting
                args.id = '';
            }

            // sorted by updatedAt and primary
            const sortedDocuments = documents.sort(sortByUpdatedAtAndPrimary);

            // only return where updatedAt >= minUpdatedAt
            const filterForMinUpdatedAtAndId = sortedDocuments.filter(doc => {
                if (!args.updatedAt) {
                    return true;
                }
                if (doc.updatedAt < args.updatedAt) {
                    return false;
                }
                if (doc.updatedAt > args.updatedAt) {
                    return true;
                }
                if (doc.updatedAt === args.updatedAt) {
                    if (doc.id > args.id) {
                        return true;
                    } else {
                        return false;
                    }
                }
            });

            // limit
            const limited = filterForMinUpdatedAtAndId.slice(0, args.limit);
            return limited;
        },
        setHero: (args, request) => {
            log('## setHero()');
            log(args);
            authenticateRequest(request);

            const doc = args.hero;
            documents = documents.filter(d => d.id !== doc.id);
            doc.updatedAt = Math.round(new Date().getTime() / 1000);
            documents.push(doc);

            pubsub.publish(
                'changedHero',
                {
                    changedHero: doc
                }
            );
            log('published changedHero ' + doc.id);

            return doc;
        },
        changedHero: (args) => {
            log('## changedHero()');
            console.dir(args);
            validateBearerToken(args.token);

            return pubsub.asyncIterator('changedHero');
        }
    };

    // server multitab.html - used in the e2e test
    app.use('/static', express.static(path.join(__dirname, '/static')));

    // server graphql-endpoint
    app.use(GRAPHQL_PATH,
        graphqlHTTP({
            schema: schema,
            rootValue: root,
            graphiql: true,
        })
    );


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

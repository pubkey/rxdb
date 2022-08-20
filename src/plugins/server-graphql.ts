import { newRxError } from '../rx-error';
import type {
    GraphQLServerOptions,
    GraphQLServerState,
    RxDatabase,
    RxPlugin
} from '../types';
import { createServer } from 'http';
import {
    buildSchema,
    execute,
    subscribe
} from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import express from 'express';
import {
    graphQLSchemaFromRxSchema,
    GraphQLSchemaFromRxSchemaInput
} from '../plugins/replication-graphql';

const SERVERS_OF_DB = new WeakMap();
const DBS_WITH_SERVER = new WeakSet();

export async function serverGraphQL(
    this: RxDatabase,
    options: GraphQLServerOptions
): Promise<GraphQLServerState> {
    const db: RxDatabase = this;
    if (!SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.set(db, []);
    }

    // remember to throw error if collection is created after the server is already there
    DBS_WITH_SERVER.add(db);
    const app = express();

    const createSchemaInput: GraphQLSchemaFromRxSchemaInput = {};
    Object.entries(this.collections).forEach(([collectionName, collection]) => {
        createSchemaInput[collectionName] = {
            schema: collection.schema.jsonSchema,
            checkpointFields: options.checkpointFields,
            deletedField: options.deletedField ? options.deletedField : '_deleted',
            headerFields: []
        };
    })

    console.log('createSchemaInput:');
    console.log(JSON.stringify(createSchemaInput, null, 4));
    const graphQLSchemaOutput = graphQLSchemaFromRxSchema(createSchemaInput);
    const graphQLSchema = buildSchema(graphQLSchemaOutput.asString);


    const root = {
        info: () => 1,
    };

    const ws = createServer(app);
    SERVERS_OF_DB.get(db).push(ws);
    const websocketUrl = 'ws://localhost:' + options.port + options.path;
    await new Promise<void>(res => {
        ws.listen(options.port, () => {
            const subServer = new SubscriptionServer(
                {
                    execute,
                    subscribe,
                    schema: graphQLSchema,
                    rootValue: root
                }, {
                server: ws,
                path: options.path,
            });
            res();
        });
    });

    return {
        server: ws,
        close: async () => {
            await ws.close();
        },
        url: websocketUrl
    }
}


/**
 * runs when the database gets destroyed
 */
export function onDestroy(db: RxDatabase) {
    if (SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.get(db).forEach((server: any) => server.close());
    }
}


/**
 * when a server is created, no more collections can be spawned
 */
function ensureNoMoreCollections(args: any) {
    if (DBS_WITH_SERVER.has(args.database)) {
        const err = newRxError(
            'S1', {
            collection: args.name,
            database: args.database.name
        }
        );
        throw err;
    }
}


export const RxDBServerGraphQLPlugin: RxPlugin = {
    name: 'server-couchdb',
    rxdb: true,
    init() { },
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.serverGraphQL = serverGraphQL;
        }
    },
    overwritable: {},
    hooks: {
        preDestroyRxDatabase: {
            after: onDestroy
        },
        preCreateRxCollection: {
            after: ensureNoMoreCollections
        }
    }
};

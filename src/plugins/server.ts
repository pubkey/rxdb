import * as os from 'os';
import * as nodePath from 'path';

import express from 'express';
import type { Express } from 'express';
import corsFn from 'cors';

import {
    addPouchPlugin,
    PouchDB,
    RxStoragePouch
} from '../plugins/pouchdb';
import {
    newRxError
} from '../rx-error';
import type {
    PouchDBExpressServerOptions,
    RxDatabase,
    RxPlugin,
    ServerResponse
} from '../types';

import {
    adapterObject,
    addRxPlugin,
    flatClone,
    PROMISE_RESOLVE_VOID
} from '../core';
import { RxDBReplicationCouchDBPlugin } from './replication-couchdb';
addRxPlugin(RxDBReplicationCouchDBPlugin);

import PouchAdapterHttp from 'pouchdb-adapter-http';
addPouchPlugin(PouchAdapterHttp);

let ExpressPouchDB: any;
try {
    ExpressPouchDB = require('express-pouchdb');
} catch (error) {
    console.error(
        'Since version 8.4.0 the module \'express-pouchdb\' is not longer delivered with RxDB.\n' +
        'You can install it with \'npm install express-pouchdb\''
    );
}

// we have to clean up after tests so there is no stupid logging
// @link https://github.com/pouchdb/pouchdb-server/issues/226
const PouchdbAllDbs = require('pouchdb-all-dbs');
PouchdbAllDbs(PouchDB);

const APP_OF_DB: WeakMap<RxDatabase, Express> = new WeakMap();
const SERVERS_OF_DB = new WeakMap();
const DBS_WITH_SERVER = new WeakSet();


const normalizeDbName = function (db: RxDatabase) {
    const splitted = db.name.split('/').filter((str: string) => str !== '');
    return splitted.pop();
};

const getPrefix = function (db: RxDatabase) {
    const splitted = db.name.split('/').filter((str: string) => str !== '');
    splitted.pop(); // last was the name
    if (splitted.length === 0) {
        return '';
    }
    let ret = splitted.join('/') + '/';
    if (db.name.startsWith('/')) {
        ret = '/' + ret;
    }
    return ret;
};

/**
 * tunnel requests so collection-names can be used as paths
 */
function tunnelCollectionPath(
    db: RxDatabase,
    path: string,
    app: Express,
    colName: string
) {
    const pathWithSlash = path.endsWith('/') ? path : path + '/';
    const collectionPath = pathWithSlash + colName;
    app.use(collectionPath, async function (req: any, res: any, next: any) {
        if (req.baseUrl.endsWith(collectionPath)) {

            while (!db[colName]) {
                // if the collection is migrated,
                // it can happen that it does not exist at this moment
                await new Promise(res1 => setTimeout(res1, 50));
            }
            const to = normalizeDbName(db) + '-rxdb-' + db[colName].schema.version + '-' + colName;
            const toFull = req.originalUrl.replace(collectionPath, pathWithSlash + to);
            req.originalUrl = toFull;
        }
        next();
    });
}

export async function spawnServer(
    this: RxDatabase,
    {
        path = '/db',
        port = 3000,
        cors = false,
        startServer = true,
        pouchdbExpressOptions = {}
    }
): Promise<ServerResponse> {
    const db: RxDatabase = this;
    const collectionsPath = startServer ? path : '/';
    if (!SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.set(db, []);
    }

    const storage: RxStoragePouch = db.storage as any;
    if (!storage.adapter) {
        throw new Error('The RxDB server plugin only works with pouchdb storage.');
    }

    const adapterObj = adapterObject(storage.adapter);
    const pouchDBOptions = Object.assign(
        { prefix: getPrefix(db), log: false },
        adapterObj,
    );

    const pseudo = PouchDB.defaults(pouchDBOptions);

    const app = express();
    APP_OF_DB.set(db, app);

    Object.keys(db.collections).forEach(colName => {
        // tunnel requests so collection-names can be used as paths
        tunnelCollectionPath(db, collectionsPath, app, colName);
    });



    // remember to throw error if collection is created after the server is already there
    DBS_WITH_SERVER.add(db);

    if (cors) {
        app.use(corsFn({
            'origin': function (origin, callback) {
                const originToSend: any = origin || '*';
                callback(null, originToSend);
            },
            'credentials': true,
            'methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
        }));
    }

    /**
     * Overwrite the defaults of PouchDBExpressServerOptions.
     * In RxDB the defaults should not polute anything with folders so we store the config in memory
     * and the logs in the tmp folder of the os.
     */
    const usePouchExpressOptions: PouchDBExpressServerOptions = flatClone(pouchdbExpressOptions);
    if (typeof usePouchExpressOptions.inMemoryConfig === 'undefined') {
        usePouchExpressOptions.inMemoryConfig = true;
    }
    if (typeof usePouchExpressOptions.logPath === 'undefined') {
        usePouchExpressOptions.logPath = nodePath.join(
            os.tmpdir(),
            'rxdb-server-log.txt'
        );
    }

    const pouchApp = ExpressPouchDB(pseudo, usePouchExpressOptions);
    app.use(collectionsPath, pouchApp);

    let server = null;
    let startupPromise: Promise<void> = PROMISE_RESOLVE_VOID;
    if (startServer) {
        /**
         * Listen for errors on server startup.
         * and properly handle the error instead of returning a startupPromise
         */
        startupPromise = new Promise((res, rej) => {
            let answered = false;
            server = app.listen(port, () => {
                if (!answered) {
                    answered = true;
                    res();
                }
            });
            server.on('error', (err) => {
                if (!answered) {
                    answered = true;
                    rej(err);
                }
            });
        });
        SERVERS_OF_DB.get(db).push(server);

        /**
         * When the database has no documents, there is no db file
         * and so the replication would not work.
         * This is a hack which ensures that the couchdb instance exists
         * and we can replicate even if there is no document in the beginning.
         */
        Promise.all(
            Object.values(db.collections).map(async (collection) => {
                const url = 'http://localhost:' + port + collectionsPath + '/' + collection.name;
                try {
                    const pingDb = new PouchDB(url);
                    await pingDb.info();
                    await pingDb.close();
                } catch (_err) { }
            })
        );
    }


    await startupPromise;
    const response: ServerResponse = {
        app,
        pouchApp,
        server
    };
    return response;
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

/**
 * runs when the database gets destroyed
 */
export function onDestroy(db: RxDatabase) {
    if (SERVERS_OF_DB.has(db)) {
        SERVERS_OF_DB.get(db).forEach((server: any) => server.close());
    }
}

export const RxDBServerPlugin: RxPlugin = {
    name: 'server',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.server = spawnServer;
        }
    },
    overwritable: {},
    hooks: {
        preDestroyRxDatabase: onDestroy,
        preCreateRxCollection: ensureNoMoreCollections
    }
};

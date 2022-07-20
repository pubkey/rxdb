import {
    Injectable,
    isDevMode
} from '@angular/core';

// import typings
import {
    RxHeroDocument,
    RxHeroesDatabase,
    RxHeroesCollections
} from './../RxDB.d';

import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';

import {
    addPouchPlugin, getRxStoragePouch
} from 'rxdb/plugins/pouchdb';

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBReplicationCouchDBPlugin } from 'rxdb/plugins/replication-couchdb';
import * as PouchdbAdapterHttp from 'pouchdb-adapter-http';
import * as PouchdbAdapterIdb from 'pouchdb-adapter-idb';
import { wrappedValidateIsMyJsonValidStorage } from 'rxdb/plugins/validate-is-my-json-valid';
import {
    COUCHDB_PORT,
    HERO_COLLECTION_NAME,
    DATABASE_NAME,
    IS_SERVER_SIDE_RENDERING
} from '../../shared';
import { HERO_SCHEMA, RxHeroDocumentType } from '../schemas/hero.schema';


const collectionSettings = {
    [HERO_COLLECTION_NAME]: {
        schema: HERO_SCHEMA,
        methods: {
            hpPercent(this: RxHeroDocument): number {
                return this.hp / this.maxHP * 100;
            }
        },
        sync: true
    }
};

const syncHost = IS_SERVER_SIDE_RENDERING ? 'localhost' : window.location.hostname;
const syncURL = 'http://' + syncHost + ':' + COUCHDB_PORT + '/' + DATABASE_NAME;
console.log('syncURL: ' + syncURL);


function doSync(): boolean {
    if (IS_SERVER_SIDE_RENDERING) {
        return true;
    }

    if (global.window.location.hash == '#nosync') {
        return false;
    }
    return true;
}


/**
 * Loads RxDB plugins
 */
async function loadRxDBPlugins(): Promise<void> {


    addRxPlugin(RxDBReplicationCouchDBPlugin);
    // http-adapter is always needed for replication with the node-server
    addPouchPlugin(PouchdbAdapterHttp);

    if (IS_SERVER_SIDE_RENDERING) {
        // for server side rendering, import the memory adapter
        const PouchdbAdapterMemory = require('pouchdb-adapter-' + 'memory');
        addPouchPlugin(PouchdbAdapterMemory);
    } else {
        // else, use indexeddb
        addPouchPlugin(PouchdbAdapterIdb);

        // then we also need the leader election
        addRxPlugin(RxDBLeaderElectionPlugin);
    }


    /**
     * to reduce the build-size,
     * we use some modules in dev-mode only
     */
    if (isDevMode() && !IS_SERVER_SIDE_RENDERING) {
        await Promise.all([

            // add dev-mode plugin
            // which does many checks and add full error-messages
            import('rxdb/plugins/dev-mode').then(
                module => addRxPlugin(module as any)
            ),

            // we use the schema-validation only in dev-mode
            // this validates each document if it is matching the jsonschema
            import('rxdb/plugins/validate').then(
                module => addRxPlugin(module as any)
            )
        ]);
    } else { }

}

/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {

    await loadRxDBPlugins();

    console.log('DatabaseService: creating database..');
    const db = await createRxDatabase<RxHeroesCollections>({
        name: DATABASE_NAME,
        /**
         * Because we directly store user input,
         * we use the validation wrapper to ensure
         * that the user can only input valid data.
         */
        storage: wrappedValidateIsMyJsonValidStorage({
            storage: getRxStoragePouch(IS_SERVER_SIDE_RENDERING ? 'memory' : 'idb')
        }),
        multiInstance: !IS_SERVER_SIDE_RENDERING
        // password: 'myLongAndStupidPassword' // no password needed
    });
    console.log('DatabaseService: created database');

    if (!IS_SERVER_SIDE_RENDERING) {
        // write to window for debugging
        (window as any)['db'] = db;
    }

    // show leadership in title
    if (!IS_SERVER_SIDE_RENDERING) {
        db.waitForLeadership()
            .then(() => {
                console.log('isLeader now');
                document.title = '♛ ' + document.title;
            });
    }

    // create collections
    console.log('DatabaseService: create collections');
    await db.addCollections(collectionSettings);

    // hooks
    console.log('DatabaseService: add hooks');
    db.collections.hero.preInsert(function (docObj: RxHeroDocumentType) {
        const color = docObj.color;
        return db.collections.hero
            .findOne({
                selector: {
                    color
                }
            })
            .exec()
            .then((has: RxHeroDocument | null) => {
                if (has != null) {
                    alert('another hero already has the color ' + color);
                    throw new Error('color already there');
                }
                return db;
            });
    }, false);

    // sync with server
    if (doSync()) {
        console.log('DatabaseService: sync');
        const collectionUrl = syncURL + '/' + HERO_COLLECTION_NAME;

        if (IS_SERVER_SIDE_RENDERING) {
            /**
             * For server side rendering,
             * we just run a one-time replication to ensure the client has the same data as the server.
             */
            console.log('DatabaseService: await initial replication to ensure SSR has all data');
            const firstReplication = await db.hero.syncCouchDB({
                remote: collectionUrl,
                options: {
                    live: false
                }
            });
            await firstReplication.awaitInitialReplication();
        }

        /**
         * we start a live replication which also sync the ongoing changes
         */
        await db.hero.syncCouchDB({
            remote: collectionUrl,
            options: {
                live: true
            }
        });
    }

    console.log('DatabaseService: created');

    return db;
}


let initState: null | Promise<any> = null;;
let DB_INSTANCE: RxHeroesDatabase;

/**
 * This is run via APP_INITIALIZER in app.module.ts
 * to ensure the database exists before the angular-app starts up
 */
export async function initDatabase() {
    /**
     * When server side rendering is used,
     * The database might already be there
     */
    if (!initState) {
        console.log('initDatabase()');
        initState = _create().then(db => DB_INSTANCE = db);
    }
    await initState;
}

@Injectable()
export class DatabaseService {
    get db(): RxHeroesDatabase {
        return DB_INSTANCE;
    }
}

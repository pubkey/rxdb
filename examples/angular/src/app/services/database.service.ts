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
    addRxPlugin,
    RxStorage
} from 'rxdb';
import {
    getRxStorageDexie
} from 'rxdb/plugins/storage-dexie';
import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';
import {
    SYNC_PORT,
    HERO_COLLECTION_NAME,
    DATABASE_NAME,
    IS_SERVER_SIDE_RENDERING
} from '../../shared';
import { HERO_SCHEMA, RxHeroDocumentType } from '../schemas/hero.schema';
import {
    replicateWithWebsocketServer
} from 'rxdb/plugins/replication-websocket';

import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';

const collectionSettings = {
    [HERO_COLLECTION_NAME]: {
        schema: HERO_SCHEMA,
        methods: {
            hpPercent(this: RxHeroDocument): number {
                return this.hp / 100 * 100;
            }
        },
        sync: true
    }
};

const syncHost = IS_SERVER_SIDE_RENDERING ? 'localhost' : window.location.hostname;
const syncURL = 'http://' + syncHost + ':' + SYNC_PORT + '/' + DATABASE_NAME;
console.log('syncURL: ' + syncURL);


function doSync(): boolean {
    if (IS_SERVER_SIDE_RENDERING) {
        return false;
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
    if (IS_SERVER_SIDE_RENDERING) {
    } else {
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
                module => addRxPlugin(module.RxDBDevModePlugin)
            )
        ]);
    } else { }

}

/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {

    await loadRxDBPlugins();


    let storage: RxStorage<any, any> = IS_SERVER_SIDE_RENDERING ? getRxStorageMemory() : getRxStorageDexie();
    if (isDevMode()) {
        // we use the schema-validation only in dev-mode
        // this validates each document if it is matching the jsonschema
        storage = wrappedValidateAjvStorage({ storage });
    }

    console.log('DatabaseService: creating database..');
    const db = await createRxDatabase<RxHeroesCollections>({
        name: DATABASE_NAME,
        storage,
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
        await Promise.all(
            Object.values(db.collections).map(async (col) => {
                try {
                    // create the CouchDB database
                    await fetch(
                        syncURL + col.name + '/',
                        {
                            method: 'PUT'
                        }
                    );
                } catch (err) { }
            })
        );
        /**
         * For server side rendering,
         * we just run a one-time replication to ensure the client has the same data as the server.
         */
        if (IS_SERVER_SIDE_RENDERING) {
            console.log('DatabaseService: await initial replication to ensure SSR has all data');
            const firstReplication = await replicateCouchDB({
                collection: db.hero,
                url: syncURL + db.hero.name + '/',
                live: false,
                pull: {},
                push: {}
            });
            await firstReplication.awaitInitialReplication();
        }

        /**
         * we start a live replication which also sync the ongoing changes
         */
        console.log('DatabaseService: start ongoing replication');
        const ongoingReplication = replicateCouchDB({
            collection: db.hero,
            url: syncURL + db.hero.name + '/',
            live: true,
            pull: {},
            push: {}
        });
        ongoingReplication.error$.subscribe(err => {
            console.log('Got replication error:');
            console.dir(err);
            console.error(err);
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

import {
    Injectable,
    isDevMode
} from '@angular/core';

// import typings
import {
    RxHeroDocument,
    RxHeroesDatabase,
    RxHeroesCollections,
    RxHeroDocumentType
} from './../RxDB.d';

/**
 * Instead of using the default rxdb-import,
 * we do a custom build which lets us cherry-pick
 * only the modules that we need.
 * A default import would be: import RxDB from 'rxdb';
 */
import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb/plugins/core';
import { RxDBNoValidatePlugin } from 'rxdb/plugins/no-validate';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBReplicationPlugin } from 'rxdb/plugins/replication';
import * as PouchdbAdapterHttp from 'pouchdb-adapter-http';
import * as PouchdbAdapterIdb from 'pouchdb-adapter-idb';
import {
    COUCHDB_PORT,
    HERO_COLLECTION_NAME,
    DATABASE_NAME
} from '../../shared';
import { HERO_SCHEMA } from '../schemas/hero.schema';

let collections = [
    {
        name: HERO_COLLECTION_NAME,
        schema: HERO_SCHEMA,
        methods: {
            hpPercent(this: RxHeroDocument): number {
                return this.hp / this.maxHP * 100;
            }
        },
        sync: true
    }
];

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':' + COUCHDB_PORT + '/' + DATABASE_NAME;

let doSync = true;
if (window.location.hash == '#nosync') doSync = false;


async function loadRxDBPlugins(): Promise<any> {


    addRxPlugin(RxDBLeaderElectionPlugin);

    addRxPlugin(RxDBReplicationPlugin);
    // http-adapter is always needed for replication with the node-server
    addRxPlugin(PouchdbAdapterHttp);

    /**
     * indexed-db adapter
     */
    addRxPlugin(PouchdbAdapterIdb);

    /**
     * to reduce the build-size,
     * we use some modules in dev-mode only
     */
    if (isDevMode()) {
        await Promise.all([

            // add dev-mode plugin
            // which does many checks and add full error-messages
            import('rxdb/plugins/dev-mode').then(
                module => addRxPlugin(module)
            ),

            // we use the schema-validation only in dev-mode
            // this validates each document if it is matching the jsonschema
            import('rxdb/plugins/validate').then(
                module => addRxPlugin(module)
            )
        ]);
    } else {
        // in production we use the no-validate module instead of the schema-validation
        // to reduce the build-size
        addRxPlugin(RxDBNoValidatePlugin);
    }

}

/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {

    await loadRxDBPlugins();

    console.log('DatabaseService: creating database..');
    const db = await createRxDatabase<RxHeroesCollections>({
        name: 'angularheroes',
        adapter: 'idb'
        // password: 'myLongAndStupidPassword' // no password needed
    });
    console.log('DatabaseService: created database');
    (window as any)['db'] = db; // write to window for debugging

    // show leadership in title
    db.waitForLeadership()
        .then(() => {
            console.log('isLeader now');
            document.title = '♛ ' + document.title;
        });

    // create collections
    console.log('DatabaseService: create collections');
    await Promise.all(collections.map(colData => db.collection(colData)));

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
    if (doSync) {
        console.log('DatabaseService: sync');
        await db.hero.sync({
            remote: syncURL + '/' + HERO_COLLECTION_NAME
        });
    }

    return db;
}

let DB_INSTANCE: RxHeroesDatabase;

/**
 * This is run via APP_INITIALIZER in app.module.ts
 * to ensure the database exists before the angular-app starts up
 */
export async function initDatabase() {
    console.log('initDatabase()');
    DB_INSTANCE = await _create();
}

@Injectable()
export class DatabaseService {
    get db(): RxHeroesDatabase {
        return DB_INSTANCE;
    }
}

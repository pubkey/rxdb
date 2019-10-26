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

import heroSchema from '../schemas/hero.schema';

/**
 * Instead of using the default rxdb-import,
 * we do a custom build which lets us cherry-pick
 * only the modules that we need.
 * A default import would be: import RxDB from 'rxdb';
 */
import RxDB from 'rxdb/plugins/core';
import RxDBNoValidateModule from 'rxdb/plugins/no-validate';
import RxDBLeaderElectionModule from 'rxdb/plugins/leader-election';
import RxDBReplicationModule from 'rxdb/plugins/replication';
import * as PouchdbAdapterHttp from 'pouchdb-adapter-http';
import * as PouchdbAdapterIdb from 'pouchdb-adapter-idb';

let collections = [
    {
        name: 'hero',
        schema: heroSchema,
        methods: {
            hpPercent(this: RxHeroDocument): number {
                return this.hp / this.maxHP * 100;
            }
        },
        sync: true
    }
];

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10101/';

let doSync = true;
if (window.location.hash == '#nosync') doSync = false;


async function loadRxDBPlugins(): Promise<any> {


    RxDB.plugin(RxDBLeaderElectionModule);

    RxDB.plugin(RxDBReplicationModule);
    // http-adapter is always needed for replication with the node-server
    RxDB.plugin(PouchdbAdapterHttp);

    /**
     * indexed-db adapter
     */
    RxDB.plugin(PouchdbAdapterIdb);

    /**
     * to reduce the build-size,
     * we use some modules in dev-mode only
     */
    if (isDevMode()) {
        await Promise.all([

            // schema-checks should be used in dev-mode only
            // this module checks if your schema is correct
            import('rxdb/plugins/schema-check').then(
                module => RxDB.plugin(module)
            ),

            // in dev-mode we show full error-messages
            // instead of RxErrors with theirs keys
            import('rxdb/plugins/error-messages').then(
                module => RxDB.plugin(module)
            ),

            // we use the schema-validation only in dev-mode
            // this validates each document if it is matching the jsonschema
            import('rxdb/plugins/validate').then(
                module => RxDB.plugin(module)
            )
        ]);
    } else {
        // in production we use the no-validate module instead of the schema-validation
        // to reduce the build-size
        RxDB.plugin(RxDBNoValidateModule);
    }

}

/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {

    await loadRxDBPlugins();

    console.log('DatabaseService: creating database..');
    const db = await RxDB.create<RxHeroesCollections>({
        name: 'angularheroes',
        adapter: 'idb',
        queryChangeDetection: true
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
        return db.collections.hero.findOne({ color }).exec()
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
            remote: syncURL + '/hero'
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

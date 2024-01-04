import {
    Injectable
} from '@angular/core';

// import typings
import {
    RxHeroDocument,
    RxHeroesDatabase,
    RxHeroesCollections
} from './../RxDB.d';

import {
    environment
} from '../../environments/environment';

import {
    createRxDatabase
} from 'rxdb';

import {
    HERO_COLLECTION_NAME,
    DATABASE_NAME
} from '../../shared';
import {
    HERO_SCHEMA,
    RxHeroDocumentType
} from '../schemas/hero.schema';

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

console.log('syncURL: ' + environment.rxdbSyncUrl);


function doSync(): boolean {
    if (environment.isServerSideRendering) {
        return false;
    }

    if (window.location.hash == '#nosync') {
        return false;
    }
    return true;
}



/**
 * creates the database
 */
async function _create(): Promise<RxHeroesDatabase> {
    environment.addRxDBPlugins();

    console.log('DatabaseService: creating database..');
    const db = await createRxDatabase<RxHeroesCollections>({
        name: DATABASE_NAME,
        storage: environment.getRxStorage(),
        multiInstance: environment.multiInstance
        // password: 'myLongAndStupidPassword' // no password needed
    });
    console.log('DatabaseService: created database');

    if (!environment.isServerSideRendering) {
        // write to window for debugging
        (window as any)['db'] = db;
    }

    // show leadership in title
    if (environment.multiInstance) {
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
                        environment.rxdbSyncUrl + col.name + '/',
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
        if (environment.isServerSideRendering) {
            console.log('DatabaseService: await initial replication to ensure SSR has all data');
            const firstReplication = await replicateCouchDB({
                replicationIdentifier: 'couch-server-side-sync',
                collection: db.hero,
                url: environment.rxdbSyncUrl + db.hero.name + '/',
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
            replicationIdentifier: 'couch-client-side-sync',
            collection: db.hero,
            url: environment.rxdbSyncUrl + db.hero.name + '/',
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

import {
    Injector, Injectable, Signal, untracked
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

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
    RxReactivityFactory,
    createRxDatabase
} from 'rxdb/plugins/core';

import {
    HERO_COLLECTION_NAME,
    DATABASE_NAME
} from '../../shared';
import {
    HERO_SCHEMA,
    RxHeroDocumentType
} from '../schemas/hero.schema';

import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { startSync } from './replication';

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
async function _create(injector: Injector): Promise<RxHeroesDatabase> {
    environment.addRxDBPlugins();

    console.log('DatabaseService: creating database..');

    /**
     * Add the Reactivity Factory so that we can get angular Signals
     * instead of observables.
     * @link https://rxdb.info/reactivity.html
     */
    const reactivityFactory: RxReactivityFactory<Signal<any>> = {
        fromObservable(obs, initialValue: any) {
            return untracked(() =>
                toSignal(obs, {
                    initialValue,
                    injector,
                    rejectErrors: true
                })
            );
        }
    }


    const db = await createRxDatabase<RxHeroesCollections>({
        name: DATABASE_NAME,
        storage: environment.getRxStorage(),
        multiInstance: environment.multiInstance,
        reactivity: reactivityFactory
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
        await startSync(
            db,
            environment
        );
    }


    console.log('DatabaseService: created');

    return db as any;
}


let initState: null | Promise<any> = null;;
let DB_INSTANCE: RxHeroesDatabase;

/**
 * This is run via APP_INITIALIZER in app.module.ts
 * to ensure the database exists before the angular-app starts up
 */
export async function initDatabase(injector: Injector) {
    if (!injector) {
        throw new Error('initDatabase() injector missing');
    }

    /**
     * When server side rendering is used,
     * The database might already be there
     */
    if (!initState) {
        console.log('initDatabase()');
        initState = _create(injector).then(db => DB_INSTANCE = db);
    }
    await initState;
}

@Injectable()
export class DatabaseService {
    get db(): RxHeroesDatabase {
        return DB_INSTANCE;
    }
}

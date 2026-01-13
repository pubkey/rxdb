import { Injectable, Injector, inject } from '@angular/core';
import { createReactivityFactory } from 'rxdb/plugins/reactivity-angular';

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
} from 'rxdb/plugins/core';

import {
    HERO_COLLECTION_NAME,
    DATABASE_NAME
} from '../../shared';
import {
    HERO_SCHEMA,
    RxHeroDocumentType
} from '../schemas/hero.schema';

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

    if (typeof window !== 'undefined' && window.location.hash == '#nosync') {
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
        multiInstance: environment.multiInstance,
        reactivity: createReactivityFactory(inject(Injector)),
        ignoreDuplicate: !environment.production && environment.isServerSideRendering,
        // password: 'myLongAndStupidPassword' // no password needed
    }) as RxHeroesDatabase;
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
                if (typeof document !== 'undefined') {
                    document.title = '♛ ' + document.title;
                }
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

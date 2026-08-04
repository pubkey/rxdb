import { Injectable, isDevMode } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { addRxPlugin, createRxDatabase, RxStorage } from 'rxdb';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { getRxStorageLocalstorage } from 'rxdb/plugins/storage-localstorage';

import type { RxHeroesDatabase } from '../RxDB.d';
import { HERO_SCHEMA } from '../schemas/hero.schema';

export const DATABASE_NAME = 'heroesdb';

/**
 * On native platforms there is only one webview,
 * so RxDB does not have to coordinate multiple browser tabs.
 */
const isNative = Capacitor.isNativePlatform();

function getStorage(): RxStorage<any, any> {
    /**
     * The localstorage RxStorage works in the browser and inside of the
     * Capacitor webview on Android and iOS.
     * For big datasets on native devices you might want to use the
     * SQLite RxStorage instead.
     * @link https://rxdb.info/rx-storage-sqlite.html
     */
    return getRxStorageLocalstorage();
}

async function _create(): Promise<RxHeroesDatabase> {
    if (isDevMode()) {
        /**
         * The dev-mode plugin adds many checks and validations.
         * Never use it in production because it slows down the database.
         * @link https://rxdb.info/dev-mode.html
         */
        const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
        addRxPlugin(RxDBDevModePlugin);
    }
    if (!isNative) {
        addRxPlugin(RxDBLeaderElectionPlugin);
    }

    console.log('DatabaseService: creating database..');
    const db: RxHeroesDatabase = await createRxDatabase({
        name: DATABASE_NAME,
        storage: getStorage(),
        multiInstance: !isNative
    });
    console.log('DatabaseService: created database');

    // write to window for debugging
    (window as any)['db'] = db;

    await db.addCollections({
        hero: {
            schema: HERO_SCHEMA
        }
    });

    /**
     * Hooks run on every write, also on writes that come in via replication.
     * @link https://rxdb.info/middleware.html
     */
    db.hero.preInsert(async docData => {
        const hasColor = await db.hero.findOne({
            selector: { color: docData.color }
        }).exec();
        if (hasColor) {
            throw new Error('another hero already has the color ' + docData.color);
        }
    }, false);

    if (!isNative) {
        // show leadership in the browser tab title
        db.waitForLeadership().then(() => {
            console.log('isLeader now');
            document.title = '♛ ' + document.title;
        });
    }

    return db;
}

let initState: null | Promise<any> = null;
let DB_INSTANCE: RxHeroesDatabase;

/**
 * This is run via provideAppInitializer in main.ts
 * to ensure the database exists before the app starts up.
 */
export async function initDatabase() {
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

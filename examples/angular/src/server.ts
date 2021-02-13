/**
 * In this file we use RxDB in nodejs
 * We start a couchdb-compliant endpoint
 * that is used by the frontend to replicate all data
 */
import {
    addRxPlugin,
    createRxDatabase
} from 'rxdb/plugins/core';

// rxdb plugins
import { RxDBServerPlugin } from 'rxdb/plugins/server';
addRxPlugin(RxDBServerPlugin);
import { RxDBValidatePlugin } from 'rxdb/plugins/validate';
addRxPlugin(RxDBValidatePlugin);


// add the memory-adapter
import * as MemoryAdapter from 'pouchdb-adapter-memory';
addRxPlugin(MemoryAdapter);

import { HERO_SCHEMA } from './app/schemas/hero.schema';
import {
    HERO_COLLECTION_NAME,
    COUCHDB_PORT,
    DATABASE_NAME
} from './shared';
import type { RxHeroesDatabase } from './app/RxDB';



async function run() {
    console.log('# create database');
    const db = await createRxDatabase<RxHeroesDatabase>({
        name: DATABASE_NAME,
        adapter: 'memory'
    });

    await db.addCollections({
        [HERO_COLLECTION_NAME]: {
            schema: HERO_SCHEMA
        }
    });

    console.log('# add some default heroes');
    await db.hero.bulkInsert([
        {
            name: 'Frodo',
            color: '#032c33',
            hp: 30,
            maxHP: 50,
            skills: [
                {
                    name: 'use the ring',
                    damage: 0
                }
            ]
        }, {
            name: 'Gandalf',
            color: '#5d686c',
            hp: 100,
            maxHP: 100,
            skills: []
        }
    ]);


    // start server
    const { app, server } = db.server({
        path: '/' + DATABASE_NAME, // (optional)
        port: COUCHDB_PORT,  // (optional)
        cors: true,   // (optional), enable CORS-headers
        startServer: true, // (optional), start express server
        // options of the pouchdb express server
        pouchdbExpressOptions: {
            inMemoryConfig: true, // do not write a config.json
            logPath: '/tmp/rxdb-angular-server-log.txt' // save logs in tmp folder
        }
    });

    console.log(
        '# Started server on http://localhost:' + COUCHDB_PORT + '/' + DATABASE_NAME + '/' + HERO_COLLECTION_NAME
    );
}

run();

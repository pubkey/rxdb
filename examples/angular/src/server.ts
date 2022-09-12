/**
 * In this file we use RxDB in nodejs
 * We start a couchdb-compliant endpoint
 * that is used by the frontend to replicate all data
 */
import {
    addRxPlugin,
    createRxDatabase
} from 'rxdb';

import {
    addPouchPlugin,
    getRxStoragePouch
} from 'rxdb/plugins/pouchdb';

// rxdb plugins
import { RxDBServerCouchDBPlugin } from 'rxdb/plugins/server-couchdb';
addRxPlugin(RxDBServerCouchDBPlugin);
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';


// add the memory-adapter
import * as MemoryAdapter from 'pouchdb-adapter-memory';
addPouchPlugin(MemoryAdapter);

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
        storage: wrappedValidateAjvStorage({
            storage: getRxStoragePouch('memory')
        })
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
            hp: 30
        }, {
            name: 'Gandalf',
            color: '#5d686c',
            hp: 100
        }
    ]);


    // start server
    const { app, server } = await db.serverCouchDB({
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


    db.hero.find().$.subscribe(heroes => {
        const tableData: any = {};
        heroes.forEach((hero, idx) => {
            tableData[idx] = {
                name: hero.name,
                color: hero.color,
                hp: hero.hp
            };
        });
        console.clear();
        console.log('');
        console.log('##                                ##');
        console.log('##   RxDB Heroes Node.js Server   ##');
        console.log('##                                ##');
        console.log('');
        console.log('');
        console.table(tableData);
        console.log('');
        console.log('');
    });

}

run();

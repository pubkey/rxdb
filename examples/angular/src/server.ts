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
    getRxStorageMemory
} from 'rxdb/plugins/memory';

import {
    startWebsocketServer
} from 'rxdb/plugins/replication-websocket';

// rxdb plugins
import { RxDBServerCouchDBPlugin } from 'rxdb/plugins/server-couchdb';
addRxPlugin(RxDBServerCouchDBPlugin);
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';


import { HERO_SCHEMA } from './app/schemas/hero.schema';
import {
    HERO_COLLECTION_NAME,
    WEBSOCKET_PORT,
    DATABASE_NAME
} from './shared';
import type { RxHeroesDatabase } from './app/RxDB';



async function run() {
    console.log('# create database');
    const db = await createRxDatabase<RxHeroesDatabase>({
        name: DATABASE_NAME,
        storage: wrappedValidateAjvStorage({
            storage: getRxStorageMemory()
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
    const serverState = await startWebsocketServer({
        database: db,
        port: WEBSOCKET_PORT,
        path: DATABASE_NAME
    });
    console.log(
        '# Started server on http://localhost:' + WEBSOCKET_PORT + '/' + DATABASE_NAME + '/' + HERO_COLLECTION_NAME
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

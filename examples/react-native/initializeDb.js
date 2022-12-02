import { addRxPlugin, createRxDatabase } from 'rxdb';
import fetch from 'cross-fetch';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration'
import { RxDBUpdatePlugin } from 'rxdb/plugins/update'
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder'
import { RxDBReplicationCouchDBNewPlugin } from 'rxdb/plugins/replication-couchdb-new'

addRxPlugin(RxDBMigrationPlugin)
addRxPlugin(RxDBUpdatePlugin)
addRxPlugin(RxDBQueryBuilderPlugin)
addRxPlugin(RxDBReplicationCouchDBNewPlugin)

import schema from './src/Schema';

import {
    STORAGE
} from './storage';

const syncURL = 'http://admin:mysecret1@localhost:5984'; // Replace with your couchdb instance
const dbName = 'heroesreactdatabase1';
export const HeroesCollectionName = 'heroes';

const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PROD === 'true';

const initialize = async () => {
    if (isDevelopment) {
        await addRxPlugin(RxDBDevModePlugin);
    }

    let db;

    try {
        console.log('Initializing database...');
        db = await createRxDatabase({
            name: dbName,
            storage: STORAGE,
            multiInstance: false,
            ignoreDuplicate: true,
        });
        console.log('Database initialized!');
    } catch (err) {
        console.log('ERROR CREATING DATABASE', err);
    }

    try {
        console.log('Adding hero collection...');
        await db.addCollections({
            [HeroesCollectionName]: {
                schema: schema,
            },
        });
        console.log('Collection added!');
    } catch (err) {
        console.log('ERROR CREATING COLLECTION', err);
    }


    try {
        console.log('Start sync...');
        const replicationState = db[HeroesCollectionName].syncCouchDBNew({
            url: `${syncURL}/${HeroesCollectionName}/`,
            fetch: fetch,
            pull: {},
            push: {}
        });

        console.dir(replicationState);

        replicationState.active$.subscribe((v) => {
            console.log('Replication active$:', v)
        })
        replicationState.canceled$.subscribe((v) => {
            console.log('Replication canceled$:', v)
        })
        replicationState.error$.subscribe(async error => {
            console.error('Replication error$:',error)
        })
    } catch (err) {
        console.log('Error initialize sync', err);
    }

    return db;
};

export default initialize;

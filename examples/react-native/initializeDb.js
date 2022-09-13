import { addRxPlugin, createRxDatabase } from 'rxdb';
import { addPouchPlugin, getRxStoragePouch } from 'rxdb/plugins/pouchdb';

// import { getRxStorageMemory } from 'rxdb/plugins/memory';
import PouchdbAdapterMemory from 'pouchdb-adapter-memory';
import PouchdbAdapterHttp from 'pouchdb-adapter-http';
import PouchdbReplication from 'pouchdb-replication';
// import PouchdbAdapterAsync from 'pouchdb-adapter-asyncstorage';

import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBMigrationPlugin } from 'rxdb/plugins/migration'
import { RxDBUpdatePlugin } from 'rxdb/plugins/update'
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder'
import { RxDBReplicationCouchDBPlugin } from 'rxdb/plugins/replication-couchdb'

addPouchPlugin(PouchdbAdapterMemory);
addPouchPlugin(PouchdbAdapterHttp);
addPouchPlugin(PouchdbReplication);
// addPouchPlugin(PouchdbAdapterAsync);

addRxPlugin(RxDBMigrationPlugin)
addRxPlugin(RxDBUpdatePlugin)
addRxPlugin(RxDBQueryBuilderPlugin)
addRxPlugin(RxDBReplicationCouchDBPlugin)

import schema from './src/Schema';


const syncURL = 'http://admin:mysecret1@localhost:5984'; // Replace with you couchdb instance
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
            // storage: getRxStorageMemory(), // RxStorageMemory
            storage: getRxStoragePouch('memory'), // PouchDbAdapted
            // storage: getRxStoragePouch('asyncstorage'), // PouchDbAdapted
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
        const rxReplicationState = db[HeroesCollectionName].syncCouchDB({
            remote: `${syncURL}/${HeroesCollectionName}/`,
            options: {
                live: true,
                retry: true,
            },
            waitForLeadership: false,
            direction: {
                push: true,
                pull: true,
            }
        });

        rxReplicationState.change$.subscribe((v) => {
            console.log('Replication change$:', v)
        })
        rxReplicationState.complete$.subscribe((v) => {
            console.log('Replication complete$:', v)
        })
        rxReplicationState.error$.subscribe(async error => {
            console.error('Replication error$:',error)
        })
    } catch (err) {
        console.log('Error initialize sync', err);
    }

    return db;
};

export default initialize;

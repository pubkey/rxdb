import { addRxPlugin, createRxDatabase } from 'rxdb';
import { getRxStorageMemory } from 'rxdb/plugins/memory';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { addPouchPlugin } from 'rxdb/plugins/pouchdb';
import { RxDBReplicationCouchDBPlugin } from 'rxdb/plugins/replication-couchdb';
import PouchdbAdapterHttp from 'pouchdb-adapter-http';
import PouchdbReplication from 'pouchdb-replication';

import schema from './src/Schema';

addPouchPlugin(PouchdbAdapterHttp);
addPouchPlugin(PouchdbReplication);
addRxPlugin(RxDBReplicationCouchDBPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);

// const syncURL = 'http://localhost:10102/'; // Replace localhost with a public ip address!
const dbName = 'heroesreactdatabase1';
const HeroesCollectionName = 'heroes';

const isDevelopment = process.env.NODE_ENV !== 'production' || process.env.DEBUG_PROD === 'true';

const initialize = async () => {
    if (isDevelopment) {
        const { RxDBDevModePlugin } = await import('rxdb/plugins/dev-mode');
        await addRxPlugin(RxDBDevModePlugin);
    }

    let db;
    try {
        console.log('Initializing database...');
        db = await createRxDatabase({
            name: dbName,
            storage: getRxStorageMemory(),
            multiInstance: false,
            ignoreDuplicate: true,
        });
        console.log('Database initialized!');
    } catch (err) {
        console.log('ERROR CREATING DATABASE', err);
    }
    console.log('Adding hero collection...');
    try {
        await db.addCollections({
            [HeroesCollectionName]: {
                schema: schema,
            },
        });

        // TODO
        // const rxReplicationState = db.collections[HeroesCollectionName].syncCouchDB({
        //     remote: syncURL + dbName + '/',
        //     options: {
        //         live: true,
        //         retry: true,
        //     },
        // });
        //
        // rxReplicationState.error$.subscribe(async error => {
        //     console.error(error)
        // })
    } catch (err) {
        console.log('ERROR CREATING COLLECTION', err);
    }

    return db;
};

export default initialize;

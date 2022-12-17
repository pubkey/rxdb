import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';
import {
    getRxStorageDexie
} from 'rxdb/plugins/dexie';
import {
    heroSchema
} from './Schema';

import { RxDBReplicationCouchDBPlugin } from 'rxdb/plugins/replication-couchdb';
addRxPlugin(RxDBReplicationCouchDBPlugin);

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);

const syncURL = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL);

let dbPromise = null;

const _create = async () => {
    console.log('DatabaseService: creating database..');
    const db = await createRxDatabase({
        name: 'heroesreactdb',
        storage: getRxStorageDexie()
    });
    console.log('DatabaseService: created database');
    window['db'] = db; // write to window for debugging

    // show leadership in title
    db.waitForLeadership().then(() => {
        console.log('isLeader now');
        document.title = '♛ ' + document.title;
    });

    // create collections
    console.log('DatabaseService: create collections');
    await db.addCollections({
        heroes: {
            schema: heroSchema,
            methods: {
                hpPercent() {
                    return this.hp / this.maxHP * 100;
                }
            }
        }
    });

    // hooks
    console.log('DatabaseService: add hooks');
    db.collections.heroes.preInsert(docObj => {
        const { color } = docObj;
        return db.collections.heroes.findOne({
            selector: { color }
        }).exec().then(has => {
            if (has !== null) {
                console.error('another hero already has the color ' + color);
                throw new Error('color already there');
            }
            return db;
        });
    });

    // sync

    console.log('DatabaseService: sync');
    await Promise.all(
        Object.values(db.collections).map(async (col) => {
            try {
                // create the CouchDB database
                await fetch(
                    syncURL + col.name + '/',
                    {
                        method: 'PUT'
                    }
                );
            } catch (err) { }
        })
    );
    Object.values(db.collections).map(col => col.name).map(colName => db[colName].syncCouchDB({
        url: syncURL + colName + '/',
        live: true,
        pull: {},
        push: {}
    }));

    return db;
};

export const get = () => {
    if (!dbPromise)
        dbPromise = _create();
    return dbPromise;
};

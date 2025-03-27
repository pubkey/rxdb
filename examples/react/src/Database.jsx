import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';
import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';
import {
    heroSchema
} from './Schema';

import { replicateCouchDB } from 'rxdb/plugins/replication-couchdb';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);

const syncURL = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL);
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
let dbPromise = null;

const _create = async () => {
    addRxPlugin(RxDBDevModePlugin);

    console.log('DatabaseService: creating database..');
    const db = await createRxDatabase({
        name: 'heroesreactdb',
        storage: wrappedValidateAjvStorage({ storage: getRxStorageLocalstorage() })
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
    console.log('DatabaseService: sync - start live');
    Object.values(db.collections).map(col => col.name).map(colName => {
        const url = syncURL + colName + '/';
        console.log('url: ' + url);
        const replicationState = replicateCouchDB({
            collection: db[colName],
            url,
            live: true,
            pull: {},
            push: {},
            autoStart: true
        });
        replicationState.error$.subscribe(err => {
            console.log('Got replication error:');
            console.dir(err);
        });
    });

    return db;
};

export const get = () => {
    if (!dbPromise)
        dbPromise = _create();
    return dbPromise;
};

import * as RxDB from '../../../';
import schema from './Schema';
RxDB.plugin(require('pouchdb-adapter-idb'));
RxDB.plugin(require('pouchdb-replication')); //enable syncing
RxDB.plugin(require('pouchdb-adapter-http')); //enable syncing over http

const syncURL = 'http://' + window.location.hostname + ':10102/';
console.log('host: ' + syncURL);
// const syncURL = host;

let dbPromise = null;

const create = async function() {
    const db = await RxDB.create({name: 'heroesreactdb', adapter: 'idb', password: 'myLongAndStupidPassword'});
    await db.collection({name: 'heroes', schema});

    // sync
    console.log('DatabaseService: sync');
    db.heroes.sync(syncURL + 'heroes/');
    return db;
};

export function get() {
    if (!dbPromise)
        dbPromise = create();
    return dbPromise;
}

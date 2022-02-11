import {
    createRxDatabase
} from '../';
import {
    getRxStoragePouch,
    addPouchPlugin
} from '../plugins/pouchdb';

function run() {
    addPouchPlugin(require('pouchdb-adapter-idb'));
    createRxDatabase({
        // the name of the database
        name: 'heroesdb',
        // use pouchdb with the indexeddb-adapter as storage engine.
        storage: getRxStoragePouch('idb')
    }).then(db => {
        return db.destroy();
    });
}
run();

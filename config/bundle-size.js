import {
    createRxDatabase
} from '../';
import {
    getRxStorageMemory,
} from '../plugins/storage-memory';

function run() {
    createRxDatabase({
        name: 'heroesdb',
        storage: getRxStorageMemory()
    }).then(db => {
        return db.destroy();
    });
}
run();

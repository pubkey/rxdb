import {
    createRxDatabase
} from '../plugins/core/index.mjs';
import {
    getRxStorageMemory,
} from '../plugins/storage-memory/index.mjs';

function run() {
    createRxDatabase({
        name: 'heroesdb',
        storage: getRxStorageMemory()
    }).then(db => {
        return db.destroy();
    });
}
run();

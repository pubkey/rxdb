const { createRxDatabase, addRxPlugin } = require('rxdb');
const { RxDBEncryptionPlugin } = require('rxdb/plugins/encryption');
const { RxDBQueryBuilderPlugin } = require('rxdb/plugins/query-builder');
const { RxDBLeaderElectionPlugin } = require('rxdb/plugins/leader-election');
const { getRxStoragePouch, addPouchPlugin } = require('rxdb/plugins/pouchdb');

addRxPlugin(RxDBEncryptionPlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);

addPouchPlugin(require('pouchdb-adapter-memory'));

const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 100
        },
        color: {
            type: 'string'
        }
    },
    required: ['name', 'color']
};

let _getDatabase; // cached
function getDatabase(name, adapter) {
    if (!_getDatabase) {
        _getDatabase = createDatabase(name, adapter);
    }
    return _getDatabase;
}

async function createDatabase(name, adapter) {
    const db = await createRxDatabase({
        name,
        storage: getRxStoragePouch(adapter),
        password: 'myLongAndStupidPassword'
    });

    console.log('creating hero-collection..');
    await db.addCollections({
        heroes: {
            schema: heroSchema
        }
    });

    return db;
}
module.exports = {
    getDatabase
};

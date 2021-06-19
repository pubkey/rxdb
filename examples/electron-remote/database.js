const {
    createRxDatabase,
    addPouchPlugin,
    getRxStoragePouch
} = require('rxdb');
addPouchPlugin(require('pouchdb-adapter-memory'));

const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        color: {
            type: 'string'
        }
    },
    required: ['color']
};

let _getDatabase; // cached
function getDatabase(name, adapter) {
    if (!_getDatabase) _getDatabase = createDatabase(name, adapter);
    return _getDatabase;
}

async function createDatabase(name, adapter) {
    const db = await createRxDatabase({
        name,
        storage: getRxStoragePouch(adapter),
        password: 'myLongAndStupidPassword'
    });

    console.log('creating hero-collection..');
    await db.collection({
        name: 'heroes',
        schema: heroSchema
    });

    return db;
}
module.exports = {
    getDatabase
};

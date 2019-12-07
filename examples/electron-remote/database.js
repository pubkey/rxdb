const RxDB = require('rxdb');
RxDB.plugin(require('pouchdb-adapter-memory'));

const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    type: 'object',
    properties: {
        name: {
            type: 'string',
            primary: true
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
    const db = await RxDB.create({
        name,
        adapter,
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

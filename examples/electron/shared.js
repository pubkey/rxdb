const { createRxDatabase, addRxPlugin } = require('rxdb');
const { RxDBQueryBuilderPlugin } = require('rxdb/plugins/query-builder');
const { RxDBDevModePlugin } = require('rxdb/plugins/dev-mode');

addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBDevModePlugin);

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

async function getDatabase(name, storage) {
    const db = await createRxDatabase({
        name,
        storage
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

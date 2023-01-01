require('babel-polyfill');
const {
    createRxDatabase,
    addRxPlugin
} = require('../../../');
const {
    getRxStorageMemory
} = require('../../../plugins/storage-memory');

const { RxDBQueryBuilderPlugin } = require('../../../plugins/query-builder');
addRxPlugin(RxDBQueryBuilderPlugin);

const { RxDBLeaderElectionPlugin } = require('../../../plugins/leader-election');
addRxPlugin(RxDBLeaderElectionPlugin);

const Database = {};

const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            primary: true,
            maxLength: 100
        },
        color: {
            type: 'string'
        }
    },
    required: ['color']
};


const create = async () => {
    const database = await createRxDatabase({
        name: 'heroesdb',
        storage: getRxStorageMemory(),
        password: 'myLongAndStupidPassword',
        multiInstance: true
    });
    await database.addCollections({
        heroes: {
            schema: heroSchema,
            statics: {
                async addHero(name, color) {
                    return this.upsert({
                        name,
                        color
                    });
                }
            }
        }
    });
    // const SYNC_URL = 'http://localhost:10102/';
    // database.collections.heroes.syncCouchDB({
    //     remote: SYNC_URL + 'hero/'
    // });
    return database;
};

let createPromise = null;
Database.get = async () => {
    if (!createPromise) {
        createPromise = create();
    }
    return createPromise;
};


module.exports = Database;

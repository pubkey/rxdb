require('babel-polyfill');
const {
    createRxDatabase,
    addRxPlugin
} = require('../../../');
const {
    RxDBReplicationCouchDBPlugin
} = require('../../../plugins/replication-couchdb');
addRxPlugin(RxDBReplicationCouchDBPlugin);
const {
    addPouchPlugin,
    getRxStoragePouch
} = require('../../../plugins/pouchdb');
addPouchPlugin(require('pouchdb-adapter-node-websql'));
addPouchPlugin(require('pouchdb-adapter-http'));

const { RxDBQueryBuilderPlugin } = require('../../../plugins/query-builder');
addRxPlugin(RxDBQueryBuilderPlugin);

const { RxDBEncryptionPlugin } = require('../../../plugins/encryption');
addRxPlugin(RxDBEncryptionPlugin);

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
            primary: true
        },
        color: {
            type: 'string'
        }
    },
    required: ['color']
};

const SYNC_URL = 'http://localhost:10102/';

const create = async () => {
    const database = await createRxDatabase({
        name: 'heroesdb',
        storage: getRxStoragePouch('websql'),
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
    database.collections.heroes.syncCouchDB({
        remote: SYNC_URL + 'hero/'
    });
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

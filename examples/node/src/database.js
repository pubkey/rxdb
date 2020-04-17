require('babel-polyfill');
const {
    addRxPlugin,
    createRxDatabase
} = require('../../../');
addRxPlugin(require('pouchdb-adapter-node-websql'));
addRxPlugin(require('pouchdb-adapter-http'));

const Database = {};

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

const SYNC_URL = 'http://localhost:10102/';

const create = async () => {
    const database = await createRxDatabase({
        name: 'heroesdb',
        adapter: 'websql',
        password: 'myLongAndStupidPassword',
        multiInstance: true
    });
    await database.collection({
        name: 'heroes',
        schema: heroSchema,
        statics: {
            async addHero(name, color) {
                return this.upsert({
                    name,
                    color
                });
            }
        }
    });
    database.collections.heroes.sync({
        remote: SYNC_URL + 'hero/'
    });
    return database;
};

let createPromise = null;
Database.get = async () => {
    if (!createPromise) createPromise = create();
    return createPromise;
};


module.exports = Database;

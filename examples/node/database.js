require('babel-polyfill');
const RxDB = require('../../');
const memdown = require('memdown');
const Log = require('./log');
RxDB.plugin(require('pouchdb-adapter-leveldb'));
RxDB.plugin(require('pouchdb-adapter-http'));
RxDB.plugin(require('pouchdb-replication'));

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

const HOSTNAME = 'localhost';
const syncURL = 'http://' + HOSTNAME + ':10102/';

let database, heroesCollection;

const create = async() => {
    return RxDB
        .create({
            name: 'heroesdb',
            adapter: 'leveldb',
            password: 'myLongAndStupidPassword'
        })
        .then(db => {
            Log.createdDB();
            database = db;
            return db.collection({
                name: 'heroes',
                schema: heroSchema
            });
        })
        .then(col => {
            // sync
            database.collections.heroes.sync(syncURL + 'hero/');
            col.find()
                .sort({
                    name: 1
                })
                .$.subscribe(heroes => {
                    if (!heroes) return;
                    Log.heroCollectionUpdate();
                    heroes.forEach(hero => Log.logHero(hero));
                });

        });
};

const upsertHero = async(name, color) => {
    if (!database) await create();
    const obj = {
        name: name,
        color: color
    };
    try {
        database.collections.heroes.upsert(obj);
    } catch (e) {
        Log.error(e);
    }
};

const get = async() => {
    if (!database) await create();
    try {
        return database.collections.heroes.find();
    } catch (e) {
        Log.error(e);
    }
};

const Database = {
    upsertHero: upsertHero,
    get: get
};

module.exports = Database;

require('babel-polyfill');
const RxDB = require('../../');
const memdown = require('memdown');
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
console.log('hostname: ' + HOSTNAME);
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
            console.log('creating hero-collection..');
            database = db;
            return db.collection({
                name: 'heroes',
                schema: heroSchema
            });
        })
        .then(col => {
            // sync
            console.log('starting sync');
            database.collections.heroes.sync(syncURL + 'hero/');
            col.find()
                .sort({
                    name: 1
                })
                .$.subscribe(function(heroes) {
                    if (!heroes) {
                        console.log('Loading..');
                        return;
                    }
                    console.log('observable fired');

                    const logs = heroes
                        .map(hero => {
                            return 'Hero: ' + JSON.stringify(hero);
                        })
                        .reduce((pre, cur) => pre += cur, '');
                    console.dir(logs);
                });
        });
};

const upsertHero = async(name, color) => {
    if (!database) await create();
    const obj = {
        name: name,
        color: color
    };
    console.log('inserting hero:');
    console.dir(obj);
    try {
        database.collections.heroes.upsert(obj);
    } catch (e) {
        console.log(e);
    }
};

const Database = {
    upsertHero: upsertHero
};

module.exports = Database;

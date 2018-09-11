const electron = require('electron');
const renderTest = require('./test/render.test.js');

const RxDB = require('rxdb');
require('babel-polyfill');
RxDB.plugin(require('pouchdb-adapter-websql'));
RxDB.plugin(require('pouchdb-adapter-http'));

const heroesList = document.querySelector('#heroes-list');

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

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10102/';


const currentWindow = electron.remote.getCurrentWindow();

let _getDatabase; // cached
function getDatabase() {
    if (!_getDatabase) _getDatabase = createDatabase();
    return _getDatabase;
}

async function createDatabase() {
    /**
     * to check if rxdb works correctly, we run some integration-tests here
     * if you want to use this electron-example as boilerplate, remove this line
     */
    await renderTest();

    const db = await RxDB.create({
        name: 'heroesdb' + currentWindow.custom.dbSuffix, // we add a random timestamp in dev-mode to reset the database on each start
        adapter: 'websql',
        password: 'myLongAndStupidPassword'
    });

    console.log('creating hero-collection..');
    await db.collection({
        name: 'heroes',
        schema: heroSchema
    });

    console.log('starting sync');
    db.heroes.sync({
        remote: syncURL + 'hero/'
    });

    /**
     * map the result of the find-query to the heroes-list in the dom
     */
    db.heroes.find()
        .sort({
            name: 1
        })
        .$.subscribe(function(heroes) {
            if (!heroes) {
                heroesList.innerHTML = 'Loading..';
                return;
            }
            console.log('observable fired');
            console.dir(heroes);

            heroesList.innerHTML = heroes
                .map(hero => {
                    return '<li>' +
                        '<div class="color-box" style="background:' + hero.color + '"></div>' +
                        '<div class="name" name="' + hero.name + '">' + hero.name + '</div>' +
                        '</li>';
                })
                .reduce((pre, cur) => pre += cur, '');
        });

    return db;
};
getDatabase();

window.addHero = async function() {
    const db = await getDatabase();
    const name = document.querySelector('input[name="name"]').value;
    const color = document.querySelector('input[name="color"]').value;
    const obj = {
        name: name,
        color: color
    };
    console.log('inserting hero:');
    console.dir(obj);
    db.heroes.insert(obj);
};

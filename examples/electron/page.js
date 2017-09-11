const RxDB = require('../../');
require('babel-polyfill');
RxDB.plugin(require('pouchdb-adapter-websql'));
RxDB.plugin(require('pouchdb-adapter-http'));

const listBox = document.querySelector('#list-box');
const insertBox = document.querySelector('#insert-box');
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

let database;

RxDB
    .create({
        name: 'heroesdb',
        adapter: 'websql',
        password: 'myLongAndStupidPassword'
    })
    .then(function(db) {
        console.log('creating hero-collection..');
        database = db;
        return db.collection({
            name: 'heroes',
            schema: heroSchema
        });
    })
    .then(function(col) {

        // sync
        console.log('starting sync');
        database.heroes.sync({
            remote: syncURL + 'hero/'
        });

        col.find()
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
                            '<div class="name">' + hero.name + '</div>' +
                            '</li>';
                    })
                    .reduce((pre, cur) => pre += cur, '');
            });
    });

addHero = function() {
    const name = document.querySelector('input[name="name"]').value;
    const color = document.querySelector('input[name="color"]').value;
    const obj = {
        name: name,
        color: color
    };
    console.log('inserting hero:');
    console.dir(obj);
    database.heroes.insert(obj);
};

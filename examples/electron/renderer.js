//var RxDB = require('../../'); // TODO use this
var RxDB = require('rxdb');
RxDB.plugin(require('pouchdb-adapter-websql'));
RxDB.plugin(require('pouchdb-adapter-http'));
RxDB.plugin(require('pouchdb-replication'));

var listBox = document.querySelector('#list-box');
var insertBox = document.querySelector('#insert-box');
var heroesList = document.querySelector('#heroes-list');

var heroSchema = {
    "title": "hero schema",
    "description": "describes a simple hero",
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "primary": true
        },
        "color": {
            "type": "string"
        }
    },
    "required": ["color"]
};

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10102/';

let database, column;

RxDB
    .create('heroesDB2', 'websql', 'myLongAndStupidPassword', true)
    .then(function(db) {
        database = db;
        return db.collection('hero', heroSchema);
    })
    .then(function(col) {
        column = col;
        return column;
    })
    .then(function(col) {
        console.log('DatabaseService: sync');
        col.sync(syncURL + 'hero/');
        return col;
    })
    .then(function(col) {
        col.query()
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
                heroesList.innerHTML = '';
                heroes.forEach(function(hero) {
                    heroesList.innerHTML = heroesList.innerHTML +
                        '<li>' +
                        '<div class="color-box" style="background:' + hero.get('color') + '"></div>' +
                        '<div class="name">' + hero.get('name') + '</div>' +
                        '</li>'
                });
            });
    });

addHero = function() {
    var name = document.querySelector('input[name="name"]').value;
    var color = document.querySelector('input[name="color"]').value;
    var obj = {
        name: name,
        color: color
    };
    console.log('inserting hero:');
    console.dir(obj);
    column.insert(obj);
}
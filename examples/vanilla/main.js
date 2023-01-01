/**
 * WARNING: no transpile
 * use old plain javascript only!
 */

var listBox = document.querySelector('#list-box');
var insertBox = document.querySelector('#insert-box');
var heroesList = document.querySelector('#heroes-list');
var leaderIcon = document.querySelector('#leader-icon');


var heroSchema = {
    "title": "hero schema",
    "description": "describes a simple hero",
    "primaryKey": "name",
    "version": 0,
    "type": "object",
    "properties": {
        "name": {
            "type": "string"
        },
        "color": {
            "type": "string"
        }
    },
    "required": ["color"]
};

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10102/';

window.RxDB
    .createRxDatabase({
        name: 'heroesdb',
        storage: RxDB.getRxStoragePouch('idb'),
        password: 'myLongAndStupidPassword'
    })
    .then(function(db) {
        console.log('created database');
        window.db = db;
        heroesList.innerHTML = 'Create collection..';

        db.waitForLeadership().then(function() {
            document.title = '♛ ' + document.title;
            leaderIcon.style.display = 'block';
        });
        return db.addCollections({
            hero: {
                schema: heroSchema
            }
        });
    })
    .then(function() {
        var col = window.db.hero;
        window.col = col;
        return col;
    })
    .then(function(col) {
        console.log('DatabaseService: sync');
        replicateCouchDB({
            collection: col,
            remote: syncURL + 'hero/'
        });
        return col;
    })
    .then(function(col) {
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
                heroesList.innerHTML = '';
                heroes.forEach(function(hero) {
                    heroesList.innerHTML = heroesList.innerHTML +
                        '<li>' +
                        '<div class="color-box" style="background:' + hero.color + '"></div>' +
                        '<div class="name">' + hero.name + '</div>' +
                        '</li>';
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
    col.insert(obj);
}

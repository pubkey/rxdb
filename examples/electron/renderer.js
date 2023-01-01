const { getDatabase } = require('./shared');
const renderTest = require('./test/render.test.js');
const electron = require('electron');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
const { getRxStorageIpcRenderer } = require('../../plugins/electron');


const heroesList = document.querySelector('#heroes-list');

async function run() {
    /**
     * to check if rxdb works correctly, we run some integration-tests here
     * if you want to use this electron-example as boilerplate, remove this line
     */
    await renderTest();

    const dbSuffix = await window.getDBSuffix();


    const storage = getRxStorageIpcRenderer({
        key: 'main-storage',
        statics: getRxStorageMemory().statics,
        ipcRenderer: electron.ipcRenderer
    });

    console.log('GET DATABASE');
    const db = await getDatabase(
        'heroesdb' + dbSuffix, // we add a random timestamp in dev-mode to reset the database on each start
        storage
    );
    console.log('GET DATABASE DONE');

    /**
     * map the result of the find-query to the heroes-list in the dom
     */
    db.heroes.find()
        .sort({
            name: 'asc'
        })
        .$.subscribe(function (heroes) {
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

    window.addHero = async function () {
        const name = document.querySelector('input[name="name"]').value;
        const color = document.querySelector('input[name="color"]').value;
        const obj = {
            name: name,
            color: color
        };
        console.log('inserting hero:');
        console.dir(obj);
        await db.heroes.insert(obj);
        console.log('inserting hero DONE');
    };
}
run();

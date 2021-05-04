const electron = require('electron');
const database = require('./database');
const renderTest = require('./test/render.test.js');

require('babel-polyfill');

const heroesList = document.querySelector('#heroes-list');

const syncURL = 'http://localhost:10102/db/heroes';

const {
    addRxPlugin
} = require('rxdb');

addRxPlugin(require('pouchdb-adapter-idb'));

async function run() {
    /**
     * to check if rxdb works correctly, we run some integration-tests here
     * if you want to use this electron-example as boilerplate, remove this line
     */
    await renderTest();

    const currentWindow = electron.remote.getCurrentWindow();
    const adapter = 'idb'
    const db = await database.getDatabase(
        'heroesdb' + currentWindow.custom.dbSuffix, // we add a random timestamp in dev-mode to reset the database on each start
        adapter
    );

    window.db = db;

    console.log('starting sync with ' + syncURL);
    const syncState = await db.heroes.sync({
        remote: syncURL,
        direction: {
            pull: true,
            push: true
        }
    });
    console.dir(syncState);

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
                    const attachments = hero.allAttachments()
                    const attachmentsBlock = attachments.map(one => {
                        return `
                            <li>
                              <p>${one.id.substr(0, 8)}… – ${one.type}</p>
                            </li>
                        `
                    }).join('');

                    return `
                    <div>
                        <div class="color-box" style="background:${hero.color}" />
                        <div class="name" name="${hero.name}">${hero.name}</div>
                        <div class="attachments-count" value="${attachments.length}">
                            <ul>
                                ${attachmentsBlock.length ? attachmentsBlock : 'No attachments'}
                            </ul>
                        </div>
                    </div>
                    `
                })
                .reduce((pre, cur) => pre += cur, '');
        });
}

run();

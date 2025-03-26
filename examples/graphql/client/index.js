import './style.css';
import {
    addRxPlugin,
    createRxDatabase
} from 'rxdb';

import {
    getRxStorageLocalstorage
} from 'rxdb/plugins/storage-localstorage';

import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';

import {
    filter
} from 'rxjs/operators';

import {
    pullQueryBuilderFromRxSchema,
    pushQueryBuilderFromRxSchema,
    pullStreamBuilderFromRxSchema,
    replicateGraphQL
} from 'rxdb/plugins/replication-graphql';


// TODO import these only in non-production build

import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
addRxPlugin(RxDBDevModePlugin);
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
addRxPlugin(RxDBUpdatePlugin);

import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
addRxPlugin(RxDBQueryBuilderPlugin);

import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
addRxPlugin(RxDBLeaderElectionPlugin);


import {
    GRAPHQL_PORT,
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PORT,
    GRAPHQL_SUBSCRIPTION_PATH,
    heroSchema,
    graphQLGenerationInput,
    JWT_BEARER_TOKEN
} from '../shared.js';

const insertButton = document.querySelector('#insert-button');
const heroesList = document.querySelector('#heroes-list');
const leaderIcon = document.querySelector('#leader-icon');
const storageField = document.querySelector('#storage-key');
const databaseNameField = document.querySelector('#database-name');

console.log('hostname: ' + window.location.hostname);


const syncUrls = {
    http: 'http://' + window.location.hostname + ':' + GRAPHQL_PORT + GRAPHQL_PATH,
    ws: 'ws://localhost:' + GRAPHQL_SUBSCRIPTION_PORT + GRAPHQL_SUBSCRIPTION_PATH
};


const batchSize = 50;

const pullQueryBuilder = pullQueryBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero,
    batchSize
);
const pushQueryBuilder = pushQueryBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero
);

const pullStreamBuilder = pullStreamBuilderFromRxSchema(
    'hero',
    graphQLGenerationInput.hero
);

/**
 * In the e2e-test we get the database-name from the get-parameter
 * In normal mode, the database name is 'heroesdb'
 */
function getDatabaseName() {
    const url_string = window.location.href;
    const url = new URL(url_string);
    const dbNameFromUrl = url.searchParams.get('database');

    let ret = 'heroesdb';
    if (dbNameFromUrl) {
        console.log('databaseName from url: ' + dbNameFromUrl);
        ret += dbNameFromUrl;
    }
    return ret;
}

function doSync() {
    const url_string = window.location.href;
    const url = new URL(url_string);
    const shouldSync = url.searchParams.get('sync');
    if (shouldSync && shouldSync.toLowerCase() === 'false') {
        return false;
    } else {
        return true;
    }
}


function getStorageKey() {
    const url_string = window.location.href;
    const url = new URL(url_string);
    let storageKey = url.searchParams.get('storage');
    if (!storageKey) {
        storageKey = 'localstorage';
    }
    return storageKey;
}

/**
 * Easy toggle of the storage engine via query parameter.
 */
function getStorage() {
    const storageKey = getStorageKey();
    if (storageKey === 'localstorage') {
        return getRxStorageLocalstorage();
    } else if (storageKey === 'memory') {
        return getRxStorageMemory();
    } else {
        throw new Error('storage key not defined ' + storageKey);
    }
}


async function run() {
    storageField.innerHTML = getStorageKey();
    databaseNameField.innerHTML = getDatabaseName();
    heroesList.innerHTML = 'Create database..';
    const db = await createRxDatabase({
        name: getDatabaseName(),
        storage: wrappedValidateAjvStorage({
            storage: getStorage()
        }),
        multiInstance: getStorageKey() !== 'memory'
    });
    window.db = db;

    // display crown when tab is leader
    db.waitForLeadership().then(function () {
        document.title = '♛ ' + document.title;
        leaderIcon.style.display = 'block';
    });

    heroesList.innerHTML = 'Create collection..';
    await db.addCollections({
        hero: {
            schema: heroSchema
        }
    });

    db.hero.preSave(function (docData) {
        docData.updatedAt = new Date().getTime();
    });

    // set up replication
    if (doSync()) {
        heroesList.innerHTML = 'Start replication..';
        const replicationState = replicateGraphQL({
            collection: db.hero,
            url: syncUrls,
            headers: {
                /* optional, set an auth header */
                Authorization: 'Bearer ' + JWT_BEARER_TOKEN
            },
            push: {
                batchSize,
                queryBuilder: pushQueryBuilder
            },
            pull: {
                batchSize,
                queryBuilder: pullQueryBuilder,
                streamQueryBuilder: pullStreamBuilder
            },
            live: true,
            deletedField: 'deleted'
        });


        // show replication-errors in logs
        heroesList.innerHTML = 'Subscribe to errors..';
        replicationState.error$.subscribe(err => {
            console.error('replication error:');
            console.dir(err);
        });
    }


    // log all collection events for debugging
    db.hero.$.pipe(filter(ev => !ev.isLocal)).subscribe(ev => {
        console.log('collection.$ emitted:');
        console.dir(ev);
    });


    /**
     * We await the initial replication
     * so that the client never shows outdated data.
     * You should not do this if you want to have an
     * offline-first client, because the initial sync
     * will not run through without a connection to the
     * server.
     */
    heroesList.innerHTML = 'Await initial replication..';
    // TODO this did full block the loading because awaitInitialReplication() never resolves if other tab is leader
    // await replicationState.awaitInitialReplication();

    // subscribe to heroes list and render the list on change
    heroesList.innerHTML = 'Subscribe to query..';
    db.hero.find()
        .sort({
            name: 'asc'
        })
        .$.subscribe(function (heroes) {
            console.log('emitted heroes:');
            console.dir(heroes.map(d => d.toJSON()));
            let html = '';
            heroes.forEach(function (hero) {
                html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name} (updatedAt: ${hero.updatedAt})</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">DELETE</div>
                    </li>
                `;
            });
            heroesList.innerHTML = html;
        });


    // set up click handlers
    window.deleteHero = async (id) => {
        console.log('delete doc ' + id);
        const doc = await db.hero.findOne(id).exec();
        if (doc) {
            console.log('got doc, remove it');
            try {
                await doc.remove();
            } catch (err) {
                console.error('could not remove doc');
                console.dir(err);
            }
        }
    };
    insertButton.onclick = async function () {
        const name = document.querySelector('input[name="name"]').value;
        const color = document.querySelector('input[name="color"]').value;
        const obj = {
            id: name,
            name: name,
            color: color,
            updatedAt: new Date().getTime()
        };
        console.log('inserting hero:');
        console.dir(obj);

        await db.hero.insert(obj);
        document.querySelector('input[name="name"]').value = '';
        document.querySelector('input[name="color"]').value = '';
    };
}
run().catch(err => {
    console.log('run() threw an error:');
    console.error(err);
});

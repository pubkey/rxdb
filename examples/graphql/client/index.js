import './style.css';
import {
    SubscriptionClient
} from 'subscriptions-transport-ws';


import RxDB from 'rxdb/plugins/core';

RxDB.plugin(require('pouchdb-adapter-idb'));
import RxDBReplicationGraphQL from 'rxdb/plugins/replication-graphql';
RxDB.plugin(RxDBReplicationGraphQL);


// TODO import these only in non-production build
import RxDBSchemaCheckModule from 'rxdb/plugins/schema-check';
RxDB.plugin(RxDBSchemaCheckModule);
import RxDBErrorMessagesModule from 'rxdb/plugins/error-messages';
RxDB.plugin(RxDBErrorMessagesModule);
import RxDBValidateModule from 'rxdb/plugins/validate';
RxDB.plugin(RxDBValidateModule);

import UpdatePlugin from 'rxdb/plugins/update';
RxDB.plugin(UpdatePlugin);

import {
    GRAPHQL_PORT,
    GRAPHQL_PATH,
    GRAPHQL_SUBSCRIPTION_PORT,
    GRAPHQL_SUBSCRIPTION_PATH
} from '../shared';

const insertButton = document.querySelector('#insert-button');
const heroesList = document.querySelector('#heroes-list');
const leaderIcon = document.querySelector('#leader-icon');

const heroSchema = {
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string',
            index: true
        },
        color: {
            type: 'string',
            index: true
        },
        updatedAt: {
            type: 'number',
            index: true
        }
    },
    required: ['color']
};

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':' + GRAPHQL_PORT + GRAPHQL_PATH;

const batchSize = 5;
const queryBuilder = doc => {
    if (!doc) {
        doc = {
            id: '',
            updatedAt: 0
        };
    }
    const query = `{
        feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: ${batchSize}) {
            id
            name
            color
            updatedAt
            deleted
        }
    }`;
    return {
        query,
        variables: {}
    };
};
const pushQueryBuilder = doc => {
    const query = `
        mutation CreateHuman($human: HumanInput) {
            setHuman(human: $human) {
                id,
                updatedAt
            }
       }
    `;
    const variables = {
        human: doc
    };

    return {
        query,
        variables
    };
};

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

async function run() {
    heroesList.innerHTML = 'Create database..';
    const db = await RxDB.create({
        name: getDatabaseName(),
        adapter: 'idb'
    });
    window.db = db;

    // display crown when tab is leader
    db.waitForLeadership().then(function () {
        document.title = '♛ ' + document.title;
        leaderIcon.style.display = 'block';
    });

    heroesList.innerHTML = 'Create collection..';
    const collection = await db.collection({
        name: 'hero',
        schema: heroSchema
    });


    // set up replication
    heroesList.innerHTML = 'Start replication..';
    const replicationState = collection.syncGraphQL({
        url: syncURL,
        push: {
            batchSize,
            queryBuilder: pushQueryBuilder
        },
        pull: {
            queryBuilder
        },
        live: true,
        /**
         * Because the websocket is used to inform the client
         * when something has changed,
         * we can set the liveIntervall to a high value
         */
        liveInterval: 1000 * 60 * 10, // 10 minutes
        deletedFlag: 'deleted'
    });
    // show replication-errors in logs
    heroesList.innerHTML = 'Subscribe to errors..';
    replicationState.error$.subscribe(err => {
        console.error('replication error:');
        console.dir(err);
    });


    // setup graphql-subscriptions for pull-trigger
    heroesList.innerHTML = 'Create SubscriptionClient..';
    const endpointUrl = 'ws://localhost:' + GRAPHQL_SUBSCRIPTION_PORT + GRAPHQL_SUBSCRIPTION_PATH;
    const wsClient = new SubscriptionClient(endpointUrl, {
        reconnect: true,
        timeout: 1000 * 60,
        onConnect: () => {
            console.log('SubscriptionClient.onConnect()');
        },
        connectionCallback: () => {
            console.log('SubscriptionClient.connectionCallback:');
        },
        reconnectionAttempts: 10000,
        inactivityTimeout: 10 * 1000,
        lazy: true
    });
    heroesList.innerHTML = 'Subscribe to GraphQL Subscriptions..';
    const query = `subscription onHumanChanged {
        humanChanged {
            id
        }
    }`;
    const ret = wsClient.request({ query });
    ret.subscribe({
        next: async (data) => {
            console.log('subscription emitted => trigger run()');
            console.dir(data);
            await replicationState.run();
            console.log('run() done');
        },
        error(error) {
            console.log('run() got error:');
            console.dir(error);
        }
    });

    /**
     * We await the inital replication
     * so that the client never shows outdated data.
     * You should not do this if you want to have an
     * offline-first client, because the inital sync
     * will not run through without a connection to the
     * server.
     */
    heroesList.innerHTML = 'Await initial replication..';
    await replicationState.awaitInitialReplication();

    // subscribe to heroes list and render the list on change
    heroesList.innerHTML = 'Subscribe to query..';
    collection.find()
        .sort({
            name: 1
        })
        .$.subscribe(function (heroes) {
            let html = '';
            heroes.forEach(function (hero) {
                html += `
                    <li class="hero-item">
                        <div class="color-box" style="background:${hero.color}"></div>
                        <div class="name">${hero.name}</div>
                        <div class="delete-icon" onclick="window.deleteHero('${hero.primary}')">DELETE</div>
                    </li>
                `;
            });
            heroesList.innerHTML = html;
        });


    // set up click handlers
    window.deleteHero = async (id) => {
        console.log('delete doc ' + id);
        const doc = await collection.findOne(id).exec();
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
            color: color
        };
        console.log('inserting hero:');
        console.dir(obj);

        await collection.insert(obj);
        document.querySelector('input[name="name"]').value = '';
        document.querySelector('input[name="color"]').value = '';
    };
}
run().catch(err => {
    console.log('run() threw an error:');
    console.error(err);
});

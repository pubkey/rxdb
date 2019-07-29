import './style.css';
import {
    SubscriptionClient
} from 'subscriptions-transport-ws';
import RxDB from '../../../';

RxDB.plugin(require('pouchdb-adapter-idb'));
RxDB.plugin(require('../../../plugins/replication-graphql'));

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
            type: 'string'
        },
        updatedAt: {
            type: 'number'
        }
    },
    required: ['color']
};

console.log('hostname: ' + window.location.hostname);
const syncURL = 'http://' + window.location.hostname + ':10102/graphql';

const batchSize = 5;
const queryBuilder = doc => {
    if (!doc) {
        doc = {
            id: '',
            updatedAt: 0
        };
    }
    return `{
        feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: ${batchSize}) {
            id
            name
            color
            updatedAt
            deleted
        }
    }`;
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


async function run() {
    const db = await RxDB.create({
        name: 'heroesdb',
        adapter: 'idb',
        password: 'myLongAndStupidPassword'
    });
    window.db = db;
    heroesList.innerHTML = 'Create collection..';

    // display crown when tab is leader
    db.waitForLeadership().then(function () {
        document.title = '♛ ' + document.title;
        leaderIcon.style.display = 'block';
    });

    const collection = await db.collection({
        name: 'hero',
        schema: heroSchema
    });


    // set up replication
    const replicationState = collection.syncGraphQl({
        url: syncURL,
        push: {
            batchSize,
            queryBuilder: pushQueryBuilder
        },
        pull: {
            queryBuilder
        },
        live: true,
        liveInterval: 1000 * 5, // we set this very height because we trigger sync-calls graphql-subscriptions
        deletedFlag: 'deleted'
    });

    // setup graphql-subscriptions for pull-trigger
    const endpointUrl = 'ws://localhost:10103/subscriptions';
    const wsClient = new SubscriptionClient(endpointUrl, {
        reconnect: true,
    });
    const query = `subscription onHumanChanged {
        humanChanged {
            id
        }
    }`;
    const ret = wsClient.request({ query });
    ret.subscribe({
        next(data) {
            console.log('subscription emitted => trigger run');
            console.dir(data);
            replicationState.run();
        },
        error(error) {
            console.log('got error:');
            console.dir(error);
        }
    });

    // show replication-errors in logs
    replicationState.error$.subscribe(err => {
        console.log('replication error:');
        console.dir(err);
    });

    // reactive show heroes list
    collection.find()
        .sort({
            name: 1
        })
        .$.subscribe(function (heroes) {
            if (!heroes) {
                heroesList.innerHTML = 'Loading..';
                return;
            }
            heroesList.innerHTML = '';
            heroes.forEach(function (hero) {
                heroesList.innerHTML = heroesList.innerHTML +
                    '<li>' +
                    '<div class="color-box" style="background:' + hero.color + '"></div>' +
                    '<div class="name">' + hero.name + '</div>' +
                    '<div class="delete-icon" onclick="window.deleteHero(\'' + hero.primary + '\')">DELETE</div>' +
                    '</li>';
            });
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
run();
import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import RxDB from '../../dist/lib/index';
import graphQlPlugin from '../../plugins/replication-graphql';
RxDB.plugin(graphQlPlugin);

import graphQlClient from 'graphql-client';

import {
    fromEvent
} from 'rxjs';
import {
    map,
    filter,
    first
} from 'rxjs/operators';

let request;
let SpawnServer;
if (config.platform.isNode()) {
    SpawnServer = require('../helper/graphql-server');
    request = require('request-promise');
    RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));
}
describe('replication-graphql.test.js', () => {
    if (!config.platform.isNode()) return;
    const batchSize = 5;
    const getTestData = (amount) => {
        return new Array(amount).fill(0)
            .map(() => schemaObjects.humanWithTimestamp())
            .map(doc => {
                doc.deleted = false;
                return doc;
            });
    };
    const queryBuilder = doc => {
        console.dir(doc);
        if (doc === null) {
            doc = {
                id: '',
                updatedAt: 0
            };
        }
        return `{
            feedForRxDBReplication(lastId: "${doc.id}", minUpdatedAt: ${doc.updatedAt}, limit: ${batchSize}) {
                id
                name
                age
                updatedAt
                deleted
            }
        }`;
    };

    describe('graphql-server.js', () => {
        it('spawn, reach and close a server', async () => {
            const server = await SpawnServer.spawn();
            console.log(server.url);
            const client = graphQlClient({
                url: server.url
            });
            const res = await client.query(`{
                 info
            }`);
            assert.equal(res.data.info, 1);
            server.close();
        });
    });
    config.parallel('live:false pull only', () => {
        it('should pull all documents in one batch', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const server = await SpawnServer.spawn(getTestData(batchSize));
            c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });

            await AsyncTestUtil.waitUntil(async () => {
                const docs = await c.find().exec();
                return docs.length === batchSize;
            });

            server.close();
            c.database.destroy();
        });
        it('should pull all documents in multiple batches', async () => {
            const c = await humansCollection.createHumanWithTimestamp(0);
            const amount = batchSize * 4;
            const server = await SpawnServer.spawn(getTestData(amount));

            const replicationState = c.syncGraphQl({
                endpoint: server.url,
                direction: {
                    pull: true,
                    push: false
                },
                live: false,
                deletedFlag: 'deleted',
                queryBuilder
            });


            await AsyncTestUtil.waitUntil(async () => {
                const docs = await c.find().exec();
                console.log('aaaaaa');
                //                console.dir(docs.map(d => d.toJSON()));
                console.dir(docs.length);
                return docs.length === amount;
            });

            server.close();
            c.database.destroy();
        });
    });
});
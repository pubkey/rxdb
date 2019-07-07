import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import RxDB from '../../dist/lib/index';
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
    describe('graphql-server.js', () => {
        it('spawn, reach and close a server', async () => {
            const server = await SpawnServer.spawn();
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
        it('should pull all documents', async () => {
            const c = await humansCollection.createHumanWithTimestamp(10);

            
            c.database.destroy();
            throw new Error('continue here');
        });

    });
});
import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import RxDB from '../../dist/lib/index';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as schemas from '../helper/schemas';
import * as util from '../../dist/lib/util';

import NodeWebsqlAdapter from 'pouchdb-adapter-leveldb';


import ServerPlugin from '../../plugins/server';
RxDB.plugin(ServerPlugin);

describe('server.test.js', () => {
    it('should run and sync', async () => {
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.server({});
        const clientCollection = await humansCollection.create(0);

        // sync
        clientCollection.sync({
            remote: 'http://localhost:3000/db/human'
        });

        // insert one doc on each side
        await clientCollection.insert(schemaObjects.human());
        await serverCollection.insert(schemaObjects.human());

        // both collections should have 2 documents
        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await serverCollection.find().exec();
            const clientDocs = await clientCollection.find().exec();
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        clientCollection.database.destroy();
        serverCollection.database.destroy();
    });
    it('should free port when database is destroyed', async () => {
        const port = 5000;
        const col1 = await humansCollection.create(0);
        await col1.database.server({
            port
        });
        await col1.database.destroy();

        const col2 = await humansCollection.create(0);
        await col2.database.server({
            port
        });
        col2.database.destroy();
    });
    it('should work on filesystem-storage', async () => {
        if (!config.platform.isNode()) return;
        RxDB.plugin(NodeWebsqlAdapter);

        const db1 = await RxDB.create({
            name: '../test_tmp/' + util.randomCouchString(10),
            adapter: 'leveldb',
            multiInstance: false
        });
        const col1 = await db1.collection({
            name: 'human',
            schema: schemas.human
        });

        const db2 = await RxDB.create({
            name: '../test_tmp/' + util.randomCouchString(10),
            adapter: 'leveldb',
            multiInstance: false
        });
        const col2 = await db2.collection({
            name: 'human',
            schema: schemas.human
        });

        db1.server({});
        await col2.sync({
            remote: 'http://localhost:3000/db/human'
        });

        await col1.insert(schemaObjects.human());
        await col2.insert(schemaObjects.human());

        const findDoc = col1.findOne().exec();
        assert.ok(findDoc);


        console.log('w8 for sync');
        // both collections should have 2 documents
        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await col1.find().exec();
            const clientDocs = await col2.find().exec();
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        db1.destroy();
        db2.destroy();
    });
    it('run', async function() {
        process.exit();
        this.timeout(200 * 1000);

        const serverCollection = await humansCollection.create(0);
        console.dir(serverCollection.pouch);

        const server = await serverCollection.database.server({});

        const browserCollection = await humansCollection.create(0);


        const replicationState = browserCollection.sync({
            remote: 'http://localhost:3000/db/human' // + serverCollection.pouch.name
        });
        replicationState.change$.subscribe(change => {
            console.log('change:');
            console.dir(change);
        });

        replicationState.docs$.subscribe(docData => {
            console.log('doc:');
            console.dir(docData);
        });
        replicationState.complete$.subscribe(completed => {
            console.log('completed:');
            console.dir(completed);
        });
        replicationState.error$.subscribe(error => {
            console.log('error:');
            console.dir(error);
        });

        await AsyncTestUtil.wait(200);
        await browserCollection.insert(schemaObjects.human());
        await serverCollection.insert(schemaObjects.human());

        await AsyncTestUtil.wait(200 * 1000);

        process.exit();
        browserCollection.database.destryo();
        serverCollection.database.destroy();
    });
});

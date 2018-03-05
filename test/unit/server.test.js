import assert from 'assert';
import config from './config';
import AsyncTestUtil from 'async-test-util';

import RxDB from '../../dist/lib/index';
import * as humansCollection from '../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';

import ServerPlugin from '../../plugins/server';
RxDB.plugin(ServerPlugin);

describe('server.test.js', () => {
    it('should run and sync', async () => {
        const serverCollection = await humansCollection.create(0);
        await serverCollection.database.server({});
        const clientCollection = await humansCollection.create(0);

        // insert one doc on each side
        const data1 = schemaObjects.human();
        const data2 = schemaObjects.human();
        await clientCollection.insert(data1);
        await serverCollection.insert(data2);

        // sync
        clientCollection.sync({
            remote: 'http://localhost:3000/db/human' // + serverCollection.pouch.name
        });

        await AsyncTestUtil.waitUntil(async () => {
            const serverDocs = await serverCollection.find().exec();
            const clientDocs = await clientCollection.find().exec();
            console.log('serverDocs: ' + serverDocs.length);
            console.log('clientDocs: ' + clientDocs.length);
            console.dir(clientDocs.map(doc => doc.toJSON()));
            return (clientDocs.length === 2 && serverDocs.length === 2);
        });

        clientCollection.database.destroy();
        serverCollection.database.destroy();

        process.exit();
    });
    it('run', async function() {
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

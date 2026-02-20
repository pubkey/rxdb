import assert from 'assert';
import {
    wait, waitUntil
} from 'async-test-util';
import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection,
    isNode,
    isFastMode,
    nextPort,
    HumanWithTimestampDocumentType
} from '../../plugins/test-utils/index.mjs';
import {
    startWebsocketServer,
    replicateWithWebsocketServer
} from '../../plugins/replication-websocket/index.mjs';
import {
    RxCollection,
    randomToken
} from '../../plugins/core/index.mjs';

describeParallel('replication-websocket.test.ts', () => {
    if (!config.storage.hasReplication) {
        return;
    }
    if (!isNode) {
        // creating a server only works on node.js
        return;
    }

    type TestDocType = HumanWithTimestampDocumentType;
    async function getTestCollections(docsAmount: { local: number; remote: number; }): Promise<{
        localCollection: RxCollection<TestDocType, {}, {}, {}>;
        remoteCollection: RxCollection<TestDocType, {}, {}, {}>;
    }> {
        const localCollection = await humansCollection.createHumanWithTimestamp(docsAmount.local, undefined, false);
        const remoteCollection = await humansCollection.createHumanWithTimestamp(docsAmount.remote, undefined, false);
        return {
            localCollection,
            remoteCollection
        };
    }

    async function nextPortAndUrl(path?: string) {
        const port = await nextPort();
        let url = 'ws://localhost:' + port;
        if (path) {
            url += '/' + path;
        }
        return {
            port,
            url
        };
    }

    it('should start a server+client and replicate one document from server to the client', async () => {
        const { localCollection, remoteCollection } = await getTestCollections({
            local: 1,
            remote: 1
        });

        const portAndUrl = await nextPortAndUrl();

        await startWebsocketServer({
            database: remoteCollection.database,
            port: portAndUrl.port
        });

        const replicationState = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: localCollection,
            url: portAndUrl.url
        });
        replicationState.error$.subscribe(err => {
            console.log('got error :');
            console.log(JSON.stringify(err, null, 4));
            throw err;
        });


        await replicationState.awaitInSync();

        const serverDocs = await remoteCollection.find().exec();
        assert.strictEqual(serverDocs.length, 2);
        const clientDocs = await localCollection.find().exec();
        assert.strictEqual(clientDocs.length, 2);

        localCollection.database.close();
        remoteCollection.database.close();
    });
    it('should replicate ongoing writes', async () => {
        const { localCollection, remoteCollection } = await getTestCollections({
            local: 1,
            remote: 1
        });

        const clientDoc = await localCollection.findOne().exec(true);
        const serverDoc = await remoteCollection.findOne().exec(true);

        const portAndUrl = await nextPortAndUrl();

        await startWebsocketServer({
            database: remoteCollection.database,
            port: portAndUrl.port
        });

        const replicationState = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: localCollection,
            url: portAndUrl.url
        });
        replicationState.error$.subscribe(err => {
            console.log('got error :');
            console.log(JSON.stringify(err, null, 4));
            throw err;
        });

        await replicationState.awaitInSync();


        // UPDATE
        await clientDoc.incrementalPatch({
            name: 'client-edited'
        });
        await serverDoc.incrementalPatch({
            name: 'server-edited'
        });

        await replicationState.awaitInSync();

        const clientDocOnServer = await remoteCollection.findOne(clientDoc.primary).exec(true);
        assert.strictEqual(clientDocOnServer.name, 'client-edited');

        const serverDocOnClient = await localCollection.findOne(serverDoc.primary).exec(true);
        assert.strictEqual(serverDocOnClient.name, 'server-edited');


        // DELETE
        await serverDoc.getLatest().remove();
        await clientDoc.getLatest().remove();
        await replicationState.awaitInSync();
        const deletedServer = await remoteCollection.findOne().exec();
        const deletedClient = await localCollection.findOne().exec();
        assert.ok(!deletedServer);
        assert.ok(!deletedClient);

        localCollection.database.close();
        remoteCollection.database.close();
    });
    it('should continue the replication when the connection is broken and established again', async () => {
        if (isFastMode()) {
            return;
        }
        const { localCollection, remoteCollection } = await getTestCollections({
            local: 1,
            remote: 1
        });

        const clientDoc = await localCollection.findOne().exec(true);
        const serverDoc = await remoteCollection.findOne().exec(true);

        const portAndUrl = await nextPortAndUrl();

        const serverState = await startWebsocketServer({
            database: remoteCollection.database,
            port: portAndUrl.port
        });

        const replicationState = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: localCollection,
            url: portAndUrl.url
        });
        replicationState.error$.subscribe(err => {
            console.log('got error :');
            console.log(JSON.stringify(err, null, 4));
            throw err;
        });

        await replicationState.awaitInSync();
        const serverDocs = await remoteCollection.find().exec();
        assert.strictEqual(serverDocs.length, 2);

        // go 'offline' by closing the server
        await serverState.close();

        // modify on both sides while offline
        await clientDoc.incrementalPatch({
            name: 'client-edited'
        });
        await serverDoc.incrementalPatch({
            name: 'server-edited'
        });
        await wait(100);

        // go 'online' again by starting a new server on the same port
        await startWebsocketServer({
            database: remoteCollection.database,
            port: portAndUrl.port
        });
        await wait(100);
        await replicationState.awaitInSync();
        await wait(100);
        const clientDocOnServer = await remoteCollection.findOne(clientDoc.primary).exec(true);
        assert.strictEqual(clientDocOnServer.name, 'client-edited');
        const serverDocOnClient = await localCollection.findOne(serverDoc.primary).exec(true);
        assert.strictEqual(serverDocOnClient.name, 'server-edited');

        // should still stream the events after the reconnect
        await remoteCollection.insert(schemaObjects.humanWithTimestampData({
            id: 'server-doc-after-reconnect'
        }));
        await waitUntil(async () => {
            const doc = await localCollection.findOne('server-doc-after-reconnect').exec();
            return !!doc;
        });

        await localCollection.database.close();
        await remoteCollection.database.close();
    });
    it('should be able to replicate multiple collections at once', async () => {
        const { localCollection, remoteCollection } = await getTestCollections({
            local: 0,
            remote: 0
        });
        async function getDocIds(collection: RxCollection): Promise<string[]> {
            const docs = await collection.find().exec();
            return docs.map(d => d.primary);
        }
        const localDatabase = localCollection.database;
        const remoteDatabase = remoteCollection.database;
        const portAndUrl = await nextPortAndUrl();

        await localDatabase.addCollections({
            humans2: {
                schema: schemas.humanWithTimestamp
            }
        });
        await remoteDatabase.addCollections({
            humans2: {
                schema: schemas.humanWithTimestamp
            }
        });

        // add one initial doc to each collection
        await localCollection.insert(schemaObjects.humanWithTimestampData({
            id: 'local1'
        }));
        await localDatabase.humans2.insert(schemaObjects.humanWithTimestampData({
            id: 'local2'
        }));
        await remoteCollection.insert(schemaObjects.humanWithTimestampData({
            id: 'remote1'
        }));
        await remoteDatabase.humans2.insert(schemaObjects.humanWithTimestampData({
            id: 'remote2'
        }));

        await startWebsocketServer({
            database: remoteCollection.database,
            port: portAndUrl.port
        });

        const replicationState1 = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: localDatabase.humans,
            url: portAndUrl.url
        });
        replicationState1.error$.subscribe(err => {
            console.log('got error1 :');
            console.log(JSON.stringify(err, null, 4));
        });
        const replicationState2 = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: localDatabase.humans2,
            url: portAndUrl.url
        });
        replicationState2.error$.subscribe(err => {
            console.log('got error2 :');
            console.log(JSON.stringify(err, null, 4));
        });

        await replicationState1.awaitInSync();
        await replicationState2.awaitInSync();

        assert.deepStrictEqual(
            await getDocIds(localCollection),
            [
                'local1',
                'remote1'
            ]
        );
        assert.deepStrictEqual(
            await getDocIds(remoteCollection),
            [
                'local1',
                'remote1'
            ]
        );
        assert.deepStrictEqual(
            await getDocIds(localDatabase.humans2),
            [
                'local2',
                'remote2'
            ]
        );
        assert.deepStrictEqual(
            await getDocIds(remoteDatabase.humans2),
            [
                'local2',
                'remote2'
            ]
        );

        // make an ongoing change
        async function updateDoc(
            collection: RxCollection<HumanWithTimestampDocumentType>,
            id: string
        ) {
            const doc = await collection.findOne(id).exec(true);
            await doc.incrementalPatch({ name: 'updated' });
        }
        await updateDoc(localCollection, 'local1');
        await updateDoc(localDatabase.humans2, 'local2');
        await updateDoc(remoteCollection, 'remote1');
        await updateDoc(remoteDatabase.humans2, 'remote2');

        await replicationState1.awaitInSync();
        await replicationState2.awaitInSync();

        async function ensureUpdated(
            collection: RxCollection<HumanWithTimestampDocumentType>
        ) {
            const docs = await collection.find().exec();
            try {
                docs.forEach(doc => assert.strictEqual(doc.name, 'updated'));
            } catch (err) {
                console.error('ERR: not all docs are updated for collection ' + collection.name + ':');
                console.dir(
                    docs.map(doc => ({
                        id: doc.id,
                        name: doc.name
                    }))
                );
                throw new Error('not all docs are equal', { cause: err });
            }
        }
        await ensureUpdated(localCollection);
        await ensureUpdated(localDatabase.humans2);
        await ensureUpdated(remoteCollection);
        await ensureUpdated(remoteDatabase.humans2);

        localDatabase.close();
        remoteDatabase.close();
    });

    it('should be able to replicate multiple clients at once', async () => {
        const portAndUrl = await nextPortAndUrl();
        const [
            serverCollection,
            clientOneCollection,
            clientTwoCollection
        ] = await Promise.all([
            humansCollection.createHumanWithTimestamp(0, undefined, false),
            humansCollection.createHumanWithTimestamp(0, undefined, false),
            humansCollection.createHumanWithTimestamp(0, undefined, false)
        ]);

        await startWebsocketServer({
            database: serverCollection.database,
            port: portAndUrl.port
        });

        const replicationState1 = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: clientOneCollection,
            url: portAndUrl.url
        });

        const replicationState2 = await replicateWithWebsocketServer({
            replicationIdentifier: randomToken(10),
            collection: clientTwoCollection,
            url: portAndUrl.url
        });
        const awaitInSync = async () => {
            await replicationState1.awaitInSync();
            await replicationState2.awaitInSync();
        };
        await awaitInSync();


        await serverCollection.insert(schemaObjects.humanWithTimestampData({
            id: 'server-doc'
        }));

        await wait(100);
        await awaitInSync();

        await clientOneCollection.findOne('server-doc').exec(true);
        await clientTwoCollection.findOne('server-doc').exec(true);

        await Promise.all([
            serverCollection.database.close(),
            clientOneCollection.database.close(),
            clientTwoCollection.database.close()
        ]);
    });
});

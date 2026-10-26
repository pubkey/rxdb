import assert from 'assert';
import config from './unit/config.ts';
import {
    randomToken,
    RxCollection,
    WithDeleted,
    addRxPlugin
} from '../plugins/core/index.mjs';

import {
    humansCollection,
    schemaObjects,
    ensureReplicationHasNoErrors,
    HumanWithTimestampDocumentType,
    runReplicationBaseTestSuite,
    setExcludedTestDataChars
} from '../plugins/test-utils/index.mjs';

import {
    replicateNats,
    RxNatsReplicationState,
    encodeNatsSubjectToken,
    decodeNatsSubjectToken,
    getNatsDocumentSubject,
    getNatsLegacyDocumentSubject
} from '../plugins/replication-nats/index.mjs';
import {
    DeliverPolicy,
    JSONCodec,
    connect
} from 'nats';
import { wait, waitUntil } from 'async-test-util';
import { RxDBDevModePlugin } from '../plugins/dev-mode/index.mjs';

const connectionSettings = { servers: 'localhost:4222' };
/**
 * The NATS server is started in parallel to the tests,
 * so it might not accept connections yet when this file is loaded.
 * Therefore we retry the connection until the server is reachable.
 */
const CONNECT_RETRY_TIME = 500;
const CONNECT_MAX_TRIES = 120;
async function connectWithRetry() {
    let tries = 0;
    while (true) {
        try {
            return await connect(connectionSettings);
        } catch (err) {
            tries++;
            if (tries >= CONNECT_MAX_TRIES) {
                throw err;
            }
            await wait(CONNECT_RETRY_TIME);
        }
    }
}
const connectionStatePromise = (async () => {
    const jc = JSONCodec();
    const nc = await connectWithRetry();
    const jsm = await nc.jetstreamManager();
    const js = nc.jetstream();
    return {
        jc,
        nc,
        jsm,
        js
    };
})();

/**
 * The tests for the NATS replication plugin
 * do not run in the normal test suite
 * because it is too slow to setup the NATS backend.
 */
describe('replication-nats.test.js', () => {
    addRxPlugin(RxDBDevModePlugin);
    /**
     * The document id is used as token of the NATS subject,
     * which must not contain whitespace, '.', '*' or '>'.
     */
    setExcludedTestDataChars(' .*>');
    assert.ok(config);
    /**
     * Use a low batchSize in all tests
     * to make it easier to test boundaries.
     */
    const batchSize = 5;
    type TestDocType = HumanWithTimestampDocumentType;
    async function getAllDocsOfServer(
        name: string
    ): Promise<TestDocType[]> {
        const connectionState = await connectionStatePromise;
        await connectionState.jsm.streams.add({
            name,
            subjects: [
                name + '.*'
            ]
        });
        const consumer = await connectionState.js.consumers.get(name, {
            deliver_policy: DeliverPolicy.LastPerSubject
        });
        const messageResponse = await consumer.fetch();
        await (messageResponse as any).signal;
        await messageResponse.close();
        const useMessages: WithDeleted<TestDocType>[] = [];
        for await (const m of messageResponse) {
            useMessages.push(m.json());
            m.ack();
        }
        return useMessages;
    }

    function syncNats<RxDocType = TestDocType>(
        collection: RxCollection<RxDocType>,
        natsName: string
    ): RxNatsReplicationState<RxDocType> {
        const replicationState = replicateNats<RxDocType>({
            collection,
            replicationIdentifier: 'nats-' + natsName,
            streamName: natsName,
            subjectPrefix: natsName,
            connection: connectionSettings,
            pull: {
                batchSize
            },
            push: {
                batchSize
            }
        });
        ensureReplicationHasNoErrors(replicationState);
        return replicationState;
    }


    /**
     * Ids with chars that are not allowed in NATS subject tokens.
     * @link https://github.com/pubkey/rxdb/issues/9343
     */
    const SPECIAL_CHAR_IDS = [
        'a.b',
        '*',
        '>',
        'a*b',
        'a>b',
        'a b',
        'a\tb',
        '50%off',
        '%2E',
        'a%2Eb',
        'alice@example.com',
        'über',
        '🙂',
        'a:b\\c/d'
    ];

    describe('subject encoding', () => {
        it('should not change ids that are valid subject tokens', () => {
            [
                'foobar',
                'foo-bar_123',
                'über',
                '🙂',
                'a:b\\c/d=e',
                '[]{}\'äöüß'
            ].forEach(id => {
                assert.strictEqual(encodeNatsSubjectToken(id), id);
            });
        });
        it('should encode invalid chars and the escape char', () => {
            assert.strictEqual(encodeNatsSubjectToken('a.b'), 'a%2Eb');
            assert.strictEqual(encodeNatsSubjectToken('*'), '%2A');
            assert.strictEqual(encodeNatsSubjectToken('>'), '%3E');
            assert.strictEqual(encodeNatsSubjectToken('a b'), 'a%20b');
            assert.strictEqual(encodeNatsSubjectToken('a\tb'), 'a%09b');
            assert.strictEqual(encodeNatsSubjectToken('a\r\nb'), 'a%0D%0Ab');
            assert.strictEqual(encodeNatsSubjectToken('50%off'), '50%25off');
            assert.strictEqual(encodeNatsSubjectToken('a%2Eb'), 'a%252Eb');
            assert.strictEqual(getNatsDocumentSubject('foo.bar', 'alice@example.com'), 'foo.bar.alice@example%2Ecom');
        });
        it('should create valid, unique subject tokens and decode them back', () => {
            const encoded = new Set<string>();
            SPECIAL_CHAR_IDS.forEach(id => {
                const token = encodeNatsSubjectToken(id);
                assert.ok(!/[.*>\s]/.test(token), 'invalid token ' + token);
                assert.strictEqual(decodeNatsSubjectToken(token), id);
                encoded.add(token);
            });
            assert.strictEqual(encoded.size, SPECIAL_CHAR_IDS.length);
        });
        it('should only return a legacy subject for ids that could have been stored before', () => {
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'foobar'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'a.b'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'a.b%'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', '*'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', '>'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'a b%'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'a\tb*'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'über🙂'), undefined);
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', '50%off'), 'foo.50%off');
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'a*b'), 'foo.a*b');
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', 'x>y'), 'foo.x>y');
            assert.strictEqual(getNatsLegacyDocumentSubject('foo', '**'), 'foo.**');
        });
    });

    describe('init', () => {
        it('wait for server to be reachable', async function () {
            this.timeout(CONNECT_RETRY_TIME * CONNECT_MAX_TRIES + 30 * 1000);
            await connectionStatePromise;
            console.log('--');
            await waitUntil(async () => {
                const collection = await humansCollection.createHumanWithTimestamp(2, undefined, false);

                const natsName = randomToken(10);

                console.log('################ 0.1');

                const replicationState = syncNats(collection, natsName);
                ensureReplicationHasNoErrors(replicationState);
                console.log('################ 0.2');
                await replicationState.awaitInitialReplication();
                console.log('################ 0.3');

                const ret = await Promise.race([
                    replicationState.awaitInitialReplication().then(() => true),
                    wait(1000).then(() => false)
                ]);
                await collection.database.close();

                console.log('ret: ' + ret);
                return ret;

            });
        });
    });

    /**
     * Run the base test suite that is shared
     * across all replication plugins.
     */
    let baseNatsName = randomToken(10);
    runReplicationBaseTestSuite({
        startReplication(collection) {
            const replicationState = replicateNats({
                collection,
                replicationIdentifier: 'nats-base-' + baseNatsName,
                streamName: baseNatsName,
                subjectPrefix: baseNatsName,
                connection: connectionSettings,
                pull: {
                    batchSize
                },
                push: {
                    batchSize
                }
            });
            ensureReplicationHasNoErrors(replicationState);
            return replicationState;
        },
        async syncOnce(collection) {
            const natsName = baseNatsName;
            const replicationState = replicateNats({
                collection,
                replicationIdentifier: 'nats-once-' + natsName,
                streamName: natsName,
                subjectPrefix: natsName,
                connection: connectionSettings,
                live: false,
                pull: {},
                push: {},
            });
            ensureReplicationHasNoErrors(replicationState);
            await replicationState.awaitInitialReplication();
        },
        getAllServerDocs() {
            return getAllDocsOfServer(baseNatsName);
        },
        async cleanUpServer() {
            // Use a fresh stream name to avoid stale data from previous tests.
            await Promise.resolve();
            baseNatsName = randomToken(10);
        },
        softDeletes: true,
        isDeleted: (doc) => !!(doc as any)._deleted,
        getPrimaryOfServerDoc: (doc) => doc.passportId,
    });

    describe('special chars in primary keys', () => {
        async function getServerSubjects(name: string): Promise<string[]> {
            const connectionState = await connectionStatePromise;
            const consumer = await connectionState.js.consumers.get(name, {
                deliver_policy: DeliverPolicy.LastPerSubject
            });
            const messageResponse = await consumer.fetch();
            await (messageResponse as any).signal;
            await messageResponse.close();
            const subjects: string[] = [];
            for await (const m of messageResponse) {
                subjects.push(m.subject);
                m.ack();
            }
            return subjects;
        }
        it('should replicate documents with special chars in the primary key', async function () {
            this.timeout(30 * 1000);
            const natsName = randomToken(10);
            const collectionA = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            await collectionA.bulkInsert(
                SPECIAL_CHAR_IDS.map(id => schemaObjects.humanWithTimestampData({ id }))
            );
            const replicationStateA = syncNats(collectionA, natsName);
            await replicationStateA.awaitInitialReplication();

            const serverDocs = await getAllDocsOfServer(natsName);
            assert.deepStrictEqual(
                serverDocs.map(d => d.id).sort(),
                SPECIAL_CHAR_IDS.slice(0).sort()
            );
            const subjects = await getServerSubjects(natsName);
            assert.deepStrictEqual(
                subjects.sort(),
                SPECIAL_CHAR_IDS.map(id => getNatsDocumentSubject(natsName, id)).sort()
            );

            const collectionB = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            const replicationStateB = syncNats(collectionB, natsName);
            await replicationStateB.awaitInitialReplication();
            const docsB = await collectionB.find().exec();
            assert.deepStrictEqual(
                docsB.map(d => d.primary).sort(),
                SPECIAL_CHAR_IDS.slice(0).sort()
            );

            // updates must find the existing server state of the document
            const docA = await collectionA.findOne('a.b').exec(true);
            await docA.incrementalPatch({ name: 'updated' });
            await replicationStateA.awaitInSync();
            await waitUntil(async () => {
                const docB = await collectionB.findOne('a.b').exec(true);
                return docB.name === 'updated';
            });
            assert.strictEqual((await getServerSubjects(natsName)).length, SPECIAL_CHAR_IDS.length);

            await collectionA.database.close();
            await collectionB.database.close();
        });
        it('should find and move documents that are stored under the legacy subject', async function () {
            this.timeout(30 * 1000);
            const connectionState = await connectionStatePromise;
            const natsName = randomToken(10);
            const legacyIds = ['50%off', 'a*b', 'x>y'];
            await connectionState.jsm.streams.add({
                name: natsName,
                subjects: [natsName + '.*']
            });
            for (const docId of legacyIds) {
                const legacyDoc = schemaObjects.humanWithTimestampData({ id: docId, name: 'legacy' });
                await connectionState.js.publish(
                    natsName + '.' + docId,
                    connectionState.jc.encode(Object.assign({ _deleted: false }, legacyDoc))
                );
            }

            const collection = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            const replicationState = syncNats(collection, natsName);
            await replicationState.awaitInitialReplication();
            for (const docId of legacyIds) {
                const doc = await collection.findOne(docId).exec(true);
                assert.strictEqual(doc.name, 'legacy');
                await doc.incrementalPatch({ name: 'moved' });
            }
            await replicationState.awaitInSync();

            assert.deepStrictEqual(
                (await getServerSubjects(natsName)).sort(),
                legacyIds.map(docId => getNatsDocumentSubject(natsName, docId)).sort()
            );
            const serverDocs = await getAllDocsOfServer(natsName);
            assert.deepStrictEqual(
                serverDocs.map(d => d.id + ':' + d.name).sort(),
                legacyIds.map(docId => docId + ':moved').sort()
            );

            await collection.database.close();
        });
        it('should move a legacy document when its subject is the encoded subject of another document', async function () {
            this.timeout(30 * 1000);
            const connectionState = await connectionStatePromise;
            const natsName = randomToken(10);
            const legacyId = 'a%2Eb';
            const newId = 'a.b';
            assert.strictEqual(
                getNatsLegacyDocumentSubject(natsName, legacyId),
                getNatsDocumentSubject(natsName, newId)
            );
            await connectionState.jsm.streams.add({
                name: natsName,
                subjects: [natsName + '.*']
            });
            const legacyDoc = schemaObjects.humanWithTimestampData({ id: legacyId, name: 'legacy' });
            await connectionState.js.publish(
                natsName + '.' + legacyId,
                connectionState.jc.encode(Object.assign({ _deleted: false }, legacyDoc))
            );

            const collectionA = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            const replicationStateA = syncNats(collectionA, natsName);
            await replicationStateA.awaitInitialReplication();
            await collectionA.insert(schemaObjects.humanWithTimestampData({ id: newId, name: 'new' }));
            await replicationStateA.awaitInSync();

            assert.deepStrictEqual(
                (await getServerSubjects(natsName)).sort(),
                [
                    getNatsDocumentSubject(natsName, legacyId),
                    getNatsDocumentSubject(natsName, newId)
                ].sort()
            );
            const serverDocs = await getAllDocsOfServer(natsName);
            assert.deepStrictEqual(
                serverDocs.map(d => d.id + ':' + d.name).sort(),
                [legacyId + ':legacy', newId + ':new'].sort()
            );

            const collectionB = await humansCollection.createHumanWithTimestamp(0, undefined, false);
            const replicationStateB = syncNats(collectionB, natsName);
            await replicationStateB.awaitInitialReplication();
            assert.deepStrictEqual(
                (await collectionB.find().exec()).map(d => d.primary + ':' + d.name).sort(),
                [legacyId + ':legacy', newId + ':new'].sort()
            );

            // updating the moved legacy document must not touch the other document
            const legacyDocB = await collectionB.findOne(legacyId).exec(true);
            await legacyDocB.incrementalPatch({ name: 'legacy-updated' });
            await replicationStateB.awaitInSync();
            const serverDocsAfter = await getAllDocsOfServer(natsName);
            assert.deepStrictEqual(
                serverDocsAfter.map(d => d.id + ':' + d.name).sort(),
                [legacyId + ':legacy-updated', newId + ':new'].sort()
            );

            await collectionA.database.close();
            await collectionB.database.close();
        });
    });
});

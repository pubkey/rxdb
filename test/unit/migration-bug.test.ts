import { Subject } from 'rxjs';

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config.ts';
import {
    addRxPlugin,
    createRxDatabase,
    randomToken,
    removeRxDatabase,
    RxCollection,
    RxJsonSchema,
} from '../../plugins/core/index.mjs';
import { before } from 'mocha';
import { replicateRxCollection } from '../../plugins/replication/index.mjs';
import { RxDBMigrationSchemaPlugin } from '../../plugins/migration-schema/index.mjs';
import { RxDBUpdatePlugin } from '../../plugins/update/index.mjs';

addRxPlugin(RxDBMigrationSchemaPlugin);
addRxPlugin(RxDBUpdatePlugin);

const schemaV1: RxJsonSchema<any> = {
    title: 'TestSchema',
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: { type: 'string', maxLength: 50 },
        foo: { type: 'string' },
    },
    required: ['id'],
};

const schemaV2: RxJsonSchema<any> = {
    title: 'TestSchema',
    version: 1,
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: { type: 'string', maxLength: 50 },
        foo: { type: 'string' },
        bar: { type: 'string' },
    },
    required: ['id'],
};

const migrationStrategies = {
    1: (oldDoc: any) => oldDoc,
};

describe('migration-bug.test.js', () => {
    const dbName = randomToken(10);
    const identifier = 'items-pull';
    let collection: RxCollection;
    const pullStream$ = new Subject<any>();
    const storage = config.storage.getStorage();

    // function nextRev(rev: string): string {
    //   const n = parseInt(rev.split('-')[0], 10) + 1;
    //   return `${n}-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`;
    // }

    if (!config.storage.hasMultiInstance) {
        return;
    }

    before(async () => {
        await removeRxDatabase(dbName, storage);
    });

    after(async () => {
        pullStream$.complete();
        await removeRxDatabase(dbName, storage);
    });

    it('should update document via replication stream BEFORE migration', async () => {
        const dbV1 = await createRxDatabase({
            name: dbName,
            storage: storage,
            multiInstance: false,
            closeDuplicates: true,
        });

        await dbV1.addCollections({
            items: { schema: schemaV1 },
        });

        collection = dbV1.items;
        await collection.insert({ id: 'a', foo: 'initial' });

        const replicationStateBefore = replicateRxCollection({
            collection,
            replicationIdentifier: identifier,
            live: true,
            pull: {
                handler: async () => ({ documents: [], checkpoint: null }),
                stream$: pullStream$.asObservable(),
                modifier: (d) => {
                    console.log('modifier before' + JSON.stringify(d));
                    return d;
                },
            },
        });

        await replicationStateBefore.awaitInitialReplication();

        const sub1 = replicationStateBefore.received$.subscribe((doc) =>
            console.log('received BEFORE migration' + JSON.stringify(doc))
        );

        const preDoc = { id: 'a', foo: 'changed-before' };
        pullStream$.next({ documents: [preDoc], checkpoint: {} });

        await replicationStateBefore.awaitInSync();

        const emitted: any[] = [];
        const sub2 = collection
            .findOne('a')
            .$.subscribe((doc) => {
                emitted.push(doc);
            });

        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        assert.deepStrictEqual(emitted.pop().toJSON(), preDoc);

        await replicationStateBefore.cancel();
        sub1.unsubscribe();
        sub2.unsubscribe();
        await dbV1.close();
    });

    it('should update document via replication stream AFTER migration', async () => {
        const dbV2 = await createRxDatabase({
            name: dbName,
            storage: storage,
            multiInstance: false,
            closeDuplicates: true,
        });

        await dbV2.addCollections({
            items: {
                schema: schemaV2,
                migrationStrategies: migrationStrategies,
            },
        });

        collection = dbV2.items;

        
        const replicationStateAfter = replicateRxCollection({
            collection,
            replicationIdentifier: identifier,
            live: true,
            pull: {
                handler: async () => ({ documents: [], checkpoint: null }),
                stream$: pullStream$.asObservable(),
                modifier: (d) => {
                    console.log('modifier after' + JSON.stringify(d));
                    return d;
                },
            },
        });

        await replicationStateAfter.awaitInitialReplication();

        const sub1 = replicationStateAfter.received$.subscribe((doc) =>
            console.log('received After migration' + JSON.stringify(doc))
        );

        const postDoc = { id: 'a', foo: 'changed-after' };
        pullStream$.next({ documents: [postDoc], checkpoint: {} });

        await replicationStateAfter.awaitInSync();

        const emitted: any[] = [];
        const sub2 = collection.findOne('a').$.subscribe((doc) => {
            emitted.push(doc);
        });
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        assert.deepStrictEqual(emitted.pop().toJSON(), postDoc);

        await replicationStateAfter.cancel();
        sub1.unsubscribe();
        sub2.unsubscribe();
        await dbV2.close();
    });

    it('should update document via replication stream AFTER migration and local update', async () => {
        await removeRxDatabase(dbName, storage);
        const dbV1 = await createRxDatabase({
            name: dbName,
            storage: storage,
            multiInstance: false,
            closeDuplicates: true,
        });

        await dbV1.addCollections({
            items: {
                schema: schemaV1,
            },
        });
        collection = dbV1.items;
        await collection.insert({ id: 'a', foo: 'initial' });

        await dbV1.close();

        const dbV2 = await createRxDatabase({
            name: dbName,
            storage: storage,
            multiInstance: false,
            closeDuplicates: true,
        });

        await dbV2.addCollections({
            items: {
                schema: schemaV2,
                migrationStrategies: migrationStrategies,
            },
        });

        collection = dbV2.items;

        const docAfterPreRep = await collection.findOne('a').exec();
        await docAfterPreRep.update({
            $set: {
                foo: 'changed-preRep-afterMig',
            },
        });

        const docAfterPreRep_updaded = await collection.findOne('a').exec();
        assert.deepStrictEqual(docAfterPreRep_updaded.toJSON(), {
            id: 'a',
            foo: 'changed-preRep-afterMig',
        });

        const replicationStateAfter = replicateRxCollection({
            collection,
            replicationIdentifier: identifier,
            live: true,
            pull: {
                handler: async () => ({ documents: [], checkpoint: null }),
                stream$: pullStream$.asObservable(),
                modifier: (d) => {
                    console.log('modifier after' + JSON.stringify(d));
                    return d;
                },
            },
        });

        await replicationStateAfter.awaitInitialReplication();

        const sub1 = replicationStateAfter.received$.subscribe((doc) =>
            console.log('received After migration' + JSON.stringify(doc))
        );

        const postDoc = { id: 'a', foo: 'changed-after' };
        pullStream$.next({ documents: [postDoc], checkpoint: {} });

        await replicationStateAfter.awaitInSync();

        const emitted: any[] = [];

        const sub2 = collection
            .findOne('a')
            .$.subscribe((doc) => {
                emitted.push(doc);
            });
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);
        assert.deepStrictEqual(emitted.pop().toJSON(), postDoc);

        await replicationStateAfter.cancel();
        sub1.unsubscribe();
        sub2.unsubscribe();
        await dbV2.close();
    });
});

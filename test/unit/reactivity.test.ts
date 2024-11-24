import assert from 'assert';
import { describeParallel } from './config.ts';


import {
    schemaObjects,
    schemas,
    getConfig,
    SimpleHumanAgeDocumentType
} from '../../plugins/test-utils/index.mjs';

import { waitUntil } from 'async-test-util';
import { Observable } from 'rxjs';
import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxCollection,
    RxReactivityFactory,
    isRxDatabase
} from '../../plugins/core/index.mjs';

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
addRxPlugin(RxDBQueryBuilderPlugin);



/**
 * Here we test the custom reactivity that can be accessed with the
 * double dollar sign $.
 * Used for stuff like signals etc.
 */
describeParallel('reactivity.test.js', () => {
    type ReactivityType = {
        obs: Observable<any>;
        init: any;
    };
    const reactivity: RxReactivityFactory<ReactivityType> = {
        fromObservable(obs, init, rxDatabase) {
            // check input params
            assert.ok(isRxDatabase(rxDatabase));
            assert.strictEqual(typeof obs.subscribe, 'function');

            // return pseudo-signal
            return {
                obs,
                init
            };
        }
    };
    async function getReactivityCollection(): Promise<RxCollection<SimpleHumanAgeDocumentType, {}, {}, {}, ReactivityType>> {
        const db = await createRxDatabase({
            name: randomToken(10),
            storage: getConfig().storage.getStorage(),
            localDocuments: true,
            reactivity
        });
        await db.addCollections({
            docs: {
                schema: schemas.simpleHuman
            }
        });
        await db.docs.insert(schemaObjects.simpleHumanAge());
        return db.docs as any;
    }
    describe('RxDocument', () => {
        it('RxDocument.$$', async () => {
            const collection = await getReactivityCollection();
            // const query: RxQuery<SimpleHumanAgeDocumentType, unknown, unknown, ReactivityType> = collection.findOne();
            const query = collection.findOne();
            const doc = await query.exec(true);

            const signal = doc.$$;
            assert.deepStrictEqual(signal.init, doc._data);
            collection.database.close();
        });
        it('RxDocument.get$$()', async () => {
            const collection = await getReactivityCollection();
            const doc = await collection.findOne().exec(true);
            const signal = doc.get$$('age');
            assert.deepStrictEqual(signal.init, doc.age);
            collection.database.close();
        });
        it('RxDocument.deleted$$', async () => {
            const collection = await getReactivityCollection();
            const doc = await collection.findOne().exec(true);
            const signal = doc.deleted$$;
            assert.deepStrictEqual(signal.init, false);

            let lastEmit = false;
            signal.obs.subscribe((v: boolean) => lastEmit = v);
            await doc.remove();
            await waitUntil(() => !!lastEmit);
            collection.database.close();
        });
        it('RxDocument[proxy]$$', async () => {
            const collection = await getReactivityCollection();
            const doc = await collection.findOne().exec(true);
            const signal = (doc as any).age$$;
            assert.deepStrictEqual(signal.init, doc.age);
            collection.database.close();
        });
    });
    describe('RxLocalDocument', () => {
        it('RxLocalDocument.$$', async () => {
            const collection = await getReactivityCollection();
            const localDoc = await collection.database.insertLocal('foo', { bar: 1 });
            const signal: ReactivityType = localDoc.$$ as any;
            assert.deepStrictEqual(signal.init.data, { bar: 1 });
            collection.database.close();
        });
        it('RxLocalDocument.get$$()', async () => {
            const collection = await getReactivityCollection();
            const localDoc = await collection.database.insertLocal('foo', { bar: 1 });
            const signal: ReactivityType = localDoc.get$$('bar') as any;
            assert.deepStrictEqual(signal.init, 1);
            collection.database.close();
        });
        it('RxLocalDocument.deleted$$', async () => {
            const collection = await getReactivityCollection();
            const localDoc = await collection.database.insertLocal('foo', { bar: 1 });
            const signal: ReactivityType = localDoc.deleted$$ as any;
            assert.deepStrictEqual(signal.init, false);

            let lastEmit = false;
            signal.obs.subscribe((v: boolean) => lastEmit = v);
            await localDoc.remove();
            await waitUntil(() => !!lastEmit);
            collection.database.close();
        });
    });
    describe('RxQuery', () => {
        it('RxQuery.find().$$', async () => {
            const collection = await getReactivityCollection();
            const query = collection.find();
            const signal = query.$$;
            assert.deepStrictEqual(signal.init, undefined);

            let lastEmit = false;
            signal.obs.subscribe((v: boolean) => lastEmit = v);
            await waitUntil(() => Array.isArray(lastEmit));
            collection.database.close();
        });
        it('RxQuery.findOne().$$', async () => {
            const collection = await getReactivityCollection();
            const query = collection.findOne();
            const signal = query.$$;
            assert.deepStrictEqual(signal.init, undefined);

            let lastEmit = false;
            signal.obs.subscribe((v: boolean) => lastEmit = v);
            await waitUntil(() => !!lastEmit);
            collection.database.close();
        });
    });
    describe('issues', () => { });
});

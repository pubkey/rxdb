import assert from 'assert';
import clone from 'clone';
import config, { describeParallel } from './config.ts';


import {
    schemaObjects,
    schemas,
    humansCollection,
    isFastMode,
    HumanDocumentType,
    getConfig,
    SimpleHumanAgeDocumentType
} from '../../plugins/test-utils/index.mjs';

import AsyncTestUtil, { wait, waitUntil } from 'async-test-util';
import {
    createRxDatabase,
    RxDocument,
    isRxDocument,
    promiseWait,
    randomCouchString,
    addRxPlugin,
    RxCollection,
    RxQuery
} from '../../plugins/core/index.mjs';

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder/index.mjs';
addRxPlugin(RxDBQueryBuilderPlugin);


import {
    filter,
    map,
    first
} from 'rxjs/operators';
import { Observable } from 'rxjs';
import { RxReactivityFactory } from '../../src/types/plugins/reactivity';

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
        fromObservable(obs, init) {
            return {
                obs,
                init
            };
        }
    };
    async function getReactivityCollection(): Promise<RxCollection<SimpleHumanAgeDocumentType, {}, {}, {}, ReactivityType>> {
        const db = await createRxDatabase({
            name: randomCouchString(10),
            storage: getConfig().storage.getStorage(),
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
            collection.database.destroy();
        });
        it('RxDocument.get$$()', async () => {
            const collection = await getReactivityCollection();
            const doc = await collection.findOne().exec(true);
            const signal = doc.get$$('age');
            assert.deepStrictEqual(signal.init, doc.age);
            collection.database.destroy();
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
            collection.database.destroy();
        });
        it('RxDocument[proxy]$$', async () => {
            const collection = await getReactivityCollection();
            const doc = await collection.findOne().exec(true);
            const signal = doc.age$$;
            assert.deepStrictEqual(signal.init, doc.age);
            collection.database.destroy();
        });
    });
    describe('RxLocalDocument', () => {
        it('RxLocalDocument.$$', async () => { });
        it('RxLocalDocument.get$$()', async () => { });
        it('RxLocalDocument.deleted$$', async () => { });
        it('RxLocalDocument[proxy]$$', async () => { });
    });
    describe('RxQuery', () => {
        it('RxQuery.find().$$', async () => { });
        it('RxQuery.findOne().$$', async () => { });
    });
    describe('issues', () => { });
});

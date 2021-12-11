import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    randomCouchString,
    PouchDBInstance,
    flattenEvents
} from '../../plugins/core';

import {
    addCustomEventsPluginToPouch,
    getCustomEventEmitterByPouch,
    PouchDB
} from '../../plugins/pouchdb';


import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { waitUntil } from 'async-test-util';

addRxPlugin(RxDBQueryBuilderPlugin);

/**
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-pouchdb.test.js', () => {
    describe('custom events plugin', () => {
        it('should not throw when added to pouch', () => {
            addCustomEventsPluginToPouch();
        });
        it('should emit data on bulkDocs', async () => {
            const pouch: PouchDBInstance = new PouchDB(
                randomCouchString(12),
                {
                    adapter: 'memory'
                }
            ) as any;
            (pouch as any).primaryPath = '_id';

            const emitted: any[] = [];
            const sub = getCustomEventEmitterByPouch(pouch).subject.subscribe(ev => {
                emitted.push(ev);
            });

            await pouch.bulkDocs([{
                _id: 'foo',
                val: 'bar'
            }], {
                // add custom data to the options which should be passed through
                custom: {
                    foo: 'bar'
                }
            } as any);

            await waitUntil(() => flattenEvents(emitted).length === 1);

            const first = flattenEvents(emitted)[0];
            assert.deepStrictEqual(
                first.change.operation,
                'INSERT'
            );

            pouch.destroy();
            sub.unsubscribe();
        });
    });
});

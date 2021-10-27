import assert from 'assert';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    addRxPlugin,
    randomCouchString,
    getPseudoSchemaForVersion,
    getFromMapOrThrow,
    getNewestSequence,
    lastOfArray,
    writeSingle,
    blobBufferUtil,
    flatClone,
    MangoQuery,
    PouchDBInstance
} from '../../plugins/core';

import {
    getRxStoragePouch,
    addCustomEventsPluginToPouch,
    getCustomEventEmitterByPouch,
    PouchDB
} from '../../plugins/pouchdb';


import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import { randomString, wait, waitUntil } from 'async-test-util';
import {
    RxDocumentData,
    RxDocumentWriteData,
    RxLocalDocumentData,
    RxStorageChangeEvent
} from '../../src/types';

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

            await waitUntil(() => emitted.length === 1);

            const first = emitted[0];
            assert.deepStrictEqual(
                first.writeOptions.custom,
                { foo: 'bar' }
            );

            sub.unsubscribe();
        });
    });
});

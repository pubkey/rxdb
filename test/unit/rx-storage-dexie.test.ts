import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    MangoQuery,
    randomCouchString
} from '../../plugins/core';

import {
    RxStorageDexieStatics
} from '../../plugins/dexie';

import * as schemaObjects from '../helper/schema-objects';

import { RxDBKeyCompressionPlugin } from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import { humanMinimal } from '../helper/schemas';

/**
 * RxStoragePouch specific tests
 */
config.parallel('rx-storage-dexie.test.js', () => {
    describe('RxStorageDexieStatics', () => {
        describe('.getSortComparator()', () => {
            it('should sort in the correct order', () => {
                const docA = schemaObjects.human(
                    randomCouchString(10),
                    1
                );
                const docB = schemaObjects.human(
                    randomCouchString(10),
                    2
                );
                const query: MangoQuery = {
                    selector: {},
                    sort: [
                        { age: 'asc' }
                    ]
                }
                const comparator = RxStorageDexieStatics.getSortComparator(
                    humanMinimal,
                    query
                );
                const sortResult = comparator(docA, docB);
                assert.strictEqual(sortResult, -1);
                const sortResultReverse = comparator(docB, docA);
                assert.strictEqual(sortResultReverse, 1);
            });
        });
        describe('.getQueryMatcher()', () => {
            it('should find the matching document', () => {
                const docMatching = schemaObjects.human(
                    randomCouchString(10),
                    1
                );
                const docNotMatching = schemaObjects.human(
                    randomCouchString(10),
                    2
                );
                const query: MangoQuery = {
                    selector: {
                        age: 1
                    }
                };
                const matcher = RxStorageDexieStatics.getQueryMatcher(
                    humanMinimal,
                    query
                );
                const matching = matcher(docMatching as any);
                assert.ok(matching);

                const notMatching = matcher(docNotMatching as any);
                assert.strictEqual(notMatching, false);
            });
        });
    });
});

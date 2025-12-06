/**
 * Tests that `patch` and `incrementalPatch` can patch objects with deeply nested values without splicing out other values.
 */
import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import config from './config.ts';

import {
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';

describe('deep-incremental-patch.test.js', () => {
    it('should incrementally patch deeply nested values without splicing out other value', async function () {
        if (!config.storage.hasMultiInstance) {
            return;
        }

        // create a schema
        const mySchema = {
            version: 0,
            primaryKey: 'passportId',
            type: 'object',
            properties: {
                passportId: {
                    type: 'string',
                    maxLength: 100
                },
                data: {
                    type: 'object',
                    properties: {
                        firstName: {
                            type: 'string'
                        },
                        lastName: {
                            type: 'string'
                        },
                        age: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 150
                        },
                        deep: {
                            type: 'object',
                            properties: {
                                value: {
                                    type: 'boolean'
                                }
                            }
                        }
                    }
                }
            }
        };

        /**
         * Always generate a random database-name
         * to ensure that different test runs do not affect each other.
         */
        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
            /**
             * By calling config.storage.getStorage(),
             * we can ensure that all variations of RxStorage are tested in the CI.
             */
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collections = await db.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // insert a document
        await collections.mycollection.insert({
            passportId: 'foobar',
            data: {
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
                deep: {
                    value: true
                }
            }

        });

        /**
         * to simulate the event-propagation over multiple browser-tabs,
         * we create the same database again
         */
        const dbInOtherTab = await createRxDatabase({
            name,
            storage: config.storage.getStorage(),
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collectionInOtherTab = await dbInOtherTab.addCollections({
            mycollection: {
                schema: mySchema
            }
        });

        // find the document in the other tab
        let myDocument = await collectionInOtherTab.mycollection
            .findOne()
            .where('passportId')
            .eq('foobar')
            .exec();

        myDocument = await myDocument.incrementalPatch({
            data: {
                firstName: 'RxDb Developer'
            }
        });

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.data.firstName, 'RxDb Developer');

        // These would fail pre-change.
        assert.strictEqual(myDocument.data.lastName, 'Kelso');
        assert.strictEqual(myDocument.data.age, 56);
        assert.strictEqual(myDocument.data.deep.value, true);


        myDocument = await myDocument.patch({
            data: {
                deep: {
                    value: false
                }
            }
        });
        assert.strictEqual(myDocument.data.deep.value, false);

        // These would fail pre-change.
        assert.strictEqual(myDocument.data.firstName, 'RxDb Developer');
        assert.strictEqual(myDocument.data.lastName, 'Kelso');
        assert.strictEqual(myDocument.data.age, 56);



        // you can also wait for events
        const emitted: any[] = [];
        const sub = collectionInOtherTab.mycollection
            .findOne().$
            .subscribe(doc => {
                emitted.push(doc);
            });
        await AsyncTestUtil.waitUntil(() => emitted.length === 1);

        // clean up afterwards
        sub.unsubscribe();
        db.close();
        dbInOtherTab.close();
    });
});

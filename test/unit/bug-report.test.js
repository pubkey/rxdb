/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browsers' so it runs in the browser
 */
import assert from 'assert';

import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

describe('bug-report.test.js', () => {
    it('should keep old value on invalid update', async () => {
        // create a schema
        const schemaEnum = ['A', 'B'];
        const mySchema = {
            version: 0,
            type: 'object',
            properties: {
                children: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            name: { type: 'string' } ,
                            abLetter: {
                                type: 'string',
                                enum: schemaEnum,
                            },
                        }
                    }
                }
            }
        };

        // generate a random database-name
        const name = util.randomCouchString(10);

        // create a database
        const db = await RxDB.create({
            name,
            adapter: 'memory',
            ignoreDuplicate: true
        });
        // create a collection
        const collection = await db.collection({
            name: util.randomCouchString(10),
            schema: mySchema
        });

        // insert a document
        const doc = await collection.insert({
            children: [
                {name: 'foo', abLetter: 'A'},
                {name: 'bar', abLetter: 'B'},
            ],
        });

        const colDoc = await collection.findOne({ _id: doc._id }).exec();

        try {
            await colDoc.update({
                $set: {
                    'children.1.abLetter': 'invalidEnumValue',
                },
            });
        } catch (e) {}

        assert.equal(colDoc.children[1].abLetter, 'B');

        // clean up afterwards
        db.destroy();
    });
});

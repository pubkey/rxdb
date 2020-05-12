/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct position in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browsers' so it runs in the browser
 */
import assert from 'assert';

import {
    createRxDatabase, randomCouchString
} from '../../';
import {RxJsonSchema} from '../../src';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        // create a schema
        class Item {
            id: number = -1;
            projectId: string = '';
            name: string = '';
        }

        const mySchema: RxJsonSchema<Item> = {
            title: '',
            description: '',
            version: 0,
            keyCompression: false,
            type: 'object',
            properties: {
                projectId: { type: 'string' },
                id: { type: 'number' },
                name: { type: 'string' },
            },
            required: ['projectId', 'id', 'name'],
        };

        // generate a random database-name
        const name = randomCouchString(10);

        // create a database
        const db = await createRxDatabase({
            name,
            adapter: 'memory',
            eventReduce: true,
            ignoreDuplicate: true
        });
        // create a collection
        const collection = await db.collection({
            name: 'mycollection',
            schema: mySchema
        });


        const item = new Item();
        item.projectId = '...';
        item.id = 1;
        item.name = 'spasd';

        // insert a document
        await collection.insert(item);

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.doesNotThrow(await collection
            .findOne()
            .where('projectId')
            .eq('...')
            .where('id')
            .eq(1)
            .update({ $set: { name: 'new name' } }));

        // clean up afterwards
        db.destroy();
    });
});

// npm run test:node
// 1) bug-report.test.js
// should fail because it reproduces the bug:
//     RxError (VD2): RxError:
//     object does not match schema
// Given parameters: {
//     errors:[
//         {
//             "field": "data",
//             "message": "has additional properties"
//         }
//     ]
//     obj:{
//         "id": 1,
//             "projectId": "...",
//             "name": "new name",
//             "_id": "yb4nfgu7cb:1589224338163",
//             "_rev_tree": [
//             {
//                 "pos": 1,
//                 "ids": [
//                     "14bf68a361ba67f4ef3fed697822106c",
//                     {
//                         "status": "available"
//                     },
//                     []
//                 ]
//             }
//         ],
//             "_rev": "1-14bf68a361ba67f4ef3fed697822106c"
//     }
//     schema:{
//         "title": "",
//             "description": "",
//             "version": 0,
//             "keyCompression": false,
//             "type": "object",
//             "properties": {
//             "projectId": {
//                 "type": "string"
//             },
//             "id": {
//                 "type": "number"
//             },
//             "name": {
//                 "type": "string"
//             },
//             "_rev": {
//                 "type": "string",
//                     "minLength": 1
//             },
//             "_attachments": {
//                 "type": "object"
//             },
//             "_id": {
//                 "type": "string",
//                     "minLength": 1
//             }
//         },
//         "required": [
//             "projectId",
//             "id",
//             "name",
//             "_id"
//         ],
//             "additionalProperties": false,
//             "indexes": [],
//             "encrypted": []
//     }}
// at newRxError (src/rx-error.ts:104:12)
// at RxSchema.validate (src/plugins/validate.ts:52:15)
// at /home/maurice/Documents/common/projects/rxdb/src/rx-document.ts:314:40


import assert from 'assert';
import config from './config.ts';

import {
    createRxDatabase,
    randomToken
} from '../../plugins/core/index.mjs';
describe('allow character classes in patternProperties', () => {
    it('should fail because it reproduces the bug', async function () {

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
                personFields: {
                    type: 'object',
                    patternProperties: {
                        '^[a-z]\\w*$': {   // here is a regex that includes square brackets
                            type: 'string'
                        }
                    },
                    additionalProperties: false
                },
            }
        };

        const name = randomToken(10);

        // create a database
        const db = await createRxDatabase({
            name,
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
            personFields: {
                'firstLower': 'lower',
            },
        });

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
        const myDocument = await collectionInOtherTab.mycollection
            .findOne('foobar')
            .exec();

        /*
         * assert things,
         * here your tests should fail to show that there is a bug
         */
        assert.strictEqual(myDocument.personFields.firstLower, 'lower');

        db.close();
        dbInOtherTab.close();
    });
});

/**
 * If you found a bug in RxDB,
 * change everything in this test to reproduce it.
 */
import assert from 'assert';
import RxDB from '../../dist/lib/index';

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async() => {
        const schema = {
            version: 0,
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    primary: true
                },
                age: {
                    type: 'number'
                },
            },
            required: ['age']
        };

        const db = await RxDB.create({
            name: 'animalsdb',
            adapter: 'memory',
            password: 'myLongAndStupidPassword'
        });

        const collection = await db.collection({
            name: 'humans',
            schema
        });

        // insert a document
        await collection.insert({
            name: 'Alice',
            age: 18
        });

        // make a query
        const myDocument = await db.humans.findOne().exec();

        // do some assertions
        assert.equal(myDocument.name, 'Alice');
    });
});

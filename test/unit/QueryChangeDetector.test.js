import assert from 'assert';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('QueryChangeDetector.test.js', () => {

    describe('runChangeDetection()', () => {

    });

    describe('doesDocumentMatchQuery()', () => {
        it('should match', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            assert.ok(q._queryChangeDetector.doesDocumentMatchQuery(docData));
            col.database.destroy();
        });
        it('should not match', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('firstName').ne('foobar');
            const docData = schemaObjects.human();
            docData.firstName = 'foobar';
            assert.equal(false, q._queryChangeDetector.doesDocumentMatchQuery(docData));
            col.database.destroy();
        });
        it('should match ($gt)', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(1);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.ok(q._queryChangeDetector.doesDocumentMatchQuery(docData));
            col.database.destroy();
        });
        it('should not match ($gt)', async() => {
            const col = await humansCollection.create(0);
            const q = col.find().where('age').gt(100);
            const docData = schemaObjects.human();
            docData.age = 5;
            assert.equal(false, q._queryChangeDetector.doesDocumentMatchQuery(docData));
            col.database.destroy();
        });
    });

    describe('e', () => {
        it('e', () => process.exit());
    });
});

import assert from 'assert';

import { describeParallel } from './config.ts';
import {
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import {
    isRxDatabase,
    isRxCollection,
    isRxQuery,
    isRxDocument,
    isRxSchema
} from '../../plugins/core/index.mjs';

describeParallel('instance-of-check.test.js', () => {
    it('positive', async () => {
        const c = await humansCollection.create(1);
        const query = c.findOne();
        const doc = await query.exec();
        assert.ok(isRxDatabase(c.database));
        assert.ok(isRxCollection(c));
        assert.ok(isRxQuery(query));
        assert.ok(isRxDocument(doc));
        assert.ok(isRxSchema(c.schema));

        c.database.close();
    });
    it('negative', () => {
        const anyObj = {};
        assert.strictEqual(false, isRxDatabase(anyObj));
        assert.strictEqual(false, isRxCollection(anyObj));
        assert.strictEqual(false, isRxQuery(anyObj));
        assert.strictEqual(false, isRxDocument(anyObj));
        assert.strictEqual(false, isRxSchema(anyObj));

        // undefined
        assert.strictEqual(false, isRxDatabase(undefined));
        assert.strictEqual(false, isRxCollection(undefined));
        assert.strictEqual(false, isRxQuery(undefined));
        assert.strictEqual(false, isRxDocument(undefined));
        assert.strictEqual(false, isRxSchema(undefined));

        // null
        assert.strictEqual(false, isRxDatabase(null));
        assert.strictEqual(false, isRxCollection(null));
        assert.strictEqual(false, isRxQuery(null));
        assert.strictEqual(false, isRxDocument(null));
        assert.strictEqual(false, isRxSchema(null));

        // primitives
        assert.strictEqual(false, isRxDatabase(1));
        assert.strictEqual(false, isRxCollection(1));
        assert.strictEqual(false, isRxQuery(1));
        assert.strictEqual(false, isRxDocument(1));
        assert.strictEqual(false, isRxSchema(1));

        assert.strictEqual(false, isRxDatabase('hello'));
        assert.strictEqual(false, isRxCollection('hello'));
        assert.strictEqual(false, isRxQuery('hello'));
        assert.strictEqual(false, isRxDocument('hello'));
        assert.strictEqual(false, isRxSchema('hello'));

        assert.strictEqual(false, isRxDatabase(true));
        assert.strictEqual(false, isRxCollection(true));
        assert.strictEqual(false, isRxQuery(true));
        assert.strictEqual(false, isRxDocument(true));
        assert.strictEqual(false, isRxSchema(true));
    });
});

import assert from 'assert';
import config from './config';

import * as humansCollection from '../helper/humans-collection';
import {
    isRxDatabase,
    isRxCollection,
    isRxQuery,
    isRxDocument,
    isRxSchema
} from '../../plugins/core';

config.parallel('instance-of-check.test.js', () => {
    it('positive', async () => {
        const c = await humansCollection.create(1);
        const query = c.findOne();
        const doc = await query.exec();
        assert.ok(isRxDatabase(c.database));
        assert.ok(isRxCollection(c));
        assert.ok(isRxQuery(query));
        assert.ok(isRxDocument(doc));
        assert.ok(isRxSchema(c.schema));

        c.database.destroy();
    });
    it('negative', () => {
        const anyObj = {};
        assert.strictEqual(false, isRxDatabase(anyObj));
        assert.strictEqual(false, isRxCollection(anyObj));
        assert.strictEqual(false, isRxQuery(anyObj));
        assert.strictEqual(false, isRxDocument(anyObj));
        assert.strictEqual(false, isRxSchema(anyObj));
    });
});

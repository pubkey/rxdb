import assert from 'assert';

import * as humansCollection from '../helper/humans-collection';

import { addRxPlugin } from '../../plugins/core';

import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents';
addRxPlugin(RxDBLocalDocumentsPlugin);
import config from './config';
import { removeRxDatabase } from '../../src/rx-database';

let leveldown: any;
if (config.platform.isNode()) {
    leveldown = require('leveldown');
}

declare type TestDocType = {
    foo: string;
};

config.parallel('bug-report.test.ts', () => {
    describe('removeRxDB()!!!', () => {
        it('should delete local docs ', async () => {
            const localDocId = 'foobar';
            const c = await humansCollection.create();
            const doc = await c.insertLocal(localDocId, { foo: 'bar' });

            // remove the database
            await c.database.remove();

            // create a brand new database
            const cNew = await humansCollection.create();

            // get local doc from first database
            const fooBar = await c.getLocal(localDocId);

            assert.strictEqual(fooBar, undefined);
        });
    });
});

import assert from 'assert';

import * as humansCollection from '../helper/humans-collection';

import { addRxPlugin } from '../../plugins/core';

import { RxDBLocalDocumentsPlugin } from '../../plugins/local-documents';
// import { createRxCollectionStorageInstances } from '../../src/rx-collection-helper'
addRxPlugin(RxDBLocalDocumentsPlugin);
import config from './config';

let leveldown: any;
if (config.platform.isNode()) {
    leveldown = require('leveldown');
}

declare type TestDocType = {
    foo: string;
};

config.parallel('bug-report.test.ts', () => {
    describe.only('removeRxDB()!!!', () => {
        it.only('should delete local docs ', async () => {


            const localDocId = 'foobar';
            const c = await humansCollection.create2();
            const doc = await c.insertLocal(localDocId, { foo: 'bar' });

            // remove the database
            await c.database.remove();

            // create a brand new database
            const cNew = await humansCollection.create2();

            // get local doc from first database
            const fooBar = await cNew.getLocal(localDocId);

            assert.strictEqual(fooBar, null);
        });
    });
});

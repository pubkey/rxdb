import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
import * as _ from 'lodash';


import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});


describe('Hooks.test.js', () => {
    describe('get/set', () => {
        it('should set a hook', async() => {
            const c = await humansCollection.create(0);
            c.preSave(function() {}, false);
        });
        it('should get a hook', async() => {
            const c = await humansCollection.create(0);
            c.preSave(function() {}, false);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.series));
            assert.equal(hooks.series.length, 1);
        });
        it('should get a parallel hook', async() => {
            const c = await humansCollection.create(0);
            c.preSave(function() {}, true);
            const hooks = c.getHooks('pre', 'save');
            assert.ok(Array.isArray(hooks.parallel));
            assert.equal(hooks.parallel.length, 1);
        });
    });

    describe('insert', () => {

        it('pre: series', async() => {
            const c = await humansCollection.create(0);
            const human = schemaObjects.human();
            let count = 0;
            c.preInsert(function(doc) {
                assert.equal(doc.constructor.name, 'Object');
                count++;
            }, false);
            await c.insert(human);
            assert.equal(count, 1);
        });
        it('pre: parallel', async() => {
            const c = await humansCollection.create(0);
            const human = schemaObjects.human();
            let count = 0;
            c.preInsert(function(doc) {
                assert.equal(doc.constructor.name, 'Object');
                count++;
            }, false);
            let countp = 0;
            c.preInsert(function(doc) {
                assert.equal(doc.constructor.name, 'Object');
                countp++;
            }, true);
            c.insert(human);
            assert.equal(count, 1);
            assert.equal(countp, 1);
        });

        it('post: series', async() => {
            const c = await humansCollection.create(0);
            const human = schemaObjects.human();
            let count = 0;
            c.postInsert(function(doc) {
                assert.equal(doc.constructor.name, 'RxDocument');
                count++;
            }, false);
            await c.insert(human);
            assert.equal(count, 1);
        });

    });

    describe('exit', () => {
        it('e', () => process.exit());
    });

});

/**
 * this tests the reactive behaviour of RxDocument
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import * as humansCollection from '../helper/humans-collection';
import * as util from '../../dist/lib/util';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import RxDB from '../../dist/lib';
import {
    first
} from 'rxjs/operators';

config.parallel('reactive-document.test.js', () => {
    describe('.save()', () => {
        describe('positive', () => {
            it('should fire on save', async () => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();

                await doc.atomicSet('firstName', util.randomCouchString(8));

                const changeEvent = await doc.$.pipe(first()).toPromise();
                assert.equal(changeEvent._id, doc.primary);
                c.database.destroy();
            });
            it('should observe a single field', async () => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                const valueObj = {
                    v: doc.get('firstName')
                };
                doc.get$('firstName').subscribe(newVal => {
                    valueObj.v = newVal;
                });
                const setName = util.randomCouchString(10);
                await doc.atomicSet('firstName', setName);
                await util.promiseWait(5);
                assert.equal(valueObj.v, setName);
                c.database.destroy();
            });
            it('should observe a nested field', async () => {
                const c = await humansCollection.createNested();
                const doc = await c.findOne().exec();
                const valueObj = {
                    v: doc.get('mainSkill.name')
                };
                doc.get$('mainSkill.name').subscribe(newVal => {
                    valueObj.v = newVal;
                });
                const setName = util.randomCouchString(10);
                await doc.atomicSet('mainSkill.name', setName);
                util.promiseWait(5);
                assert.equal(valueObj.v, setName);
                c.database.destroy();
            });
            it('get equal values when subscribing again later', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                let v1;
                const sub = doc.get$('firstName').subscribe(newVal => v1 = newVal);
                await util.promiseWait(5);

                await doc.atomicSet('firstName', 'foobar');

                let v2;
                doc.get$('firstName').subscribe(newVal => v2 = newVal);

                assert.equal(v1, v2);
                assert.equal(v1, 'foobar');
                sub.unsubscribe();
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('cannot observe non-existend field', async () => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('foobar').subscribe(newVal => newVal),
                    'RxError',
                    'observe'
                );
                c.database.destroy();
            });
        });
    });
    describe('.deleted$', () => {
        describe('positive', () => {
            it('deleted$ is true, on delete', async () => {
                const c = await humansCollection.create();
                const doc = await c.findOne().exec();
                let deleted = null;
                doc.deleted$.subscribe(v => deleted = v);
                util.promiseWait(5);
                assert.deepEqual(deleted, false);
                await doc.remove();
                util.promiseWait(5);
                assert.deepEqual(deleted, true);
                c.database.destroy();
            });
        });
        describe('negative', () => {});
    });
    describe('.get$()', () => {
        describe('positive', () => {

        });
        describe('negative', () => {
            it('primary cannot be observed', async () => {
                const c = await humansCollection.createPrimary();
                const doc = await c.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('passportId'),
                    'RxError',
                    'primary path'
                );
                c.database.destroy();
            });
            it('final fields cannot be observed', async () => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const col = await db.collection({
                    name: 'humans',
                    schema: schemas.humanFinal
                });
                const docData = schemaObjects.human();
                await col.insert(docData);
                const doc = await col.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('age'),
                    'RxError',
                    'final fields'
                );
                db.destroy();
            });
        });
    });
});

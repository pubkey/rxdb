/**
 * this tests the reactive behaviour of RxDocument
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import * as humansCollection from '../helper/humans-collection';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    promiseWait,
    ensureNotFalsy
} from '../../';

import {
    first
} from 'rxjs/operators';
import type {
    RxChangeEvent,
    RxDocument
} from '../../src/types';
import { HumanDocumentType } from '../helper/schemas';

config.parallel('reactive-document.test.js', () => {
    describe('.save()', () => {
        describe('positive', () => {
            it('should fire on save', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);

                const oldName = doc.firstName;
                const newName = randomCouchString(8);

                const emittedCollection: RxChangeEvent<HumanDocumentType>[] = [];
                const colSub = c.$.subscribe(cE => {
                    emittedCollection.push(cE);
                });

                await doc.incrementalPatch({ firstName: newName });
                await AsyncTestUtil.waitUntil(() => {
                    const count = emittedCollection.length;
                    if (count > 1) {
                        throw new Error('too many events');
                    } else {
                        return emittedCollection.length === 1;
                    }
                });
                const docDataAfter = await doc.$.pipe(first()).toPromise();
                const changeEvent: any = emittedCollection[0];
                assert.strictEqual(changeEvent.documentData.firstName, newName);
                assert.strictEqual(changeEvent.previousDocumentData.firstName, oldName);


                assert.strictEqual(ensureNotFalsy(docDataAfter).passportId, doc.primary);
                assert.strictEqual(ensureNotFalsy(docDataAfter).passportId, doc.primary);
                colSub.unsubscribe();
                c.database.destroy();
            });
            it('should observe a single field', async () => {
                const c = await humansCollection.create();
                const doc: any = await c.findOne().exec();
                const valueObj = {
                    v: doc.get('firstName')
                };
                doc.get$('firstName').subscribe((newVal: any) => {
                    valueObj.v = newVal;
                });
                const setName = randomCouchString(10);
                await doc.incrementalPatch({ firstName: setName });
                await promiseWait(5);
                assert.strictEqual(valueObj.v, setName);
                c.database.destroy();
            });
            it('should observe a nested field', async () => {
                const c = await humansCollection.createNested();
                const doc = await c.findOne().exec(true);
                const valueObj = {
                    v: doc.get('mainSkill.name')
                };
                doc.get$('mainSkill.name').subscribe((newVal: any) => {
                    valueObj.v = newVal;
                });
                const setName = randomCouchString(10);
                await doc.incrementalPatch({
                    mainSkill: {
                        name: setName,
                        level: 10
                    }
                });
                promiseWait(5);
                assert.strictEqual(valueObj.v, setName);
                c.database.destroy();
            });
            it('get equal values when subscribing again later', async () => {
                const c = await humansCollection.create(1);
                const doc: any = await c.findOne().exec();
                let v1;
                const sub = doc.get$('firstName').subscribe((newVal: any) => v1 = newVal);
                await promiseWait(5);

                await doc.incrementalPatch({ firstName: 'foobar' });

                let v2;
                doc.get$('firstName').subscribe((newVal: any) => v2 = newVal);

                assert.strictEqual(v1, v2);
                assert.strictEqual(v1, 'foobar');
                sub.unsubscribe();
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('cannot observe non-existend field', async () => {
                const c = await humansCollection.create();
                const doc: any = await c.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('foobar').subscribe((newVal: any) => newVal),
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
                const doc: any = await c.findOne().exec();
                let deleted = null;
                doc.deleted$.subscribe((v: any) => deleted = v);
                promiseWait(5);
                assert.deepStrictEqual(deleted, false);
                await doc.remove();
                promiseWait(5);
                assert.deepStrictEqual(deleted, true);
                c.database.destroy();
            });
        });
        describe('negative', () => { });
    });
    describe('.get$()', () => {
        describe('positive', () => {

        });
        describe('negative', () => {
            it('primary cannot be observed', async () => {
                const c = await humansCollection.createPrimary();
                const doc = await c.findOne().exec(true);
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('passportId'),
                    'RxError',
                    'primary path'
                );
                c.database.destroy();
            });
            it('final fields cannot be observed', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.humanFinal
                    }
                });
                const col = cols.humans;
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
    describe('issues', () => {
        it('#3434 event data must not be mutateable', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(10),
                storage: config.storage.getStorage(),
                eventReduce: true,
                ignoreDuplicate: true
            });
            const collections = await db.addCollections({
                mycollection: {
                    schema: schemas.humanDefault
                }
            });
            await collections.mycollection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56
            });

            const person: RxDocument<HumanDocumentType> = await db.mycollection.findOne().exec();


            let hasThrown = false;
            person.$.subscribe(data => {
                try {
                    // mutating the document data is not allowed and should throw
                    delete (data as any)['_rev'];
                } catch (err) {
                    hasThrown = true;
                }
            });

            await person.incrementalModify(state => {
                state.age = 50;
                return state;
            });

            assert.strictEqual(person.getLatest().age, 50);
            assert.ok(hasThrown);

            db.destroy();
        });
    });
});

/**
 * this tests the reactive behaviour of RxDocument
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    humansCollection,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomToken,
    promiseWait,
    ensureNotFalsy
} from '../../plugins/core/index.mjs';

import {
    first,
} from 'rxjs/operators';
import type {
    RxChangeEvent
} from '../../plugins/core/index.mjs';
import { firstValueFrom } from 'rxjs';

describeParallel('reactive-document.test.js', () => {
    describe('.save()', () => {
        describe('positive', () => {
            it('should fire on save', async () => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec(true);

                const oldName = doc.firstName;
                const newName = randomToken(8);

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
                await c.database.close();
            });
            it('should observe a single field', async () => {
                const c = await humansCollection.create();
                const doc: any = await c.findOne().exec();
                const valueObj = {
                    v: doc.get('firstName')
                };
                const sub = doc.get$('firstName').subscribe((newVal: any) => {
                    valueObj.v = newVal;
                });
                const setName = randomToken(10);
                await doc.incrementalPatch({ firstName: setName });
                await promiseWait(5);
                assert.strictEqual(valueObj.v, setName);
                sub.unsubscribe();
                await c.database.close();
            });
            it('should observe a nested field', async () => {
                const c = await humansCollection.createNested();
                const doc = await c.findOne().exec(true);
                const valueObj = {
                    v: doc.get('mainSkill.name')
                };
                const sub = doc.get$('mainSkill.name').subscribe((newVal: any) => {
                    valueObj.v = newVal;
                });
                const setName = randomToken(10);
                await doc.incrementalPatch({
                    mainSkill: {
                        name: setName,
                        level: 10
                    }
                });
                await promiseWait(5);
                assert.strictEqual(valueObj.v, setName);
                sub.unsubscribe();
                await c.database.close();
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
                await c.database.close();
            });
        });
        describe('negative', () => {
            it('cannot observe non-existent field', async () => {
                const c = await humansCollection.create();
                const doc: any = await c.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('foobar').subscribe((newVal: any) => newVal),
                    'RxError',
                    'observe'
                );
                await c.database.close();
            });
        });
    });
    describe('.deleted$', () => {
        describe('positive', () => {
            it('deleted$ is true, on delete', async () => {
                const c = await humansCollection.create();
                const doc: any = await c.findOne().exec();
                let deleted = null;
                const sub = doc.deleted$.subscribe((v: any) => deleted = v);
                await promiseWait(5);
                assert.deepStrictEqual(deleted, false);
                await doc.remove();
                await promiseWait(5);
                assert.deepStrictEqual(deleted, true);
                sub.unsubscribe();
                await c.database.close();
            });
        });
        describe('negative', () => { });
        it('should not emit when deleted state has not changed', async () => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec(true);

            const emittedValues: boolean[] = [];
            const sub = doc.deleted$.subscribe((val: boolean) => {
                emittedValues.push(val);
            });

            // Wait for initial emission
            await promiseWait(50);
            assert.strictEqual(emittedValues.length, 1);
            assert.strictEqual(emittedValues[0], false);

            // Update the document without deleting it
            await doc.incrementalPatch({ firstName: 'changed1' });
            await promiseWait(50);

            // deleted$ should not emit again since deleted state is still false
            assert.strictEqual(
                emittedValues.length,
                1,
                'deleted$ should not emit when deleted state has not changed, but got ' + JSON.stringify(emittedValues)
            );

            // Update again
            await doc.incrementalPatch({ firstName: 'changed2' });
            await promiseWait(50);

            // Still should not have emitted
            assert.strictEqual(
                emittedValues.length,
                1,
                'deleted$ should still not have emitted after second update, but got ' + JSON.stringify(emittedValues)
            );

            // Now actually delete the document
            await doc.getLatest().remove();
            await promiseWait(50);

            // Now it should have emitted true
            assert.strictEqual(emittedValues.length, 2);
            assert.strictEqual(emittedValues[1], true);

            sub.unsubscribe();
            await c.database.close();
        });
    });
    describe('.$', () => {
        it('should emit a RxDocument, not only the document data', async () => {
            const c = await humansCollection.create(1);
            const doc = await c.findOne().exec(true);

            const firstEmitPromise = firstValueFrom(doc.$);
            doc.incrementalPatch({ age: 100 });

            const emitted = await firstEmitPromise;
            assert.ok(emitted.$);
            await c.database.close();
        });
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
                await c.database.close();
            });
            it('final fields cannot be observed', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const cols = await db.addCollections({
                    humans: {
                        schema: schemas.humanFinal
                    }
                });
                const col = cols.humans;
                const docData = schemaObjects.humanData();
                await col.insert(docData);
                const doc = await col.findOne().exec();
                await AsyncTestUtil.assertThrows(
                    () => doc.get$('age'),
                    'RxError',
                    'final fields'
                );
                await db.close();
            });
        });
    });
    describe('issues', () => {
        it('#4546 - should return the same valueObj for the same objPath', async () => {
            const c = await humansCollection.createNested();
            const doc = await c.findOne().exec(true);

            // Call get function multiple times with the same objPath
            const firstValueObject = doc.mainSkill;
            const valueObjects: typeof firstValueObject[] = [];
            valueObjects.push(doc.get('mainSkill'));
            valueObjects.push(doc.get('mainSkill'));
            valueObjects.push(doc.get('mainSkill'));

            // also check subscription values
            valueObjects.push(await firstValueFrom(doc.get$('mainSkill')));
            valueObjects.push(await firstValueFrom(doc.get$('mainSkill')));



            // Ensure that all returned valueObjs are the same object using Object.is comparison
            valueObjects.forEach(obj => {
                assert.equal(Object.is(firstValueObject, obj), true);
            });

            await c.database.close();
        });
    });
});

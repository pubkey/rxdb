import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
import * as _ from 'lodash';


import * as humansCollection from './../helper/humans-collection';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('Document.test.js', () => {
    describe('.get()', () => {
        describe('positive', () => {
            it('get a value', async() => {
                const c = await humansCollection.create(5);
                const doc = await c.findOne().exec();
                const value = doc.get('passportId');
                assert.equal(typeof value, 'string');
                c.database.destroy();
            });
            it('get a nested value', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.name');
                assert.equal(typeof value, 'string');
                const value2 = doc.get('mainSkill.level');
                assert.equal(typeof value2, 'number');
                c.database.destroy();
            });
            it('get null on undefined value', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const value = doc.get('foobar');
                assert.equal(value, null);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('throw if no string', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const path = {
                    foo: 'bar'
                };
                await util.assertThrowsAsync(
                    () => doc.get(path),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.set()', () => {
        describe('positive', () => {
            it('set the value', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                doc.set('passportId', val);
                assert.equal(doc.data.passportId, val);
                assert.equal(doc.get('passportId'), val);
                c.database.destroy();
            });
            it('set object', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = {
                    name: 'newSkill',
                    level: 2
                };
                doc.set('mainSkill', val);
                assert.equal(doc.data.mainSkill, val);
                assert.equal(doc.get('mainSkill'), val);
                c.database.destroy();
            });
            it('set nested', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'newSkill';
                doc.set('mainSkill.name', val);
                assert.equal(doc.data.mainSkill.name, val);
                assert.equal(doc.get('mainSkill.name'), val);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('throw if no string', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const path = {
                    foo: 'bar'
                };
                await util.assertThrowsAsync(
                    () => doc.set(path, 'foo'),
                    Error
                );
                c.database.destroy();
            });
            it('throw if not validates schema', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = {
                    foo: 'bar'
                };
                await util.assertThrowsAsync(
                    () => doc.set('passportId', val),
                    Error
                );
                c.database.destroy();
            });
            it('throw if not validates schema (additional property)', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                await util.assertThrowsAsync(
                    () => doc.set('newone', val),
                    Error
                );
                c.database.destroy();
            });
            it('cannot modifiy _id', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                await util.assertThrowsAsync(
                    () => doc.set('_id', val),
                    Error
                );
                c.database.destroy();
            });
            it('cannot set a nested key if root-path is not given', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne()
                    .select({
                        firstName: 1
                    })
                    .exec();
                await util.assertThrowsAsync(
                    () => doc.set('mainSkill.name', 'foobar'),
                    Error
                );
                c.database.destroy();
            });
        });
    });
    describe('.save()', () => {
        describe('positive', () => {
            it('save', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val = 'bliebla';
                doc.set('passportId', val);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.equal(docNew.get('passportId'), val);
                c.database.destroy();
            });
            it('save object', async() => {
                const c = await humansCollection.createNested(10);
                const doc = await c.findOne().exec();
                const val = {
                    name: randomToken(20),
                    level: 5
                };
                doc.set('mainSkill', val);
                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.deepEqual(doc2.get('mainSkill'), val);
                c.database.destroy();
            });
            it('save twice', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val1 = 'bliebla1';
                const val2 = 'bliebla2';
                doc.set('passportId', val1);
                await doc.save();
                const docNew = await c.findOne().exec();
                assert.equal(docNew.get('passportId'), val1);
                docNew.set('passportId', val1);
                const docNew2 = await c.findOne().exec();
                docNew2.set('passportId', val2);
                assert.equal(docNew2.get('passportId'), val2);
                c.database.destroy();
            });
            it('save same Doc twice', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const val1 = 'bliebla1';
                const val2 = 'bliebla2';
                doc.set('passportId', val1);
                await doc.save();
                doc.set('passportId', val2);
                await doc.save();
                assert.equal(doc.get('passportId'), val2);
                c.database.destroy();
            });
            it('be faster on nonchanged-save (string)', async() => {
                const amount = 50;
                const charAmount = 100;
                const c = await humansCollection.create(10);
                const doc = await c.findOne().sort({
                    passportId: 1
                }).exec();

                let start = new Date().getTime();
                for (let i = 0; i < amount; i++) {
                    doc.set('passportId', randomToken(charAmount));
                    await doc.save();
                }
                let duration = new Date().getTime() - start;

                const doc2 = await c.findOne().sort({
                    passportId: 1
                }).exec();
                let start2 = new Date().getTime();
                const val_same = randomToken(charAmount);
                for (let i = 0; i < amount; i++) {
                    doc2.set('passportId', val_same);
                    await doc2.save();
                }
                let duration2 = new Date().getTime() - start2;
                assert.ok(Math.round(duration / 2) > duration2);
                c.database.destroy();
            });
            it('be faster on nonchanged-save (object)', async() => {
                const amount = 50;
                const charAmount = 1000;
                const c = await humansCollection.createNested(100);
                const doc = await c.findOne().sort({
                    passportId: 1
                }).exec();

                let start = new Date().getTime();
                for (let i = 0; i < amount; i++) {
                    let newVal = {
                        name: randomToken(charAmount),
                        level: 5
                    };
                    doc.set('mainSkill', newVal);
                    await doc.save();
                }
                let duration = new Date().getTime() - start;

                const doc2 = await c.findOne().sort({
                    passportId: 1
                }).exec();
                let start2 = new Date().getTime();
                const val_same = {
                    name: randomToken(charAmount),
                    level: 5
                };
                for (let i = 0; i < amount; i++) {
                    doc2.set('mainSkill', val_same);
                    await doc2.save();
                }
                let duration2 = new Date().getTime() - start2;

                let o1 = {
                    name: 'asdf',
                    level: 5
                };
                let o2 = {
                    name: 'asdf',
                    level: 5
                };
                assert.ok((duration / 5) > duration2);
                c.database.destroy();
            });
            it('save one field while another field was not selected', async() => {
                const c = await humansCollection.createNested(5);
                const checkDoc = await c.findOne().sort({
                    passportId: 1
                }).exec();
                const mainSkill = checkDoc.get('mainSkill');
                const passportId = checkDoc.get('passportId');
                assert.ok(mainSkill);
                assert.ok(passportId);

                const doc = await c.findOne().select('firstName').sort({
                    passportId: 1
                }).exec();
                const newFirstName = randomToken(10);
                assert.equal(doc.get('mainSkill'), null);
                doc.set('firstName', newFirstName);
                await doc.save();

                const sameDoc = await c.findOne().sort({
                    passportId: 1
                }).exec();
                assert.equal(sameDoc.get('passportId'), passportId);
                assert.deepEqual(sameDoc.get('mainSkill'), mainSkill);
                assert.equal(sameDoc.get('firstName'), newFirstName);
                c.database.destroy();
            });

        });

        describe('negative', () => {
            it('save referenced to same doc twice', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                const doc_same = await c.findOne().exec();
                doc.set('passportId', 'any');
                await doc.save();
                doc_same.set('passportId', 'any');
                await util.assertThrowsAsync(
                    () => doc_same.save(),
                    Error
                );
                c.database.destroy();
            });

            it('save deleted', async() => {
                const c = await humansCollection.createNested(5);
                const doc = await c.findOne().exec();
                await doc.remove();
                doc.set('passportId', 'any');
                await util.assertThrowsAsync(
                    () => doc.save(),
                    Error
                );
                c.database.destroy();
            });

        });


    });
    describe('.remove()', () => {
        describe('positive', () => {
            it('delete 1 document', async() => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                assert.ok(docs.length > 1);
                const first = docs[0];
                await first.remove();
                const docsAfter = await c.find().exec();
                docsAfter.map(doc => {
                    if (doc.data.passportId == first.data.passportId)
                        throw new Error('still here after remove()');
                });
                c.database.destroy();
            });
            it('delete all in parrallel', async() => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const fns = [];
                docs.map(doc => fns.push(doc.remove()));
                await Promise.all(fns);
                const docsAfter = await c.find().exec();
                assert.equal(docsAfter.length, 0);
                c.database.destroy();
            });
        });
        describe('negative', () => {
            it('delete doc twice', async() => {
                const c = await humansCollection.create(5);
                const doc = await c.findOne().exec();
                await doc.remove();
                await util.assertThrowsAsync(
                    () => doc.remove(),
                    Error
                );
                c.database.destroy();
            });
        });
    });


    describe('Proxy', () => {
        describe('get', () => {
            it('top-value', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const passportId = doc.get('passportId');
                assert.equal(doc.passportId, passportId);
            });
            it('nested-value', async() => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const mainSkillLevel = doc.get('mainSkill.level');
                assert.equal(doc.mainSkill.level, mainSkillLevel);
            });
            it('deep-nested-value', async() => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const value = doc.get('mainSkill.attack.count');
                assert.equal(doc.mainSkill.attack.count, value);

                const value2 = doc.get('mainSkill.attack.good');
                assert.equal(doc.mainSkill.attack.good, value2);
            });
            it('top-value-observable', async() => {
                const c = await humansCollection.create(1);
                const doc = await c.findOne().exec();
                const obs = doc.firstName$;
                assert.equal(obs.constructor.name, 'Observable');

                let value = null;
                doc.firstName$.subscribe(newVal => {
                    value = newVal;
                });
                doc.set('firstName', 'foobar');
                await doc.save();
                await util.promiseWait(5);
                assert.equal(value, 'foobar');
            });
            it('nested-value-observable', async() => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                const obs = doc.mainSkill.level$;
                assert.equal(obs.constructor.name, 'Observable');

                let value = null;
                doc.mainSkill.level$.subscribe(newVal => {
                    value = newVal;
                });
                doc.set('mainSkill.level', 10);
                await doc.save();
                await util.promiseWait(5);
                assert.equal(value, 10);
            });
            it('deep-nested-value-observable', async() => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                const obs = doc.mainSkill.attack.good$;
                assert.equal(obs.constructor.name, 'Observable');

                let value = null;
                doc.mainSkill.attack.good$.subscribe(newVal => {
                    value = newVal;
                });
                doc.set('mainSkill.attack.good', true);
                await doc.save();
                await util.promiseWait(5);
                assert.equal(value, true);
            });
        });

        describe('set', () => {
            it('top value', async() => {
                const c = await humansCollection.createPrimary(1);
                const doc = await c.findOne().exec();
                doc.firstName = 'foobar';
                assert.equal(doc.firstName, 'foobar');

                await doc.save();
                const doc2 = await c.findOne(doc.passportId).exec();
                assert.equal(doc2.firstName, 'foobar');
            });
            it('nested value', async() => {
                const c = await humansCollection.createNested(1);
                const doc = await c.findOne().exec();
                doc.mainSkill.level = 10;
                assert.equal(doc.mainSkill.level, 10);

                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.mainSkill.level, 10);
            });
            it('deep nested value', async() => {
                const c = await humansCollection.createDeepNested(1);
                const doc = await c.findOne().exec();
                doc.mainSkill.attack.good = true;
                assert.equal(doc.mainSkill.attack.good, true);

                await doc.save();
                const doc2 = await c.findOne().exec();
                assert.equal(doc2.mainSkill.attack.good, true);
            });
        });
    });
});

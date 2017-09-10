import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import * as util from '../../dist/lib/util';
import * as RxDB from '../../dist/lib/index';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';

describe('orm.test.js', () => {
    describe('statics', () => {
        describe('create', () => {
            describe('positive', () => {
                it('create a collection with static-methods', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    await db.collection({
                        name: 'humans',
                        schema: schemas.human,
                        statics: {
                            foobar: function() {
                                return 'test';
                            }
                        }
                    });
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('crash when name not allowed (startsWith(_))', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.collection({
                            name: 'humans',
                            schema: schemas.human,
                            statics: {
                                _foobar: function() {
                                    return 'test';
                                }
                            }
                        }),
                        TypeError
                    );
                    db.destroy();
                });
                it('crash when name not allowed (name reserved)', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const reserved = [
                        'pouch',
                        'synced',
                        'migrate',
                        '$emit',
                        'insert',
                        'preInsert'
                    ];
                    let t = 0;
                    while (t < reserved.length) {
                        const statics = {};
                        statics[reserved[t]] = function() {};
                        await AsyncTestUtil.assertThrows(
                            () => db.collection({
                                name: 'humans',
                                schema: schemas.human,
                                statics
                            }),
                            Error,
                            reserved[t]
                        );
                        t++;
                    }
                    db.destroy();
                });

            });

        });
        describe('run', () => {
            it('should be able to run the method', async() => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    statics: {
                        foobar: function() {
                            return 'test';
                        }
                    }
                });
                const res = collection.foobar();
                assert.equal(res, 'test');
                db.destroy();
            });
            it('should have the right this-context', async() => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    statics: {
                        foobar: function() {
                            return this.name;
                        }
                    }
                });
                const res = collection.foobar();
                assert.equal(res, 'humans');
                db.destroy();
            });
            it('should be able to use this.insert()', async() => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    statics: {
                        foobar: function(obj) {
                            return this.insert(obj);
                        }
                    }
                });
                const res = collection.foobar(schemaObjects.human());
                assert.equal(res.constructor.name, 'Promise');
                await res;
                db.destroy();
            });
        });
    });
    describe('instance-methods', () => {
        describe('create', () => {
            describe('positive', () => {
                it('create a collection with instance-methods', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    await db.collection({
                        name: 'humans',
                        schema: schemas.human,
                        methods: {
                            foobar: function() {
                                return 'test';
                            }
                        }
                    });
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('crash when name not allowed (startsWith(_))', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.collection({
                            name: 'humans',
                            schema: schemas.human,
                            methods: {
                                _foobar: function() {
                                    return 'test';
                                }
                            }
                        }),
                        TypeError
                    );
                    db.destroy();
                });
                it('crash when name not allowed (name reserved)', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const reserved = [
                        'getPrimaryPath',
                        'get',
                        'toJSON',
                    ];
                    let t = 0;
                    while (t < reserved.length) {
                        const methods = {};
                        methods[reserved[t]] = function() {};
                        await AsyncTestUtil.assertThrows(
                            () => db.collection({
                                name: 'humans',
                                schema: schemas.human,
                                methods
                            }),
                            Error,
                            reserved[t]
                        );
                        t++;
                    }
                    db.destroy();
                });
                it('crash when name not allowed (name is top-level field in schema)', async() => {
                    const db = await RxDB.create({
                        name: util.randomCouchString(10),
                        adapter: 'memory'
                    });
                    const reserved = [
                        'passportId',
                        'firstName',
                        'lastName',
                        'age',
                    ];
                    let t = 0;
                    while (t < reserved.length) {
                        const methods = {};
                        methods[reserved[t]] = function() {};
                        await AsyncTestUtil.assertThrows(
                            () => db.collection({
                                name: 'humans',
                                schema: schemas.human,
                                methods
                            }),
                            Error,
                            reserved[t]
                        );
                        t++;
                    }
                    db.destroy();
                });
            });
        });

        describe('run', () => {
            it('should be able to run the method', async() => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    methods: {
                        foobar: function() {
                            return 'test';
                        }
                    }
                });
                await collection.insert(schemaObjects.human());
                const doc = await collection.findOne().exec();
                const res = doc.foobar();
                assert.equal(res, 'test');
                db.destroy();
            });
            it('should have the right this-context', async() => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    methods: {
                        foobar: function() {
                            return this.passportId;
                        }
                    }
                });
                const obj = schemaObjects.human();
                await collection.insert(obj);
                const doc = await collection.findOne().exec();
                const res = doc.foobar();
                assert.equal(res, obj.passportId);
                db.destroy();
            });
            it('should not be confused with many collections', async() => {
                const db = await RxDB.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    methods: {
                        foobar: () => '1'
                    }
                });
                const collection2 = await db.collection({
                    name: 'humans2',
                    schema: schemas.human,
                    methods: {
                        foobar: () => '2'
                    }
                });

                const docData = schemaObjects.human();
                const doc1 = await collection.insert(docData);
                const doc2 = await collection2.insert(docData);

                assert.equal('1', doc1.foobar());
                assert.equal('2', doc2.foobar());

                db.destroy();
            });
        });
    });
});

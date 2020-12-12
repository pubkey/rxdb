import assert from 'assert';
import AsyncTestUtil from 'async-test-util';

import config from './config';
import {
    createRxDatabase,
    randomCouchString
} from '../../plugins/core';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';

config.parallel('orm.test.js', () => {
    describe('statics', () => {
        describe('create', () => {
            describe('positive', () => {
                it('create a collection with static-methods', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    await db.collection({
                        name: 'humans',
                        schema: schemas.human,
                        statics: {
                            foobar: function () {
                                return 'test';
                            }
                        }
                    });
                    db.destroy();
                });
            });
            describe('negative', () => {
                it('crash when name not allowed (startsWith(_))', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.collection({
                            name: 'humans',
                            schema: schemas.human,
                            statics: {
                                _foobar: function () {
                                    return 'test';
                                }
                            }
                        }),
                        'RxTypeError',
                        'cannot start'
                    );
                    db.destroy();
                });
                it('crash when name not allowed (name reserved)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
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
                        const statics: any = {};
                        statics[reserved[t]] = function () { };
                        await AsyncTestUtil.assertThrows(
                            () => db.collection({
                                name: 'humans',
                                schema: schemas.human,
                                statics
                            }),
                            'RxError',
                            reserved[t]
                        );
                        t++;
                    }
                    db.destroy();
                });
            });
        });
        describe('run', () => {
            it('should be able to run the method', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    statics: {
                        foobar: function () {
                            return 'test';
                        }
                    }
                });
                const res = collection.foobar();
                assert.strictEqual(res, 'test');
                db.destroy();
            });
            it('should have the right this-context', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    statics: {
                        foobar: function () {
                            return this.name;
                        }
                    }
                });
                const res = collection.foobar();
                assert.strictEqual(res, 'humans');
                db.destroy();
            });
            it('should be able to use this.insert()', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    statics: {
                        foobar: function (obj: any) {
                            return this.insert(obj);
                        }
                    }
                });
                const res = collection.foobar(schemaObjects.human());
                assert.strictEqual(res.constructor.name, 'Promise');
                await res;
                db.destroy();
            });
        });
    });
    describe('instance-methods', () => {
        describe('create', () => {
            describe('positive', () => {
                it('create a collection with instance-methods', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    await db.collection({
                        name: 'humans',
                        schema: schemas.human,
                        methods: {
                            foobar: function () {
                                return 'test';
                            }
                        }
                    });
                    db.destroy();
                });
                it('this-scope should be bound to document', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const col = await db.collection({
                        name: 'humans',
                        schema: schemas.human,
                        methods: {
                            myMethod: function () {
                                return 'test:' + this.firstName;
                            }
                        }
                    });

                    // add one to ensure it does not overwrite
                    await col.insert(schemaObjects.human());

                    const docData = schemaObjects.human();
                    docData.firstName = 'foobar';
                    const doc = await col.insert(docData);

                    // add another one to ensure it does not overwrite
                    await col.insert(schemaObjects.human());

                    const val = doc.myMethod();
                    assert.strictEqual(val, 'test:foobar');

                    db.destroy();
                });
            });
            describe('negative', () => {
                it('crash when name not allowed (startsWith(_))', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.collection({
                            name: 'humans',
                            schema: schemas.human,
                            methods: {
                                _foobar: function () {
                                    return 'test';
                                }
                            }
                        }),
                        'RxTypeError'
                    );
                    db.destroy();
                });
                it('crash when name not allowed (name reserved)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
                        adapter: 'memory'
                    });
                    const reserved = [
                        'primaryPath',
                        'get',
                        'toJSON',
                    ];
                    let t = 0;
                    while (t < reserved.length) {
                        const methods: any = {};
                        methods[reserved[t]] = function () { };
                        await AsyncTestUtil.assertThrows(
                            () => db.collection({
                                name: 'humans',
                                schema: schemas.human,
                                methods
                            }),
                            'RxError',
                            reserved[t]
                        );
                        t++;
                    }
                    db.destroy();
                });
                it('crash when name not allowed (name is top-level field in schema)', async () => {
                    const db = await createRxDatabase({
                        name: randomCouchString(10),
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
                        const methods: any = {};
                        methods[reserved[t]] = function () { };
                        await AsyncTestUtil.assertThrows(
                            () => db.collection({
                                name: 'humans',
                                schema: schemas.human,
                                methods
                            }),
                            'RxError',
                            reserved[t]
                        );
                        t++;
                    }
                    db.destroy();
                });
            });
        });

        describe('run', () => {
            it('should be able to run the method', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    methods: {
                        foobar: function () {
                            return 'test';
                        }
                    }
                });
                await collection.insert(schemaObjects.human());
                const doc = await collection.findOne().exec();
                const res = doc.foobar();
                assert.strictEqual(res, 'test');
                db.destroy();
            });
            it('should have the right this-context', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
                    adapter: 'memory'
                });
                const collection = await db.collection({
                    name: 'humans',
                    schema: schemas.human,
                    methods: {
                        foobar: function () {
                            return this.passportId;
                        }
                    }
                });
                const obj = schemaObjects.human();
                await collection.insert(obj);
                const doc = await collection.findOne().exec();
                const res = doc.foobar();
                assert.strictEqual(res, obj.passportId);
                db.destroy();
            });
            it('should not be confused with many collections', async () => {
                const db = await createRxDatabase({
                    name: randomCouchString(10),
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

                assert.strictEqual('1', doc1.foobar());
                assert.strictEqual('2', doc2.foobar());

                db.destroy();
            });
        });
    });
    describe('ISSUES', () => {
        it('#791 Document methods are not bind() to the document', async () => {
            const db = await createRxDatabase({
                name: randomCouchString(),
                adapter: 'memory',
                multiInstance: false
            });

            const schema = {
                version: 0,
                type: 'object',
                primaryPath: '_id',
                properties: {
                    name: {
                        type: 'string'
                    },
                    nested: {
                        type: 'object',
                        properties: {
                            foo: {
                                type: 'string'
                            }
                        }
                    }
                }
            };

            const collection = await db.collection({
                name: 'person',
                schema: schema,
                methods: {
                    hello: function () {
                        return this.name;
                    }
                }
            });

            const doc = await collection.insert({
                name: 'hi',
                nested: {
                    foo: 'bar'
                }
            });

            // orm-method
            const hello = doc.hello;
            assert.strictEqual(hello(), 'hi');

            // prototype-method
            const get = doc.get;
            assert.strictEqual(get('name'), 'hi');

            // nested
            const nestedObj = doc.nested;
            assert.strictEqual(nestedObj.foo, 'bar');

            // nested getter-method
            const obs = nestedObj.foo$;
            const emitted: any[] = [];
            const sub = obs.subscribe((v: any) => emitted.push(v));
            await AsyncTestUtil.waitUntil(() => emitted.length === 1);
            assert.strictEqual(emitted[0], 'bar');
            sub.unsubscribe();

            db.destroy();
        });
    });
});

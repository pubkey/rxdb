import assert from 'assert';
import clone from 'clone';
import config, { describeParallel } from './config.ts';
import AsyncTestUtil, {
    randomBoolean,
    randomNumber,
    randomString,
    wait,
    assertThrows,
    waitUntil
} from 'async-test-util';

import {
    schemaObjects,
    schemas,
    humansCollection,
    isFastMode,
    HumanDocumentType,
    isNode,
    randomStringWithSpecialChars
} from '../../plugins/test-utils/index.mjs';

import {
    isRxCollection,
    isRxQuery,
    isRxDocument,
    createRxDatabase,
    randomToken,
    shuffleArray,
    RxJsonSchema,
    RxDatabase,
    RxError,
    addRxPlugin,
    runXTimes,
    RxCollection,
    ensureNotFalsy,
    lastOfArray,
    now,
    getFromMapOrThrow,
    RxCollectionCreator,
    parseRevision,
    getChangedDocumentsSince,
    hasPremiumFlag,
    NON_PREMIUM_COLLECTION_LIMIT
} from '../../plugins/core/index.mjs';

import { RxDBUpdatePlugin } from '../../plugins/update/index.mjs';
addRxPlugin(RxDBUpdatePlugin);
import { RxDBMigrationPlugin } from '../../plugins/migration-schema/index.mjs';
addRxPlugin(RxDBMigrationPlugin);

import { firstValueFrom } from 'rxjs';
import { RxDocumentData } from '../../plugins/core/index.mjs';

describe('rx-collection.test.ts', () => {
    async function getDb(): Promise<RxDatabase> {
        return await createRxDatabase({
            name: randomToken(10),
            storage: config.storage.getStorage()
        });
    }
    describe('static', () => {
        describe('.addCollections()', () => {
            it('should not crash', async () => {
                const db = await getDb();
                await db.addCollections({
                    one: {
                        schema: schemas.human
                    },
                    two: {
                        schema: schemas.human
                    }
                });
                assert.ok(isRxCollection(db.one));
                assert.ok(isRxCollection(db.two));
                db.close();
            });
        });
        describeParallel('.create()', () => {
            describe('positive', () => {
                it('human', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const collection = db.collections.human;
                    assert.ok(isRxCollection(collection));
                    db.close();
                });
                it('should not forget the options', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human,
                            options: {
                                foo: 'bar'
                            }
                        }
                    });
                    assert.strictEqual(collections.human.options.foo, 'bar');
                    db.close();
                });
            });
            describe('negative', () => {
                it('if not premium, it should limit the collections amount', async () => {
                    if ((await hasPremiumFlag())) {
                        return;
                    }
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    let t = NON_PREMIUM_COLLECTION_LIMIT + 1;
                    await assertThrows(
                        async () => {
                            while (t > 0) {
                                await db.addCollections({
                                    ['human_' + t]: {
                                        schema: schemas.human,
                                        options: {
                                            foo: 'bar'
                                        }
                                    }
                                });
                                t--;
                            }
                        },
                        'RxError',
                        'COL23'
                    );

                    await db.close();
                });
            });
        });
        describeParallel('.checkCollectionName()', () => {
            describe('positive', () => {
                it('allow not allow lodash', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.addCollections({
                            _foobar: {
                                schema: schemas.human
                            }
                        }),
                        'RxError',
                        'foobar'
                    );
                    db.close();
                });
                it('allow numbers', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    await db.addCollections({
                        fooba4r: {
                            schema: schemas.human
                        },
                        foobar4: {
                            schema: schemas.human
                        }
                    });
                    assert.ok(isRxCollection(db.collections.fooba4r));
                    assert.ok(isRxCollection(db.collections.foobar4));
                    db.close();
                });
            });
            describe('negative', () => {
                it('not allow starting numbers', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.addCollections({
                            '0foobar': {
                                schema: schemas.human
                            }
                        }),
                        'RxError'
                    );
                    db.close();
                });
                it('not allow uppercase-letters at the beginning', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    await AsyncTestUtil.assertThrows(
                        () => db.addCollections({
                            'Foobar': {
                                schema: schemas.human
                            }
                        }),
                        'RxError'
                    );

                    // in the middle, uppercase must be allowed
                    await db.addCollections({
                        'fooBar': {
                            schema: schemas.human
                        }
                    });

                    db.close();
                });
            });
        });
    });
    describe('instance', () => {
        describeParallel('.insert()', () => {
            describe('positive', () => {
                it('should insert a human', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    await collections.human.insert(schemaObjects.humanData());
                    db.close();
                });
                it('should insert nested human', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        nestedhuman: {
                            schema: schemas.nestedHuman
                        }
                    });
                    await collections.nestedhuman.insert(schemaObjects.nestedHumanData());
                    db.close();
                });
                it('should insert nested human with null prototype subobject', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        nestedhuman: {
                            schema: schemas.nestedHuman
                        }
                    });
                    const doc = schemaObjects.nestedHumanData();
                    doc.mainSkill = Object.create(null);
                    doc.mainSkill.name = 'Skill';
                    doc.mainSkill.level = 5;
                    try {
                        await collections.nestedhuman.insert(doc);
                    } catch (err) {
                        assert.fail('should not throw error: ' + (err as any).message);
                    }
                    db.close();
                });
                it('should insert more than once', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        nestedhuman: {
                            schema: schemas.nestedHuman
                        }
                    });
                    for (let i = 0; i < 10; i++) {
                        await collections.nestedhuman.insert(schemaObjects.nestedHumanData());
                    }
                    db.close();
                });
                it('should set default values', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        nestedhuman: {
                            schema: schemas.humanDefault
                        }
                    });

                    const data = {
                        passportId: 'foobar',
                    };
                    await collections.nestedhuman.insert(data);
                    const doc = await collections.nestedhuman.findOne().exec(true);
                    assert.strictEqual((doc as any).age, 20);

                    db.close();
                });
            });
            describe('negative', () => {
                it('should throw a conflict-error', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const docData = schemaObjects.humanData();
                    await collection.insert(docData);

                    const err: RxError = await AsyncTestUtil.assertThrows(
                        () => collection.insert(docData),
                        'RxError',
                        'conflict'
                    ) as any;
                    assert.deepStrictEqual(err.parameters.id, docData.passportId);

                    db.close();
                });
                it('should not allow wrong primaryKeys', async () => {
                    const c = await humansCollection.create(10);
                    async function ensurePrimaryKeyInsertThrows(id: string) {
                        const doc = schemaObjects.humanData(id);
                        await assertThrows(
                            () => c.insert(doc),
                            'RxError'
                        );
                    }
                    await Promise.all([
                        '   not-trimmed   ',
                        'contains \n linebreak',
                        '' // empty string
                    ].map(id => ensurePrimaryKeyInsertThrows(id)));
                    c.database.close();
                });
                /**
                 * @link https://github.com/pubkey/rxdb/issues/5046
                 */
                it('should throw a helpful error on non-plain-json data', async () => {
                    const c = await humansCollection.create(1);

                    // inserts
                    const doc = schemaObjects.humanData();
                    (doc as any).lastName = () => { };
                    await assertThrows(
                        () => c.insert(doc),
                        'RxError',
                        'DOC24'
                    );

                    // updates
                    const doc2 = await c.findOne().exec(true);
                    await assertThrows(
                        () => doc2.patch({ lastName: (() => { }) as any }),
                        'RxError',
                        'DOC24'
                    );
                    c.database.close();
                });
                /**
                 * Passing Date() objects was done wrong by so many people so we have
                 * our own error message for that.
                 */
                it('should throw a helpful error message on Date() objects', async () => {
                    const c = await humansCollection.create(1);

                    // inserts
                    const doc = schemaObjects.humanData();
                    (doc as any).lastName = new Date();
                    await assertThrows(
                        () => c.insert(doc),
                        'RxError',
                        'DOC24'
                    );

                    // updates
                    const doc2 = await c.findOne().exec(true);
                    await assertThrows(
                        () => doc2.patch({ lastName: new Date() as any }),
                        'RxError',
                        'DOC24'
                    );
                    c.database.close();
                });
            });
        });
        describeParallel('.insertIfNotExists()', () => {
            it('should insert the document when not exists', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                const doc = await collections.human.insertIfNotExists(schemaObjects.humanData('foobar'));
                assert.ok(isRxDocument(doc));
                assert.strictEqual(doc.primary, 'foobar');
                db.close();
            });
            it('should not overwrite if already there', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const collections = await db.addCollections({
                    human: {
                        schema: schemas.human
                    }
                });
                await collections.human.insert(schemaObjects.humanData('foobar', 1));
                const doc = await collections.human.insertIfNotExists(schemaObjects.humanData('foobar', 2));
                assert.ok(isRxDocument(doc));
                assert.strictEqual(doc.age, 1);
                db.close();
            });
        });
        describeParallel('.bulkInsert()', () => {
            describe('positive', () => {
                it('should insert some humans', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    const docs = new Array(10).fill(0).map(() => schemaObjects.humanData());
                    const ret = await collections.human.bulkInsert(docs);

                    assert.strictEqual(ret.success.length, 10);
                    db.close();
                });
                /**
                 * @link https://github.com/pubkey/rxdb/issues/6599
                 */
                it('should not throw when ids are set in pre-insert hook', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.human
                        }
                    });
                    collections.human.preInsert((doc) => {
                        doc.passportId = randomStringWithSpecialChars(8, 12);
                    }, false);
                    const docs = new Array(10).fill(0).map((): Partial<HumanDocumentType> => (({
                        passportId: _passportId,
                        ...humanDataWithoutPassportId
                    }) => humanDataWithoutPassportId)(schemaObjects.humanData()));

                    assert.ok(docs.every(doc => !doc.passportId));

                    const ret = await collections.human.bulkInsert(docs);

                    assert.strictEqual(ret.success.length, 10);
                    db.close();
                });
                it('should not throw when called with an empty array', async () => {
                    const col = await humansCollection.create(0);
                    await col.bulkInsert([]);
                    col.database.close();
                });
            });
            describe('negative', () => {
                it('should throw if one already exists', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const double = schemaObjects.humanData();
                    double.passportId = 'foobar';
                    await collection.insert(double);
                    const docs = new Array(10).fill(0).map(() => schemaObjects.humanData());
                    docs.push(double);
                    const ret = await collection.bulkInsert(docs);

                    assert.strictEqual(ret.success.length, 10);
                    assert.strictEqual(ret.error.length, 1);
                    db.close();
                });
                /**
                 * @link https://github.com/pubkey/rxdb/pull/6589
                 */
                it('should throw on duplicate ids', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: { schema: schemas.primaryHuman }
                    });

                    const human1 = schemaObjects.humanData('same-id');
                    const human2 = schemaObjects.humanData('same-id');

                    await assertThrows(
                        () => collections.human.bulkInsert([human1, human2]),
                        'RxError',
                        'COL22'
                    );

                    db.close();
                });
            });
        });
        describe('.find()', () => {
            describe('find all', () => {
                describe('positive', () => {
                    it('find all', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        for (const doc of docs) {
                            assert.ok(isRxDocument(doc));
                        }
                        c.database.close();
                    });
                    it('find 2 times', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const docs2 = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        assert.ok(docs2.length >= 10);
                        c.database.close();
                    });
                    runXTimes(isFastMode() ? 2 : 3, idx => {
                        it('find in serial #' + idx, async () => {
                            const c = await humansCollection.createPrimary(0);
                            const docData = schemaObjects.simpleHumanData();
                            const docs = await c.find().exec();
                            assert.strictEqual(docs.length, 0);
                            await c.insert(docData);

                            const docs2 = await c.find().exec();
                            assert.strictEqual(docs2.length, 1);
                            c.database.close();
                        });
                    });
                    it('find all by empty object', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        assert.ok(docs.length >= 10);
                        for (const doc of docs) {
                            assert.ok(isRxDocument(doc));
                        }
                        c.database.close();
                    });
                    it('find nothing with empty collection', async () => {
                        const db = await createRxDatabase({
                            name: randomToken(10),
                            storage: config.storage.getStorage(),
                        });
                        await db.addCollections({
                            humanx: {
                                schema: schemas.human
                            }
                        });
                        const collection = db.humanx;
                        const docs = await collection.find().exec();
                        assert.deepStrictEqual(docs, []);
                        db.close();
                    });
                    runXTimes(isFastMode() ? 2 : 5, idx => {
                        it('BUG: insert and find very often (' + idx + ')', async () => {
                            const db = await createRxDatabase({
                                name: randomToken(10),
                                storage: config.storage.getStorage(),
                            });
                            const collections = await db.addCollections({
                                human: {
                                    schema: schemas.human
                                }
                            });
                            const collection = collections.human;
                            const human = schemaObjects.humanData();
                            const passportId = human.passportId;
                            await collection.insert(human);
                            const docs = await collection.find().exec();
                            const doc = docs[0];
                            assert.strictEqual(passportId, (doc as any)._data.passportId);
                            db.close();
                        });
                    });
                });
                describe('negative', () => {
                    it('should crash with string as query', async () => {
                        const c = await humansCollection.create();
                        await AsyncTestUtil.assertThrows(
                            () => (c as any).find('foobar').exec(),
                            'RxError',
                            'COL5'
                        );
                        c.database.close();
                    });
                    it('should crash with array as query', async () => {
                        const c = await humansCollection.create();
                        await AsyncTestUtil.assertThrows(
                            () => (c as any).find([]).exec(),
                            'RxTypeError'
                        );
                        c.database.close();
                    });
                });
            });
            describeParallel('$eq', () => {
                describe('positive', () => {
                    it('find first by passportId', async () => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = shuffleArray(docs);
                        const last: any = docs.pop();
                        const passportId = last._data.passportId;
                        let doc: any = await c.find({
                            selector: {
                                passportId
                            }
                        }).exec();
                        assert.strictEqual(doc.length, 1);
                        doc = doc[0];
                        assert.deepStrictEqual(doc['data'], last.data);
                        c.database.close();
                    });
                    it('find none with random passportId', async () => {
                        const c = await humansCollection.create();
                        const query = c.find({
                            selector: {
                                passportId: randomToken(10)
                            }
                        });
                        const docs = await query.exec();
                        assert.strictEqual(docs.length, 0);
                        c.database.close();
                    });
                    it('find via $eq', async () => {
                        const c = await humansCollection.create();
                        let docs = await c.find().exec();
                        docs = shuffleArray(docs);
                        const last: any = docs.pop();
                        const passportId = last._data.passportId;
                        let doc: any = await c.find({
                            selector: {
                                passportId: {
                                    $eq: passportId
                                }
                            }
                        }).exec();
                        assert.strictEqual(doc.length, 1);
                        doc = doc[0];
                        assert.deepStrictEqual(doc['data'], last.data);
                        c.database.close();
                    });
                });
                describe('negative', () => { });
            });
            describeParallel('.or()', () => {
                it('should find the 2 documents with the or-method', async () => {
                    const c = await humansCollection.create(10);
                    // add 2 docs to be found
                    await c.insert({
                        passportId: randomString(12),
                        firstName: 'foobarAlice',
                        lastName: 'aliceLastName',
                        age: randomNumber(10, 50)
                    });
                    await c.insert({
                        passportId: randomString(12),
                        firstName: 'foobarBob',
                        lastName: 'bobLastName',
                        age: randomNumber(10, 50)
                    });
                    const query = c.find().or([{
                        firstName: 'foobarAlice'
                    }, {
                        firstName: 'foobarBob'
                    }]);

                    const results = await query.exec();
                    assert.strictEqual(results.length, 2);
                    const foundFirstNames = results.map(doc => doc.firstName);
                    assert.ok(foundFirstNames.includes('foobarAlice'));
                    assert.ok(foundFirstNames.includes('foobarBob'));
                    c.database.close();
                });
                it('should find the correct documents via $or on the primary key', async () => {
                    const c = await humansCollection.createPrimary(10);
                    const allDocs = await c.find().exec();
                    const firstFive = allDocs.slice(0, 5);
                    const selector = {
                        $or: firstFive.map(doc => ({ passportId: doc.passportId }))
                    };
                    const found = await c.find({
                        selector
                    }).exec();

                    assert.strictEqual(firstFive.length, found.length);
                    const firstId = firstFive[0].passportId;
                    assert.ok(
                        found.map(d => d.passportId).includes(firstId)
                    );
                    c.database.close();
                });
            });
            describeParallel('.sort()', () => {
                describe('positive', () => {
                    it('sort by age desc (with own index-search)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const query = c.find({
                            selector: {
                                age: {
                                    $gt: 0
                                }
                            }
                        }).sort({ age: 'desc' });

                        assert.ok(isRxQuery(query));
                        const docs = await query.exec();
                        assert.strictEqual(docs.length, 20);
                        assert.ok(ensureNotFalsy(docs[0]._data.age) >= ensureNotFalsy(docs[1]._data.age));
                        c.database.close();
                    });
                    it('sort by age desc (with default index-search)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 'desc'
                        }).exec();
                        assert.strictEqual(docs.length, 20);
                        assert.ok(ensureNotFalsy(docs[0]._data.age) >= ensureNotFalsy(docs[1]._data.age));
                        c.database.close();
                    });
                    it('sort by age asc', async () => {
                        const c = await humansCollection.createAgeIndex();
                        const docs = await c.find().sort({
                            age: 'asc'
                        }).exec();
                        assert.strictEqual(docs.length, 20);
                        assert.ok(ensureNotFalsy(docs[0]._data.age) <= ensureNotFalsy(docs[1]._data.age));
                        c.database.close();
                    });
                    it('sort by non-top-level-key as index (with keycompression)', async () => {
                        const db = await createRxDatabase({
                            name: randomToken(10),
                            storage: config.storage.getStorage(),
                        });
                        await db.addCollections({
                            human: {
                                schema: schemas.humanSubIndex
                            }
                        });
                        const collection = db.human;
                        const objects = new Array(10).fill(0).map(() => {
                            return {
                                passportId: randomToken(10),
                                other: {
                                    age: randomNumber(10, 50)
                                }
                            };
                        });
                        await Promise.all(objects.map(o => collection.insert(o)));

                        // with RxQuery
                        const query = collection.find().sort({
                            'other.age': 'asc'
                        });
                        const docs = await query.exec();

                        let lastAge = 0;
                        docs.forEach((doc: any) => {
                            assert.ok(doc.other.age >= lastAge);
                            lastAge = doc.other.age;
                        });
                        db.close();
                    });
                    it('validate results', async () => {
                        const c = await humansCollection.createAgeIndex(0);
                        const docsData = new Array(10)
                            .fill(0)
                            .map((_v, idx) => {
                                const docData = schemaObjects.humanData();
                                docData.age = idx + 10;
                                return docData;
                            });
                        await c.bulkInsert(docsData);

                        const desc = await c.find().sort({
                            age: 'desc'
                        }).exec();
                        const asc = await c.find().sort({
                            age: 'asc'
                        }).exec();
                        const ascIds = asc.map(d => d.primary);
                        const descIds = desc.map(d => d.primary);
                        const reverseDescIds = descIds.slice(0).reverse();

                        assert.deepStrictEqual(ascIds, reverseDescIds);
                        c.database.close();
                    });
                    it('find the same twice', async () => {
                        const c = await humansCollection.createNested(5);
                        const doc1 = await c.findOne().sort({
                            passportId: 'asc'
                        }).exec(true);
                        const doc2 = await c.findOne().sort({
                            passportId: 'asc'
                        }).exec(true);
                        assert.strictEqual(doc1._data.passportId, doc2._data.passportId);
                        c.database.close();
                    });
                    it('sort by compound index with id', async () => {
                        const c = await humansCollection.createIdAndAgeIndex();
                        const query = c.find({
                            selector: {
                                age: {
                                    $gt: 0
                                }
                            }
                        }).sort({
                            age: 'desc',
                            id: 'desc'
                        });

                        assert.ok(isRxQuery(query));
                        const docs = await query.exec();

                        assert.strictEqual(docs.length, 20);
                        assert.ok(
                            docs[0]._data.age > docs[1]._data.age ||
                            (
                                docs[0]._data.age === docs[1]._data.age &&
                                docs[0]._data.id > docs[1]._data.id
                            )
                        );
                        c.database.close();
                    });
                });
                describe('negative', () => {
                    it('#146 throw when field not in schema (object)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        await AsyncTestUtil.assertThrows(
                            () => c.find().sort({
                                foobar: 'desc'
                            }).exec(),
                            'RxError',
                            'QU13'
                        );
                        c.database.close();
                    });
                    it('#146 throw when field not in schema (string)', async () => {
                        const c = await humansCollection.createAgeIndex();
                        await AsyncTestUtil.assertThrows(
                            () => c.find().sort('foobar').exec(),
                            'RxError',
                            'QU13'
                        );
                        c.database.close();
                    });
                });
            });
            describeParallel('.limit()', () => {
                describe('positive', () => {
                    it('get first', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).exec();
                        assert.strictEqual(docs.length, 1);
                        assert.ok(isRxDocument(docs[0]));
                        c.database.close();
                    });
                    it('get last in order', async () => {
                        const c = await humansCollection.create(10);
                        const docs = await c.find().sort({
                            passportId: 'asc'
                        }).exec();
                        let firstDoc: any = await c.find().sort({
                            passportId: 'asc'
                        }).limit(1).exec();
                        firstDoc = firstDoc[0];

                        let last: any = await c.find().sort({
                            passportId: 'desc'
                        }).limit(1).exec();
                        last = last[0];

                        assert.strictEqual(last['_data'].passportId, docs[(docs.length - 1)]._data.passportId);
                        assert.notStrictEqual(firstDoc['_data'].passportId, last['_data'].passportId);

                        c.database.close();
                    });
                    it('reset limit with .limit(null)', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().limit(1).limit(null).exec();
                        assert.ok(docs.length > 1);
                        assert.ok(isRxDocument(docs[0]));
                        c.database.close();
                    });
                });
            });
            describeParallel('.skip()', () => {
                describe('positive', () => {
                    it('skip first', async () => {
                        const c = await humansCollection.create(
                            2,
                            randomToken(10),
                            false,
                            false
                        );

                        const query: any = {
                            selector: {},
                            sort: [
                                { passportId: 'asc' }
                            ]
                        };

                        const docs = await c.find(query).exec();
                        const noFirstQuery = c.find(query).skip(1);
                        const noFirst = await noFirstQuery.exec();
                        assert.strictEqual(noFirst.length, 1);
                        assert.strictEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.close();
                    });
                    it('skip first in order', async () => {
                        const db = await createRxDatabase<{ humans: RxCollection<HumanDocumentType>; }>({
                            name: randomToken(10),
                            storage: config.storage.getStorage(),
                            eventReduce: true
                        });
                        const collections = await db.addCollections({
                            humans: {
                                schema: schemas.humanDefault
                            }
                        });
                        const c = collections.humans;
                        await Promise.all(
                            new Array(5)
                                .fill(0)
                                .map(() => c.insert(schemaObjects.humanData()))
                        );

                        const docs = await c.find().sort({
                            passportId: 'asc'
                        }).exec();
                        const noFirst = await c.find().sort({
                            passportId: 'asc'
                        }).skip(1).exec();

                        assert.strictEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.close();
                    });
                    // This test failed randomly, so we run it more often.
                    new Array(isFastMode() ? 2 : 4)
                        .fill(0).forEach(() => {
                            it('skip first and limit (storage: ' + config.storage.name + ')', async () => {
                                const c = await humansCollection.create(5);

                                const docs = await c.find().sort('passportId').exec();
                                const second = await c.find().sort('passportId').skip(1).limit(1).exec();

                                try {
                                    assert.deepStrictEqual(docs[1].toJSON(), second[0].toJSON());
                                } catch (err) {
                                    console.log(docs.map(d => d.toJSON()));
                                    console.log(second.map(d => d.toJSON()));
                                    throw err;
                                }
                                c.database.close();
                            });
                        });
                    it('reset skip with .skip(null)', async () => {
                        const c = await humansCollection.create();
                        const docs = await c.find().exec();
                        const noFirst = await c.find().skip(1).skip(null).exec();
                        assert.notStrictEqual(noFirst[0]._data.passportId, docs[1]._data.passportId);
                        c.database.close();
                    });
                });
            });
            describeParallel('.regex()', () => {
                describe('positive', () => {
                    it('find the one where the regex matches', async () => {
                        const c = await humansCollection.create(10);
                        const matchHuman = schemaObjects.humanData();
                        matchHuman.firstName = 'FooMatchBar';
                        await c.insert(matchHuman);
                        const query = c.find({
                            selector: {
                                firstName: {
                                    $regex: 'Match'
                                }
                            }
                        });
                        const docs = await query.exec();
                        assert.strictEqual(docs.length, 1);
                        const firstDoc = docs[0];
                        assert.strictEqual(firstDoc.get('firstName'), matchHuman.firstName);
                        c.database.close();
                    });
                    it('case sensitive regex', async () => {
                        const c = await humansCollection.create(10);
                        const matchHuman = schemaObjects.humanData();
                        matchHuman.firstName = 'FooMatchBar';
                        await c.insert(matchHuman);
                        const docs = await c.find()
                            .where('firstName').regex({
                                $regex: 'match',
                                $options: 'i'
                            })
                            .exec();

                        assert.strictEqual(docs.length, 1);
                        const firstDoc = docs[0];
                        assert.strictEqual(firstDoc.get('firstName'), matchHuman.firstName);
                        c.database.close();
                    });
                    it('regex on index', async () => {
                        const c = await humansCollection.create(10);
                        const matchHuman = schemaObjects.humanData();
                        matchHuman.firstName = 'FooMatchBar';
                        await c.insert(matchHuman);
                        const docs = await c.find()
                            .where('firstName').regex('Match')
                            .exec();

                        assert.strictEqual(docs.length, 1);
                        const firstDoc = docs[0];
                        assert.strictEqual(firstDoc.get('firstName'), matchHuman.firstName);
                        c.database.close();
                    });
                });
                describe('negative', () => {
                    /**
                     * Disallowed since RxDB version 15.
                     * RegExp objects are mutable and cannot be JSON.stringify-ed.
                     * So in a query you have to always use string based regexes.
                     */
                    it('should not allow to use RegExp objects', async () => {
                        const c = await humansCollection.create(10);

                        // normal selector
                        await assertThrows(
                            () => c.find({
                                selector: {
                                    firstName: {
                                        $regex: /Match/ as any
                                    }
                                }
                            }),
                            'RxError',
                            'QU16'
                        );

                        // query builder
                        await assertThrows(
                            () => c.find()
                                .where('firstName').regex(/Match/ as any),
                            'RxError',
                            'QU16'
                        );

                        c.database.close();
                    });
                });
            });
            describeParallel('.remove()', () => {
                it('should remove one document', async () => {
                    const c = await humansCollection.create(1);
                    const query = c.find();
                    const removed = await query.remove();
                    assert.strictEqual(removed.length, 1);
                    removed.forEach(doc => {
                        assert.ok(isRxDocument(doc));
                        assert.strictEqual(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 0);
                    c.database.close();
                });
                it('should remove all documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find();

                    const removed = await query.remove();
                    assert.strictEqual(removed.length, 10);
                    removed.forEach(doc => {
                        assert.ok(isRxDocument(doc));
                        assert.strictEqual(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 0);
                    c.database.close();
                });
                it('should remove only found documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find().limit(5);

                    const removed = await query.remove();
                    assert.strictEqual(removed.length, 5);
                    removed.forEach(doc => {
                        assert.ok(isRxDocument(doc));
                        assert.strictEqual(doc.deleted, true);
                    });
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 5);
                    c.database.close();
                });
                it('remove on findOne', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.findOne();
                    const removed: any = await query.remove();
                    assert.ok(isRxDocument(removed));
                    assert.strictEqual(removed.deleted, true);
                    const docsAfter = await c.find().exec();
                    assert.strictEqual(docsAfter.length, 9);
                    c.database.close();
                });
                /**
                 * @link https://github.com/pubkey/rxdb/pull/3785
                 */
                it('#3785 should work when the collection name contains a dash or other special characters', async () => {
                    if (!config.storage.hasPersistence) {
                        return;
                    }

                    const collectionNames: string[] = [
                        'name_with_a_-_in',
                        'name_no_dash'
                    ].sort();

                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });

                    const collectionsCreator: { [k: string]: RxCollectionCreator; } = {};
                    collectionNames.forEach(collectionName => {
                        collectionsCreator[collectionName] = {
                            schema: schemas.human
                        };
                    });
                    await db.addCollections(collectionsCreator);

                    /**
                     * Add a document to each collection
                     */
                    const docData = schemaObjects.simpleHumanData();
                    await Promise.all(
                        Object.keys(db.collections).map(collectionName => {
                            return db.collections[collectionName].insert(docData);
                        })
                    );

                    const removedCollections = await db.remove();

                    assert.deepStrictEqual(
                        removedCollections.sort(),
                        collectionNames
                    );
                });
                /**
                 * @link https://github.com/pubkey/rxdb/pull/3788
                 */
                it('#3788 removing the collection should also remove all changes', async () => {
                    if (!config.storage.hasMultiInstance) {
                        return;
                    }

                    const dbName = randomToken();

                    const createDb = async () => {
                        const db = await createRxDatabase({
                            name: dbName,
                            storage: config.storage.getStorage(),
                            ignoreDuplicate: true
                        });
                        await db.addCollections({
                            'human-2': { schema: schemas.human }
                        });
                        return db;
                    };

                    const db1 = await createDb();

                    await db1.collections['human-2'].insert(schemaObjects.simpleHumanData());

                    // remove the collection on one database
                    await db1['human-2'].remove();
                    await db1.close();

                    const db2 = await createDb();

                    /**
                     * Getting the changes in the other database should have an empty result.
                     */
                    const changesResult = await getChangedDocumentsSince(db2['human-2'].storageInstance, 10);
                    assert.strictEqual(changesResult.documents.length, 0);

                    db2.close();
                });
                it('#5721 should remove the RxCollection instance across tabs and emit the .$removed event', async () => {
                    if (!config.storage.hasMultiInstance) {
                        return;
                    }

                    const dbName = randomToken();

                    async function createDb() {
                        const db = await createRxDatabase<{ humans: RxCollection<HumanDocumentType>; }>({
                            name: dbName,
                            storage: config.storage.getStorage(),
                            ignoreDuplicate: true
                        });
                        await db.addCollections({
                            humans: { schema: schemas.human }
                        });
                        await db.collections.humans.insert(schemaObjects.humanData());
                        return db;
                    }

                    const db1 = await createDb();
                    const db2 = await createDb();
                    const col1 = db1.humans;
                    const col2 = db2.humans;

                    // remember the emitted events
                    let emitted1 = false;
                    let emitted2 = false;
                    col1.onRemove.push(() => emitted1 = true);
                    col2.onRemove.push(() => emitted2 = true);

                    // remove collection2
                    await col2.remove();

                    await waitUntil(() => emitted1);
                    await waitUntil(() => emitted2);

                    // calling operations on other collection should also fail
                    await assertThrows(
                        () => col1.insert(schemaObjects.humanData()),
                        'RxError',
                        'COL21'
                    );

                    assert.deepStrictEqual(emitted1, emitted2);
                    db1.close();
                    db2.close();
                });
            });
            describeParallel('.bulkRemove()', () => {
                describe('positive', () => {
                    it('should remove some humans', async () => {
                        const amount = 5;
                        const c = await humansCollection.create(amount);
                        const docList = await c.find().exec();

                        assert.strictEqual(docList.length, amount);

                        const primaryList = docList.map(doc => doc.primary);
                        const ret = await c.bulkRemove(primaryList);
                        assert.strictEqual(ret.success.length, amount);

                        const finalList = await c.find().exec();
                        assert.strictEqual(finalList.length, 0);

                        c.database.close();
                    });
                    it('should not throw when called with an empty array', async () => {
                        const col = await humansCollection.create(0);
                        await col.bulkRemove([]);
                        col.database.close();
                    });
                });
            });
            describeParallel('.update()', () => {
                it('sets a field in all documents', async () => {
                    const c = await humansCollection.create(2);
                    const query = c.find();
                    await query.update({
                        $set: {
                            firstName: 'new first name'
                        }
                    });
                    const docsAfterUpdate = await c.find().exec();
                    for (const doc of docsAfterUpdate) {
                        assert.strictEqual(doc._data.firstName, 'new first name');
                    }

                    c.database.close();
                });
                it('unsets fields in all documents', async () => {
                    const c = await humansCollection.create(10);
                    const query = c.find();
                    await query.update({
                        $unset: {
                            age: ''
                        }
                    });
                    const docsAfterUpdate = await c.find().exec();
                    for (const doc of docsAfterUpdate) {
                        assert.strictEqual(doc.age, undefined);
                    }
                    c.database.close();
                });
            });
        });
        describeParallel('.findOne()', () => {
            describe('positive', () => {
                it('find a single document', async () => {
                    const c = await humansCollection.create();
                    const doc = await c.findOne().exec();
                    assert.ok(isRxDocument(doc));
                    c.database.close();
                });
                it('not crash on empty db', async () => {
                    const c = await humansCollection.create(0);
                    const docs = await c.find().limit(1).exec();
                    assert.strictEqual(docs.length, 0);
                    const doc = await c.findOne().exec();
                    assert.strictEqual(doc, null);
                    c.database.close();
                });
                it('find different on .skip()', async () => {
                    const c = await humansCollection.create();
                    const doc: any = await c.findOne().exec();
                    const doc2: any = await c.findOne().skip(2).exec();
                    assert.ok(isRxDocument(doc));
                    assert.ok(isRxDocument(doc2));
                    assert.notStrictEqual(doc._data.passportId, doc2._data.passportId);
                    c.database.close();
                });
                it('find by primary', async () => {
                    const c = await humansCollection.create();
                    const doc: any = await c.findOne().exec();
                    const _id = doc.primary;
                    assert.strictEqual(typeof _id, 'string');
                    const docById: any = await c.findOne(_id).exec();
                    assert.deepStrictEqual(docById.data, doc.data);
                    c.database.close();
                });
                it('find by primary in parallel', async () => {
                    const c = await humansCollection.createPrimary(0);

                    const docData = schemaObjects.simpleHumanData();
                    const primary = docData.passportId;

                    const notExist = await c.findOne(primary).exec();
                    assert.strictEqual(notExist, null);

                    const insertedDoc = await c.insert(docData);
                    assert.ok(isRxDocument(insertedDoc));

                    const results = await Promise.all([
                        c.findOne(primary).exec(true),
                        c.findOne(primary).exec(true)
                    ]);
                    assert.ok(isRxDocument(results[0]));

                    assert.ok(results[0] === results[1]);

                    await results[0].incrementalPatch({ firstName: 'foobar' });

                    const results2 = await Promise.all([
                        c.findOne(primary).exec(),
                        c.findOne(primary).exec()
                    ]);
                    assert.ok(isRxDocument(results2[0]));
                    assert.ok(results2[0] === results2[1]);

                    c.database.close();
                });
                runXTimes(isFastMode() ? 2 : 5, idx => {
                    it('BUG: insert and find very often (' + idx + ')', async function () {
                        const db = await createRxDatabase({
                            name: randomToken(10),
                            storage: config.storage.getStorage(),
                        });
                        const collections = await db.addCollections({
                            human: {
                                schema: schemas.human
                            }
                        });
                        const collection = collections.human;
                        const human = schemaObjects.humanData();
                        const passportId = human.passportId;
                        await collection.insert(human);
                        const doc = await collection.findOne().exec();
                        assert.strictEqual(passportId, doc._data.passportId);
                        db.remove();
                    });
                });
            });
            describe('negative', () => {
                it('BUG: should throw when no-string given (number)', async () => {
                    const c = await humansCollection.create();
                    await assertThrows(
                        () => (c as any).findOne(5),
                        'RxTypeError',
                        'COL6'
                    );
                    c.database.close();
                });
                it('BUG: should throw when no-string given (array)', async () => {
                    const c = await humansCollection.create();
                    await assertThrows(
                        () => (c as any).findOne([]),
                        'RxTypeError',
                        'COL6'
                    );
                    c.database.close();
                });
            });
        });
        describeParallel('.count()', () => {
            describe('basics', () => {
                it('should count one document', async () => {
                    const c = await humansCollection.create(1);
                    const count = await c.count().exec();
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
                it('should not count deleted documents', async () => {
                    const c = await humansCollection.create(2);
                    const emitted: number[] = [];
                    c.count().$.subscribe(nr => {
                        emitted.push(nr);
                    });
                    await waitUntil(() => emitted.length === 1);
                    const doc = await c.findOne().exec(true);
                    await doc.remove();
                    const count = await c.count().exec();

                    assert.strictEqual(count, 1);
                    assert.deepStrictEqual(emitted, [2, 1]);
                    c.database.close();
                });
                it('count matching only', async () => {
                    const c = await humansCollection.createAgeIndex(0);
                    await c.insert(schemaObjects.humanData('aa', 1));
                    await c.insert(schemaObjects.humanData('bb', 2));
                    const count = await c.count({
                        selector: {
                            age: {
                                $eq: 1
                            }
                        }
                    }).exec();
                    assert.strictEqual(count, 1);
                    c.database.close();
                });
            });
            describe('disallowed usage', () => {
                it('must throw when query has property of selectorSatisfiedByIndex=false', async () => {
                    const c = await humansCollection.create(0);
                    await AsyncTestUtil.assertThrows(
                        () => c.count({
                            selector: {
                                age: {
                                    $regex: 'foobar'
                                }
                            }
                        }).exec(),
                        'RxError',
                        'QU14'
                    );
                    c.database.close();
                });
                it('must throw on limit and skip', async () => {
                    const c = await humansCollection.create(0);
                    const query = c.count();
                    await AsyncTestUtil.assertThrows(
                        () => query.limit(11),
                        'RxError',
                        'QU15'
                    );

                    await AsyncTestUtil.assertThrows(
                        () => query.skip(11),
                        'RxError',
                        'QU15'
                    );

                    c.database.close();
                });
            });
            /**
             * @link https://github.com/pubkey/rxdb/pull/4775
             */
            it('#4775 count() broken on primary key', async () => {
                // create a schema
                const mySchema = {
                    version: 0,
                    primaryKey: 'passportId',
                    type: 'object',
                    properties: {
                        passportId: {
                            type: 'string',
                            maxLength: 30
                        },
                        firstName: {
                            type: 'string'
                        },
                        lastName: {
                            type: 'string'
                        },
                        age: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 150
                        }
                    }
                };

                const name = randomToken(10);
                const db = await createRxDatabase({
                    name,
                    storage: config.storage.getStorage(),
                    eventReduce: true,
                    ignoreDuplicate: true
                });
                const collections = await db.addCollections({
                    mycollection: {
                        schema: mySchema
                    }
                });

                // insert a document
                await collections.mycollection.insert({
                    passportId: 'foobar2',
                    firstName: 'Bob',
                    lastName: 'Kelso',
                    age: 56
                });
                await collections.mycollection.insert({
                    passportId: 'foobar3',
                    firstName: 'Bob',
                    lastName: 'Kelso',
                    age: 56
                });

                const countResult = await collections.mycollection
                    .count({
                        selector: {
                            passportId: {
                                $eq: 'foobar'
                            }
                        }
                    })
                    .exec();

                assert.strictEqual(countResult, 0);

                // clean up afterwards
                db.close();
            });
        });
        describeParallel('.bulkUpsert()', () => {
            it('insert and update', async () => {
                const c = await humansCollection.create(0);
                const amount = 5;

                // insert
                await c.bulkUpsert(
                    new Array(amount).fill(0).map(() => schemaObjects.humanData())
                );
                let allDocs = await c.find().exec();
                assert.strictEqual(allDocs.length, amount);

                // update
                const docsData = allDocs.map(d => {
                    const data = d.toMutableJSON();
                    data.age = 100;
                    return data;
                });
                const result = await c.bulkUpsert(docsData);
                assert.deepStrictEqual(result.error, []);
                allDocs = await c.find().exec();
                assert.strictEqual(allDocs.length, amount);
                allDocs.forEach(d => assert.strictEqual(d.age, 100));
                c.database.close();
            });
            /**
             * @link https://discord.com/channels/@me/1249794180826271857/1263119230929211504
             */
            it('issue: insert and update+insert breaks', async () => {
                const c = await humansCollection.create(0);

                // insert
                await c.bulkUpsert([schemaObjects.humanData('a')]);
                let allDocs = await c.find().exec();
                assert.strictEqual(allDocs.length, 1);

                // update+insert
                const writeData = [
                    {
                        ...allDocs[0].toMutableJSON(),
                        age: 100
                    },
                    schemaObjects.humanData('b')
                ];
                const result = await c.bulkUpsert(writeData);
                assert.deepStrictEqual(result.error, []);

                allDocs = await c.find({
                    sort: [{ passportId: 'asc' }]
                }).exec();
                assert.strictEqual(allDocs.length, 2);
                assert.strictEqual(allDocs[0].age, 100);

                c.database.close();
            });
            /**
             * @link https://github.com/pubkey/rxdb/pull/6589
             */
            it('should throw on duplicate ids', async () => {
                const db = await createRxDatabase({
                    name: randomToken(10),
                    storage: config.storage.getStorage(),
                });
                const collections = await db.addCollections({
                    human: { schema: schemas.primaryHuman }
                });

                const human1 = schemaObjects.humanData('same-id');
                const human2 = schemaObjects.humanData('same-id');

                await assertThrows(
                    () => collections.human.bulkUpsert([human1, human2]),
                    'RxError',
                    'COL22'
                );

                // should be the same behavior even if the document already exists
                await collections.human.insert(human1);
                await assertThrows(
                    () => collections.human.bulkUpsert([human1, human2]),
                    'RxError',
                    'COL22'
                );



                db.close();
            });
        });
        describeParallel('.upsert()', () => {
            describe('positive', () => {
                it('insert when not exists', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const obj = schemaObjects.simpleHumanData();
                    obj.firstName = 'foobar';
                    await collection.upsert(obj);
                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar');
                    db.close();
                });
                it('overwrite existing document', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const obj = schemaObjects.simpleHumanData();
                    await collection.insert(obj);
                    obj.firstName = 'foobar';
                    await collection.upsert(obj);
                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar');
                    db.close();
                });
                it('overwrite twice', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const obj = schemaObjects.simpleHumanData();

                    await collection.insert(obj);
                    obj.firstName = 'foobar';
                    await collection.upsert(obj);

                    obj.firstName = 'foobar2';
                    await collection.upsert(obj);

                    const doc = await collection.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar2');
                    db.close();
                });
                it('overwrite deleted', async () => {
                    const collection = await humansCollection.createPrimary(1);
                    const objData = schemaObjects.simpleHumanData();


                    let doc = await collection.insert(objData);
                    doc = await doc.incrementalPatch({
                        firstName: 'alice'
                    });
                    await doc.remove();

                    objData.firstName = 'foobar';
                    await collection.upsert(objData);

                    const docAfter = await collection.findOne(objData.passportId).exec(true);
                    assert.strictEqual(docAfter.firstName, 'foobar');

                    /**
                     * The storage must have auto-resolved the conflict
                     * because it was an insert to overwrite a previously deleted document.
                     * Therefore the revision height must be 4 and do not start with 1 again.
                     * @link https://github.com/pubkey/rxdb/pull/3839
                     */
                    const parsedRev = parseRevision(docAfter.toJSON(true)._rev);
                    assert.strictEqual(parsedRev.height, 4);

                    collection.database.close();
                });
            });
            describe('negative', () => {
                it('throw when primary missing', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    const obj = schemaObjects.simpleHumanData();
                    await collection.insert(obj);
                    const cloned: any = clone(obj);

                    cloned.firstName = 'foobar';
                    delete cloned.passportId;
                    await AsyncTestUtil.assertThrows(
                        () => collection.upsert(cloned),
                        'RxError',
                        'without primary'
                    );
                    db.close();
                });
            });
        });
        describe('.incrementalUpsert()', () => {
            describeParallel('positive', () => {
                it('should work in serial', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    const primary = docData.passportId;
                    await c.findOne(primary).exec();
                    await c.incrementalUpsert(docData);
                    await c.findOne(primary).exec();
                    const docData2 = clone(docData);
                    docData.firstName = 'foobar';

                    await c.incrementalUpsert(docData2);
                    c.database.close();
                });
                it('should not crash when upserting the same doc in parallel', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    const docs = await Promise.all([
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData)
                    ]);

                    /**
                     * Should not be equal because one doc state was inserted
                     * and the other was updated.
                     */
                    assert.ok(docs[0] !== docs[1]);
                    assert.ok(isRxDocument(docs[0]));
                    c.database.close();
                });
                it('should not crash when upserting the same doc in parallel 3 times', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    const docs = await Promise.all([
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData)
                    ]);
                    assert.ok(docs[0] !== docs[1]);
                    assert.ok(isRxDocument(docs[0]));
                    c.database.close();
                });
                it('should not crash when upserting the same doc in parallel many times with random waits', async function () {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    docData.firstName = 'test-many-incremental-upsert';

                    let t = 0;
                    const amount = isFastMode() ? 15 : 100;

                    const docs = await Promise.all(
                        new Array(amount)
                            .fill(0)
                            .map((_v, idx) => {
                                const upsertData = clone(docData);
                                upsertData.lastName = idx + '';
                                const randomWait = randomBoolean() ? wait(randomNumber(0, 30)) : Promise.resolve();
                                return randomWait
                                    .then(() => c.incrementalUpsert(upsertData))
                                    .then(doc => {
                                        t++;
                                        return doc;
                                    });
                            })
                    );
                    assert.strictEqual(t, amount);
                    assert.ok(docs[0] !== docs[1]);
                    assert.ok(isRxDocument(docs[0]));

                    c.database.close();
                });
                it('should update the value', async function () {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    const docId = docData.passportId;

                    await Promise.all([
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData)
                    ]);

                    const viaStorage = await c.storageInstance.findDocumentsById([docId], true);
                    const viaStorageDoc = viaStorage[0];
                    assert.ok(parseRevision(viaStorageDoc._rev).height >= 3);

                    const docData2 = clone(docData);
                    docData2.firstName = 'foobar';
                    await c.incrementalUpsert(docData2);
                    const doc = await c.findOne().exec(true);
                    assert.strictEqual(doc.firstName, 'foobar');

                    c.database.close();
                });
                it('should work when upserting to existing document', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    await c.insert(docData);
                    const docs = await Promise.all([
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData),
                        c.incrementalUpsert(docData)
                    ]);
                    assert.ok(docs[0] !== docs[1]);
                    assert.ok(isRxDocument(docs[0]));
                    c.database.close();
                });
                it('should process in the given order', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const docData = schemaObjects.simpleHumanData();
                    const order: any[] = [];
                    await Promise.all([
                        c.incrementalUpsert(docData).then(() => order.push(0)),
                        c.incrementalUpsert(docData).then(() => order.push(1)),
                        c.incrementalUpsert(docData).then(() => order.push(2))
                    ]);
                    assert.deepStrictEqual(order, [0, 1, 2]);

                    c.database.close();
                });
                it('should work when inserting on a slow storage', async () => {
                    if (!isNode) return;
                    // use a 'slow' adapter because memory might be to fast
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage(),
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const c = collections.human;

                    const docData = schemaObjects.simpleHumanData();
                    await c.incrementalUpsert(docData);
                    await c.incrementalUpsert(docData);
                    const docData2 = clone(docData);
                    docData2.firstName = 'foobar1';
                    await c.incrementalUpsert(docData2);
                    const docs = await c.find().exec();
                    assert.strictEqual(docs.length, 1);
                    const doc = await c.findOne().exec();
                    assert.strictEqual(doc.firstName, 'foobar1');

                    db.close();
                });
                it('should set correct default values', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });

                    const schema: RxJsonSchema<HumanDocumentType> = clone(schemas.humanDefault);

                    const defaultValue = schema.properties.age.default;
                    const collections = await db.addCollections({
                        nestedhuman: {
                            schema
                        }
                    });
                    const collection = collections.nestedhuman;

                    const doc = await collection.incrementalUpsert({
                        passportId: 'foobar',
                        firstName: 'foobar2'
                    });

                    assert.strictEqual(doc.age, defaultValue);

                    // should also set after incrementalModify when document exists
                    const afterUpdate = await collection.incrementalUpsert({
                        passportId: 'foobar',
                        firstName: 'foobar3'
                    });
                    assert.strictEqual(afterUpdate.age, defaultValue);

                    db.close();
                });
                it('should completely remove fields that are unset', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const schema: RxJsonSchema<HumanDocumentType> = clone(schemas.humanDefault);

                    const collections = await db.addCollections({
                        nestedhuman: {
                            schema
                        }
                    });
                    const collection = collections.nestedhuman;

                    const doc = await collection.incrementalUpsert({
                        passportId: 'foobar',
                        firstName: 'foobar2'
                    });
                    assert.strictEqual(doc.firstName, 'foobar2');

                    const afterUpdate = await collection.incrementalUpsert({
                        passportId: 'foobar'
                    });
                    assert.strictEqual(typeof afterUpdate.firstName, 'undefined');

                    db.close();
                });
            });
        });
        describeParallel('.remove()', () => {
            describe('positive', () => {
                it('should not crash', async () => {
                    const c = await humansCollection.createPrimary(0);
                    await c.remove();
                    c.database.close();
                });
                it('should be possible to re-create the collection with different schema', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;

                    await collection.remove();
                    const otherSchema: any = clone(schemas.primaryHuman);
                    otherSchema.properties['foobar'] = {
                        type: 'string'
                    };
                    await db.addCollections({
                        human: {
                            schema: otherSchema
                        }
                    });
                    db.close();
                });
                it('should not contain document when re-creating', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;
                    await Promise.all(
                        new Array(5).fill(0)
                            .map(() => collection.insert(schemaObjects.humanData()))
                    );
                    const allDocs = await collection.find().exec();
                    assert.strictEqual(5, allDocs.length);
                    await collection.remove();

                    const collections2 = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection2 = collections2.human;
                    const noDocs = await collection2.find().exec();
                    assert.strictEqual(0, noDocs.length);
                    db.close();
                });
                it('should have deleted the local documents', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman,
                            localDocuments: true
                        }
                    });
                    const collection = collections.human;
                    const id = 'foobar';
                    await collection.insertLocal(id, { foo: 'bar' });

                    await collection.remove();

                    const collections2 = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman,
                            localDocuments: true
                        }
                    });
                    const collection2 = collections2.human;
                    const hasLocal = await collection2.getLocal(id);
                    assert.strictEqual(hasLocal, null);

                    await db.close();
                });
                it('should delete when older versions exist', async () => {
                    const db = await createRxDatabase({
                        name: randomToken(10),
                        storage: config.storage.getStorage()
                    });
                    const collections = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection = collections.human;

                    await Promise.all(
                        new Array(5).fill(0)
                            .map(() => collection.insert(schemaObjects.humanData()))
                    );
                    await collection.remove();

                    const otherSchema = clone(schemas.primaryHuman);
                    otherSchema.version = 1;
                    const collections2 = await db.addCollections({
                        human: {
                            schema: otherSchema,
                            migrationStrategies: {
                                1: function (doc: any) {
                                    return doc;
                                }
                            }
                        }
                    });
                    const collection2 = collections2.human;

                    const noDocs = await collection2.find().exec();
                    assert.strictEqual(noDocs.length, 0);
                    await Promise.all(
                        new Array(5).fill(0)
                            .map(() => collection2.insert(schemaObjects.humanData()))
                    );
                    const fiveDocs = await collection2.find().exec();
                    assert.strictEqual(fiveDocs.length, 5);
                    await collection2.remove();


                    const collections0Again = await db.addCollections({
                        human: {
                            schema: schemas.primaryHuman
                        }
                    });
                    const collection0Again = collections0Again.human;
                    const noDocs2 = await collection0Again.find().exec();
                    assert.strictEqual(noDocs2.length, 0);

                    db.close();
                });
            });
            describe('negative', () => {
                it('should not have the collection in the collections-list', async () => {
                    const c = await humansCollection.createPrimary(0);
                    const db = c.database;
                    const name = c.name;
                    await c.remove();
                    assert.strictEqual(undefined, db[name]);
                    c.database.close();
                });
            });
        });
        describeParallel('.findByIds()', () => {
            it('should not crash', async () => {
                const c = await humansCollection.create();
                const res = await c.findByIds([
                    'foo',
                    'bar'
                ]);
                assert.ok(res);
                c.database.close();
            });
            it('should find the documents', async () => {
                const c = await humansCollection.create(5);

                const docs = await c.find().exec();
                const ids = docs.map(d => d.primary);
                const res = await c.findByIds(ids).exec();

                assert.ok(res.has(docs[0].primary));
                assert.strictEqual(res.size, 5);

                c.database.close();
            });
            it('should find the documents when they are not in the docCache', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const ids = docs.map(d => d.primary);

                // clear docCache
                ids.forEach(id => c._docCache.cacheItemByDocId.delete(id));

                const res = await c.findByIds(ids).exec();
                assert.strictEqual(res.size, 5);
                c.database.close();
            });
            it('we should be able to modify the documents', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const ids = docs.map((d) => d.primary);

                await c.findByIds(ids).modify((doc) => {
                    doc.firstName = 'abcdefghi';
                    return doc;
                });

                const res = await c
                    .count({ selector: { firstName: 'abcdefghi' } })
                    .exec();
                assert.strictEqual(res, 5);
                c.database.close();
            });
            it('we should be able to patch the documents', async () => {
                const c = await humansCollection.create(5);
                const docs = await c.find().exec();
                const ids = docs.map((d) => d.primary);

                await c.findByIds(ids).patch({ firstName: 'abcdefghi' });

                const res = await c
                    .count({ selector: { firstName: 'abcdefghi' } })
                    .exec();
                assert.strictEqual(res, 5);
                c.database.close();
            });
            /**
             * @link https://github.com/pubkey/rxdb/issues/6148
             */
            it('#6148 using chained queries on a find-by-id-query should throw a proper error message', async () => {
                const c = await humansCollection.create();
                const query = c.findByIds([
                    'foo',
                    'bar'
                ]);

                await assertThrows(
                    () => query.where('foo'),
                    'RxError',
                    'QU17'
                );
                await assertThrows(
                    () => query.gt(5),
                    'RxError',
                    'QU17'
                );

                c.database.close();
            });
        });
    });
    describeParallel('.findByIds.$()', () => {
        it('should not crash and emit a map', async () => {
            const c = await humansCollection.create(5);
            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            const res = await firstValueFrom(c.findByIds(ids).$);

            assert.ok(res);
            assert.ok(res instanceof Map);

            c.database.close();
        });
        it('should emit the correct initial values', async () => {
            const c = await humansCollection.create(5);

            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            const res = await firstValueFrom(c.findByIds(ids).$);

            assert.ok(res.has(docs[0].primary));
            assert.strictEqual(res.size, 5);

            c.database.close();
        });
        it('should merge the insert/update/delete event correctly', async () => {
            const c = await humansCollection.createPrimary(5);
            const docs = await c.find().exec();
            const ids = docs.map(d => d.primary);
            ids.push('foobar');
            const obs = c.findByIds(ids).$;
            await firstValueFrom(obs);

            // check insert
            const addData = schemaObjects.humanData();
            addData.passportId = 'foobar';
            await c.insert(addData);
            // insert whose id is not in ids-list should not affect anything
            await c.insert(schemaObjects.humanData());

            const res2 = await firstValueFrom(obs);
            assert.strictEqual(res2.size, 6);
            assert.ok(res2.has('foobar'));

            // check update
            addData.firstName = 'barfoo';
            await c.upsert(addData);
            const res3 = await firstValueFrom(obs);
            const getDoc = res3.get('foobar');
            assert.ok(getDoc);
            assert.strictEqual(getDoc.firstName, 'barfoo');

            // check delete
            await getDoc.remove();
            const res4 = await firstValueFrom(obs);
            assert.strictEqual(false, res4.has('foobar'));

            c.database.close();
        });

    });
    describe('issues', () => {
        it('#528  default value ignored when 0', async () => {
            const schema = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100
                    },
                    weight: {
                        type: 'number',
                        default: 0
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                humanx: {
                    schema
                }
            });
            const collection = collections.humanx;
            const doc = await collection.insert({
                passportId: randomToken(10)
            });
            assert.strictEqual(doc.weight, 0);
            db.close();
        });
        it('#596 Default value not applied when value is undefined', async () => {
            const schema = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100
                    },
                    firstName: {
                        type: 'string'
                    },
                    lastName: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    },
                    score: {
                        type: 'integer',
                        default: 100
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });
            const collections = await db.addCollections({
                humanx: {
                    schema
                }
            });
            const collection = collections.humanx;

            // insert a document
            await collection.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56,
                score: undefined
            });
            const myDocument = await collection
                .findOne()
                .where('firstName')
                .eq('Bob')
                .exec();
            assert.strictEqual(myDocument.score, 100);
            db.close();
        });
        it('#939 creating a collection mutates the given parameters-object', async () => {
            const schema = {
                version: 0,
                primaryKey: 'passportId',
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        maxLength: 100
                    },
                    weight: {
                        type: 'number',
                        default: 0
                    }
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage()
            });

            const collectionParams = {
                schema,
                methods: {
                    foo() {
                        return 'bar';
                    }
                },
                statics: {
                    foo2() {
                        return 'bar2';
                    }
                }
            };
            const cloned = clone(collectionParams);
            await db.addCollections({
                humans: collectionParams
            });
            assert.deepStrictEqual(Object.keys(cloned), Object.keys(collectionParams));
            assert.deepStrictEqual(cloned, collectionParams);

            await db.close();

            // recreating with the same params-object should work
            const db2 = await createRxDatabase({
                name: randomToken(10),
                storage: config.storage.getStorage(),
            });
            await db2.addCollections({
                humans: collectionParams
            });
            assert.deepStrictEqual(cloned, collectionParams);

            db2.close();
        });
        it('#3661 .findByIds.$() fires too often', async () => {
            const collection = await humansCollection.create(0);

            //  Record subscription
            const emitted: Map<string, RxDocumentData<HumanDocumentType>>[] = [];

            function createObject(id: string): RxDocumentData<HumanDocumentType> {
                const ret: RxDocumentData<HumanDocumentType> = Object.assign(
                    schemaObjects.humanData(),
                    {
                        passportId: id,
                        _deleted: false,
                        _attachments: {},
                        _meta: {
                            lwt: now()
                        },
                        _rev: '1-51b2fae5721cc4d3cf7392f19e6cc118'
                    }
                );
                return ret;
            }

            const matchingIds = ['a', 'b', 'c', 'd'];

            const sub = collection.findByIds(matchingIds).$.subscribe(data => {

                const m = new Map();
                Array
                    .from(data.entries())
                    .forEach(([id, doc]) => {
                        m.set(id, doc.toJSON(true));
                    });
                emitted.push(m);
            });

            //  test we have a map and no error
            await AsyncTestUtil.waitUntil(() => emitted.length > 0);
            await AsyncTestUtil.wait(100);

            /**
             * Should have emitted exactly once with an empty map
             * because we have no document at all in the storage.
             */
            assert.strictEqual(emitted.length, 1);

            /**
             * Non-existing documents should not be in the map at all
             * (also not with undefined value)
             */
            assert.strictEqual(emitted[0].size, 0);


            //  Simulate a write from a primitive replication
            await collection.storageInstance.bulkWrite(
                matchingIds
                    .map(id => {
                        const saveMe = createObject(id);
                        return {
                            document: saveMe
                        };
                    }),
                'collection-test'
            );

            // Now we should have more updates and at some point all documents
            // are in the result set.
            await AsyncTestUtil.waitUntil(() => lastOfArray(emitted)?.size === matchingIds.length);

            // wait a bit more
            await AsyncTestUtil.wait(isFastMode() ? 50 : 150);
            assert.strictEqual(lastOfArray(emitted)?.size, matchingIds.length);


            /**
             * Each emitted result must have a different result set
             * because findByIds.$ must only emit when data has actually changed.
             * We cannot just count the updates.length here because some RxStorage implementations
             * might return multiple RxChangeEventBulks for a single bulkWrite() operation
             * or do additional writes. So we have to check for the revisions+docId strings.
             */
            const resultIds = new Set<string>();
            emitted.forEach(oneResult => {
                let resultId = '';
                Array.from(oneResult.entries()).forEach(([docId, docData]) => {
                    resultId += docId + '|' + docData._rev + '-';
                });
                if (resultIds.has(resultId)) {
                    throw new Error('duplicate result ' + resultId);
                } else {
                    resultIds.add(resultId);
                }
            });

            // should have the same result set as running findByIds() once.
            const singleQueryDocs = await collection.findByIds(matchingIds).exec();

            const lastEmit = lastOfArray(emitted) as Map<string, RxDocumentData<HumanDocumentType>>;
            const singleResultPlain = matchingIds.map(id => getFromMapOrThrow(singleQueryDocs, id).toJSON(true));
            const observedResultPlain = matchingIds.map(id => getFromMapOrThrow(lastEmit, id));
            assert.deepStrictEqual(singleResultPlain, observedResultPlain);

            //  And contains the right data
            assert.strictEqual(lastEmit.get('a')?.passportId, 'a');
            assert.strictEqual(lastEmit.get('b')?.passportId, 'b');
            assert.strictEqual(lastEmit.get('c')?.passportId, 'c');
            assert.strictEqual(lastEmit.get('d')?.passportId, 'd');

            //  Let's try to update something different that should be ignored
            const sizeBeforeRandomInserts = lastOfArray(emitted)?.size;
            await collection.storageInstance.bulkWrite(
                [
                    createObject('e'),
                    createObject('f'),
                    createObject('g'),
                    createObject('h')
                ].map(document => ({ document })),
                'collection-test'
            );

            //  Wait a bit to see if we catch anything
            await wait(isFastMode() ? 100 : 300);
            const sizeAfterRandomInserts = lastOfArray(emitted)?.size;

            //  Verify that the subscription has not been triggered and no error has been added
            assert.strictEqual(sizeBeforeRandomInserts, sizeAfterRandomInserts);
            assert(sizeBeforeRandomInserts !== undefined);

            // clean up afterwards
            sub.unsubscribe();
            collection.database.close();
        });
    });
});

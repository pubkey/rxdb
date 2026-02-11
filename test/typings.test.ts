/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/assert/index.d.ts" />

/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * this checks if typings work as expected
 */
import * as assert from 'assert';
import {
    HumanCompositePrimaryDocType,
    schemas
} from '../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    RxDatabase,
    RxDatabaseCreator,
    RxCollection,
    RxCollectionCreator,
    RxDocument,
    RxJsonSchema,
    RxError,
    RxAttachment,
    RxPlugin,
    addRxPlugin,
    createBlob
} from '../plugins/core/index.mjs';
import { getRxStorageMemory } from '../plugins/storage-memory/index.mjs';

type DefaultDocType = {
    passportId: string;
    age: number;
    oneOptional?: string;
};
type DefaultOrmMethods = {
    foobar(): string;
};

describe('typings.test.ts', function () {

    describe('basic', () => {
        it('should fail on broken code', () => {
            // @ts-expect-error not a string
            const x: string = 1337;
            assert.ok(x);
        });
    });
    describe('database', () => {
        describe('positive', () => {
            it('should create the database and use its methods', async () => {
                const databaseCreator: RxDatabaseCreator = {
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false
                };
                const myDb: RxDatabase = await createRxDatabase(databaseCreator);
                await myDb.close();
            });
            it('allow to type-define the collections', () => {
                const db: RxDatabase<{
                    foobar: RxCollection;
                }> = {} as RxDatabase<{
                    foobar: RxCollection;
                }>;
                const col: RxCollection = db.foobar;
            });
            it('a collection-untyped database should allow all collection-getters', () => {
                const db: RxDatabase = {} as RxDatabase;
                const col: RxCollection = db.foobar;
            });
            it('an collection-TYPED database should allow to access methods', () => {
                const db: RxDatabase = {} as RxDatabase;
                const col: RxCollection = db.foobar;
            });
            it('an allow to use a custom extends type', async () => {
                type RxHeroesDatabase = RxDatabase<{
                    hero: RxCollection;
                }>;
                const db: RxHeroesDatabase = await createRxDatabase<{
                    hero: RxCollection;
                }>({
                    name: 'heroes',
                    storage: getRxStorageMemory()
                });
                const col: RxCollection = db.hero;
                await db.close();
            });
        });
        describe('negative', () => {
            it('should not allow additional parameters', () => {
                const databaseCreator: RxDatabaseCreator = {
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false,
                    // @ts-expect-error foo param does not exist
                    foo: 'bar'
                };
                assert.ok(databaseCreator);
            });
            it('an collection-TYPED database should only allow known collection-getters', () => {
                const db: RxDatabase<{
                    foobar: RxCollection;
                }> = {} as any;
                const col: RxCollection = db.foobar;

                // @ts-expect-error foobar2 does not exist
                assert.ok(!db.foobar2);
            });

        });
    });

    describe('schema', () => {
        describe('positive', () => {
            it('should work with DocType = any', () => {
                const schema: RxJsonSchema<any> = schemas.humanMinimal;
                assert.ok(schema);
            });
            it('should allow creating generic schema based on a model', async () => {
                const databaseCreator: RxDatabaseCreator = {
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false
                };
                const myDb: RxDatabase = await createRxDatabase(databaseCreator);
                const minimalHuman: RxJsonSchema<DefaultDocType> = schemas.humanMinimal;
                const myCollections = await myDb.addCollections({
                    humans: {
                        schema: minimalHuman,
                    }
                });
                await myDb.close();
            });
            it('should allow \'as const\' composite primary schemas to work', () => {
                const humanCompositePrimaryTyped: RxJsonSchema<HumanCompositePrimaryDocType> = schemas.humanCompositePrimarySchemaLiteral;
            });
        });
        describe('negative', () => {
            it('should not allow wrong properties when passing a model', async () => {
                const databaseCreator: RxDatabaseCreator = {
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false
                };
                const myDb: RxDatabase = await createRxDatabase(databaseCreator);

                // @ts-expect-error broken schema
                const minimalHuman: RxJsonSchema<DefaultDocType> = schemas.humanMinimalBroken;
                await myDb.close();
            });

        });
    });

    describe('collection', () => {
        describe('positive', () => {
            it('collection-creation', async () => {
                const myDb: RxDatabase = await createRxDatabase({
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false
                });
                const mySchema: RxJsonSchema<any> = schemas.human;
                const cols = await myDb.addCollections({
                    humans: {
                        schema: mySchema,
                        autoMigrate: false,
                    }
                });
                const myCollections: RxCollection<any> = cols.humans;
            });
            it('typed collection should know its static orm methods', async () => {
                const myDb: RxDatabase = await createRxDatabase({
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false
                });
                const mySchema: RxJsonSchema<any> = schemas.human;
                type staticMethods = {
                    countAllDocuments: () => Promise<number>;
                };
                const myCollections = await myDb.addCollections({
                    humans: {
                        schema: mySchema,
                        autoMigrate: false,
                        statics: {
                            countAllDocuments: () => Promise.resolve(1)
                        }
                    }
                });
                const myCollection: RxCollection<any, any, staticMethods> = myCollections.humans as any;
                await myCollection.countAllDocuments();
            });
            it('use options', async () => {
                const myDb: RxDatabase = await createRxDatabase({
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false,
                    options: {
                        foo1: 'bar1'
                    }
                });
                const mySchema: RxJsonSchema<any> = schemas.human;
                const myCollections = await myDb.addCollections({
                    humans: {
                        schema: mySchema,
                        autoMigrate: false,
                        options: {
                            foo2: 'bar2'
                        }
                    }
                });
                const x: string = myDb.options.foo1;
                const y: string = myCollections.humans.options.foo2;
                myDb.close();
            });
        });
        describe('negative', () => {
            it('should not allow wrong collection-settings', async () => {
                const myDb: RxDatabase = await createRxDatabase({
                    name: 'mydb',
                    storage: getRxStorageMemory(),
                    multiInstance: false,
                    ignoreDuplicate: false
                });
                await myDb.addCollections({
                    humans: {
                        // @ts-expect-error because of wrong schema format
                        schema: {},
                        autoMigrate: false,
                    }
                });
                await myDb.close();
            });
        });
    });
    describe('change-event', () => {
        it('.insert$ .update$ .remove$', async () => {
            const myDb: RxDatabase = await createRxDatabase({
                name: 'mydb',
                storage: getRxStorageMemory(),
                multiInstance: false,
                ignoreDuplicate: false
            });
            type docType = {
                firstName: string;
                lastName: string;
            };
            const mySchema: RxJsonSchema<any> = schemas.human;
            const myCollections = await myDb.addCollections({
                humans: {
                    schema: mySchema,
                    autoMigrate: false,
                }
            });

            const names: string[] = [];
            const revs: string[] = [];
            const sub1 = myCollections.humans.insert$.subscribe(cE => {
                names.push(cE.documentData.firstName);
                revs.push(cE.documentData._rev);
            });
        });
    });
    describe('document', () => {
        it('should know the fields of the document', async () => {
            const myDb: any = {};
            type DocType = {
                age: number;
                firstName: string;
                lastName: string;
                passportId: string;
            };
            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {},
                    autoMigrate: false,
                }
            });

            const result = await myCollections.humans.findOne().exec();
            if (result === null) throw new Error('got no document');
            const oneDoc: RxDocument<DocType> = result;
            const id: string = oneDoc.passportId;
            const prim: string = oneDoc.primary;

            const otherResult = await myCollections.humans.findOne().exec();
            if (otherResult === null) throw new Error('got no other document');
            const otherDoc: RxDocument<DocType> = otherResult;
            const id2 = otherDoc.passportId;
        });
        it('should know the age$ observables', () => {
            type DocType = {
                age: number;
                nes: {
                    ted: string;
                };
            };
            const oneDoc: RxDocument<DocType> = {} as any;

            // top level
            const observable = oneDoc.age$;
            observable.subscribe();
        });
        it('.putAttachment()', async () => {
            const myDb: any = {};

            type DocType = {
                age: number;
                firstName: string;
                lastName: string;
                passportId: string;
            };

            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {},
                    autoMigrate: false,
                }
            });

            const result = await myCollections.humans.findOne().exec(true);
            const oneDoc: RxDocument<DocType> = result;
            const attachment: RxAttachment<DocType> = await oneDoc.putAttachment({
                id: 'cat.txt',
                data: createBlob('foo bar', 'text/plain'),
                type: 'text/plain'
            });
        });
        it('.toJSON() should have _rev', async () => {
            const myDb: any = {};

            type DocType = {
                age: number;
                firstName: string;
                lastName: string;
                passportId: string;
            };

            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {},
                    autoMigrate: false,
                }
            });

            const result = await myCollections.humans.findOne().exec(true);
            const rev: string = result.toJSON(true)._rev;
        });
        it('.toJSON(false) should not have _rev', async () => {
            const myDb: any = {};

            type DocType = {
                age: number;
                firstName: string;
                lastName: string;
                passportId: string;
            };

            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {},
                    autoMigrate: false,
                }
            });
            const collection: RxCollection<{}> = myCollections.humans;

            const result = await collection.findOne().exec(true);

            // @ts-expect-error must not have _rev
            const rev: string = result.toJSON(false)._rev;
        });
        it('.incrementalModify()', async () => {
            const myDb: any = {};
            type DocType = {
                age: number;
                firstName: string;
                lastName: string;
                passportId: string;
            };

            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {},
                    autoMigrate: false,
                }
            });
            const collection: RxCollection<DocType> = myCollections.humans;
            const doc = await collection.findOne().exec(true);
            await doc.incrementalModify(docData => {
                const newData = {
                    age: 23,
                    firstName: 'bar',
                    lastName: 'steve',
                    passportId: 'lolol'
                };
                return newData;
            });
        });
    });
    describe('reactivity', () => {
        type MyCustomReactivity<T> = Set<T>;
        type DocType = {
            age: number;
            firstName: string;
            lastName: string;
            passportId: string;
        };
        /**
         * @link https://github.com/pubkey/rxdb/pull/6189
         */
        it('#6189 should know the type of the custom reactivity object', () => {
            type DbCollections = {
                smth: RxCollection<DocType, unknown, unknown, unknown, MyCustomReactivity<unknown>>;
            };
            type Db = RxDatabase<DbCollections, unknown, unknown, MyCustomReactivity<unknown>>;
            const db: Db = {} as any;
            const data: MyCustomReactivity<any> = db.smth.find().$$;

            // @ts-expect-error should be invalid because MyCustomReactivity is not a number
            const dataWrong: number = db.smth.find().$$;
        });
    });
});
describe('local documents', () => {
    it('should allow to type input data', async () => {
        const myDb: RxDatabase = {} as any;
        const typedLocalDoc = await myDb.getLocal<{ foo: string; }>('foobar');

        // @ts-expect-error does not have 'bar'
        const typedLocalDocInsert = await myDb.insertLocal<{ foo: string; }>('foobar', { bar: 'foo' });

        if (!typedLocalDoc) {
            throw new Error('local doc missing');
        }
    });
    it('should allow to type the return data', async () => {
        const myDb: RxDatabase = {} as any;
        const typedLocalDoc = await myDb.getLocal<{ foo: string; }>('foobar');
        const typedLocalDocUpsert = await myDb.upsertLocal<{ foo: string; }>('foobar', { foo: 'bar' });

        if (!typedLocalDoc) {
            throw new Error('local doc missing');
        }

        const x: string = typedLocalDoc.get('data').foo;
        const x2: string = typedLocalDocUpsert.get('data').foo;
    });
    it('should allow to access different property', async () => {
        const myDb: RxDatabase = {} as any;
        const typedLocalDoc = await myDb.getLocal<{ foo: string; }>('foobar');
        if (typedLocalDoc) {
            // @ts-expect-error must not have 'bar'
            const x: string = typedLocalDoc._data.bar;
        }
    });
});
describe('other', () => {
    describe('orm', () => {
        it('should correctly recognize orm-methods', async () => {
            const myDb: any = {};

            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {},
                    methods: {
                        foobar() {
                            return 'foobar';
                        }
                    }
                }
            });
            const myCollection: RxCollection<DefaultDocType, DefaultOrmMethods, {}> = myCollections.humans;

            // via insert
            const doc = await myCollection.insert({
                passportId: 'asdf',
                age: 10
            });
            const x: string = doc.foobar();

            // via query findOne()
            const doc2 = await myCollection.findOne('asdf').exec(true);
            const x2: string = doc.foobar();
        });
    });
    describe('hooks', () => {
        it('should know the types', async () => {
            const myDb: any = {};
            const myCollections = await myDb.addCollections({
                humans: {
                    schema: {}
                }
            });
            const myCollection: RxCollection<DefaultDocType, DefaultOrmMethods> = myCollections.humans;
            let myNumber: number;
            let myString: string;
            myCollection.postInsert((data, doc) => {
                myNumber = doc.age;
                myNumber = data.age;
                myString = doc.foobar();
                return Promise.resolve();
            }, true);
        });
        describe('query', () => {
            it('should know the where-fields', async () => {
                const myDb: any = {};

                type DocType = {
                    age: number;
                    firstName: string;
                    lastName: string;
                    passportId: string;
                    nestedObject: {
                        foo: string;
                        bar: number;
                    };
                };

                const myCollections = await myDb.addCollections({
                    humans: {
                        schema: {},
                        autoMigrate: false,
                    }
                });
                const myCollection: RxCollection<DocType> = myCollections.humans;

                const query = myCollection.findOne().where('nestedObject.foo').eq('foobar');
            });
            describe('rx-error', () => {
                it('should know the parameters of the error', async () => {
                    const myDb: any = {};
                    const myCollections = await myDb.addCollections({
                        humans: {
                            schema: {},
                            autoMigrate: false,
                        }
                    });

                    try {
                        await myCollections.humans.insert({ age: 4 });
                    } catch (err) {
                        if ((err as any).rxdb) {
                            assert.ok((err as RxError).parameters.errors);
                        } else {
                            // handle regular Error class
                        }
                    }
                });
            });
            describe('addRxPlugin', () => {
                it('should be a valid RxPlugin', () => {
                    const myPlugin: RxPlugin = {
                        name: 'my-plugin',
                        rxdb: true,
                        prototypes: {
                            RxDocument: () => { }
                        }
                    };
                    addRxPlugin(myPlugin);
                });
            });
            describe('issues', () => {
                it('via gitter at 2018 Mai 22 19:20', () => {
                    const db: RxDatabase = {} as RxDatabase;
                    const heroSchema = {
                        version: 0,
                        type: 'object',
                        primaryKey: 'id',
                        properties: {
                            id: {
                                type: 'string'
                            }
                        },
                        required: ['color']
                    };
                    const colCreator: RxCollectionCreator = {
                        schema: heroSchema
                    };
                });
                it('nested selector type not working', () => {
                    type DocType = {
                        id?: string;
                        timestamp: number;
                        meta: {
                            user: string;
                        };
                    };
                    type RxCollectionIssue = RxCollection<DocType>;
                    const collection: RxCollectionIssue = {} as any;
                    const query = collection.find({
                        selector: {
                            'meta.user': 'foobar',
                            id: {
                                $exists: true
                            },
                            timestamp: {
                                $exists: true,
                                $gt: 1000
                            }
                        },
                        limit: 10,
                        sort: [
                            { id: 'asc' },
                            { timestamp: 'asc' }
                        ]
                    });
                });
            });
        });
    });
});

/**
 * this checks if typings work as expected
 */
import assert from 'assert';
import * as schemas from './helper/schemas';
import config from './unit/config';
import AsyncTestUtil from 'async-test-util';
import * as path from 'path';

const memoryPluginPath = path.join(config.rootPath, 'plugins/storage-memory');

describe('typings.test.js', function () {
    this.timeout(120 * 1000); // tests can take very long on slow devices like the CI
    const codeBase = `
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
            blobBufferUtil
        } from '${config.rootPath}';
        import {
            getRxStorageMemory
        } from '${memoryPluginPath}';

        type DefaultDocType = {
            passportId: string;
            age: number;
            oneOptional?: string;
        };
        type DefaultOrmMethods = {
            foobar(): string;
        };
    `;
    const transpileCode = async (code: string) => {
        const spawn = require('child-process-promise').spawn;
        const stdout: string[] = [];
        const stderr: string[] = [];
        const tsConfig = {
            target: 'es6',
            strict: true,
            isolatedModules: false
        };
        const promise = spawn('ts-node', [
            '--compiler-options',
            JSON.stringify(tsConfig),
            '-e', code
        ]);
        const childProcess = promise.childProcess;
        const debug = false;
        childProcess.stdout.on('data', (data: any) => {
            if (debug) {
                console.log(data.toString());
            }
            stdout.push(data.toString());
        });
        childProcess.stderr.on('data', (data: any) => {
            if (debug) {
                console.error('error: ' + data.toString());
            }
            stderr.push(data.toString());
        });
        try {
            await promise;
        } catch (err) {
            throw new Error(`could not run
                # Error: ${err}
                # Output: ${stdout}
                # ErrOut: ${stderr}
                `);
        }
    };

    config.parallel('basic', () => {
        it('should success on basic test', async () => {
            await transpileCode('console.log("Hello, world!")');
        });
        it('should fail on broken code', async () => {
            const brokenCode = `
                let x: string = 'foo';
                x = 1337;
            `;
            let thrown = false;
            try {
                const code = await transpileCode(brokenCode);
                console.dir(code);
            } catch (err) {
                thrown = true;
            }
            assert.ok(thrown);
        });
    });
    config.parallel('database', () => {
        describe('positive', () => {
            it('should create the database and use its methods', async () => {
                const code = codeBase + `
                    (async() => {
                        const databaseCreator: RxDatabaseCreator = {
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false
                        };
                        const myDb: RxDatabase = await createRxDatabase(databaseCreator);
                        await myDb.destroy();
                    })();
                `;
                await transpileCode(code);
            });
            it('allow to type-define the collections', async () => {
                const code = codeBase + `
                    (async() => {
                        const db: RxDatabase<{
                            foobar: RxCollection
                        }> = {} as RxDatabase<{
                            foobar: RxCollection
                        }>;
                        const col: RxCollection = db.foobar;
                    })();
                `;
                await transpileCode(code);
            });
            it('a collection-untyped database should allow all collection-getters', async () => {
                const code = codeBase + `
                    (async() => {
                        const db: RxDatabase = {} as RxDatabase;
                        const col: RxCollection = db.foobar;
                    })();
                `;
                await transpileCode(code);
            });
            it('an collection-TYPED database should allow to access methods', async () => {
                const code = codeBase + `
                    (async() => {
                        const db: RxDatabase = {} as RxDatabase;
                        const col: RxCollection = db.foobar;
                    })();
                `;
                await transpileCode(code);
            });
            it('an allow to use a custom extends type', async () => {
                const code = codeBase + `
                    (async() => {
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
                        await db.destroy();
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow additional parameters', async () => {
                const brokenCode = codeBase + `
                    const databaseCreator: RxDatabaseCreator = {
                        name: 'mydb',
                        storage: getRxStorageMemory(),
                        multiInstance: false,
                        ignoreDuplicate: false,
                        foo: 'bar'
                    };
                `;
                let thrown = false;
                try {
                    await transpileCode(brokenCode);
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
            });
            it('an collection-TYPED database should only allow known collection-getters', async () => {
                const brokenCode = codeBase + `
                    (async() => {
                        const db: RxDatabase<{
                            foobar: RxCollection
                        }> = {} as RxDatabase;
                        const col: RxCollection = db.foobar;
                        const col2: RxCollection = db.foobar2;
                        db.destroy();
                    })();
                `;
                let thrown = false;
                try {
                    await transpileCode(brokenCode);
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
            });

        });
    });

    config.parallel('schema', () => {
        describe('positive', () => {
            it('should work with DocType = any', async () => {
                const code = codeBase + `
                    (async() => {
                        const schema: RxJsonSchema<any> = ${JSON.stringify(schemas.humanMinimal)};
                    })();
                `;
                await transpileCode(code);
            });
            it('should allow creating generic schema based on a model', async () => {
                const code = codeBase + `
                    (async() => {
                        const databaseCreator: RxDatabaseCreator = {
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false
                        };
                        const myDb: RxDatabase = await createRxDatabase(databaseCreator);
                        const minimalHuman: RxJsonSchema<DefaultDocType> = ${JSON.stringify(schemas.humanMinimal)};
                        const myCollections = await myDb.addCollections({
                            humans: {
                                schema: minimalHuman,
                            }
                        });
                        await myDb.destroy();
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow wrong properties when passing a model', async () => {
                const brokenCode = codeBase + `
                    (async() => {
                        const databaseCreator: RxDatabaseCreator = {
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false
                        };
                        const myDb: RxDatabase = await createRxDatabase(databaseCreator);

                        const minimalHuman: RxJsonSchema<DefaultDocType> = ${JSON.stringify(schemas.humanMinimalBroken)};
                        const myCollections = await myDb.addCollections({
                            humans: {
                                schema: minimalHuman,
                            }
                        });

                        await myDb.destroy();
                    })();
                `;
                let thrown = false;
                try {
                    await transpileCode(brokenCode);
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
            });

        });
    });

    config.parallel('collection', () => {
        describe('positive', () => {
            it('collection-creation', async () => {
                const code = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await createRxDatabase({
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema<any> = ${JSON.stringify(schemas.human)};
                        const cols = await myDb.addCollections({
                            humans: {
                                schema: mySchema,
                                autoMigrate: false,
                            }
                        });
                        const myCollections: RxCollection<any> = cols.humans;
                    })();
                `;
                await transpileCode(code);
            });
            it('typed collection should know its static orm methods', async () => {
                const code = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await createRxDatabase({
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema<any> = ${JSON.stringify(schemas.human)};

                        type staticMethods = {
                            countAllDocuments: () => Promise<number>;
                        }
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
                    })();
                `;
                await transpileCode(code);
            });
            it('use options', async () => {
                const code = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await createRxDatabase({
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false,
                            options: {
                                foo1: 'bar1'
                            }
                        });
                        const mySchema: RxJsonSchema<any> = ${JSON.stringify(schemas.human)};
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
                        myDb.destroy();
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow wrong collection-settings', async () => {
                const brokenCode = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await createRxDatabase({
                            name: 'mydb',
                            storage: getRxStorageMemory(),
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema<any> = ${JSON.stringify(schemas.human)};
                        await myDb.addCollections({
                            humans: {
                                schema: {}, // wrong schema format
                                autoMigrate: false,
                            }
                        });
                    })();
                `;
                let thrown = false;
                try {
                    await transpileCode(brokenCode);
                } catch (err) {
                    thrown = true;
                }
                assert.ok(thrown);
            });
        });
    });
    config.parallel('change-event', () => {
        it('.insert$ .update$ .remove$', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: RxDatabase = await createRxDatabase({
                        name: 'mydb',
                        storage: getRxStorageMemory(),
                        multiInstance: false,
                        ignoreDuplicate: false
                    });
                    type docType = {
                        firstName: string,
                        lastName: string
                    }
                    const mySchema: RxJsonSchema<any> = ${JSON.stringify(schemas.human)};
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
                })();
            `;
            await transpileCode(code);
        });
    });
    config.parallel('document', () => {
        it('should know the fields of the document', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
                    };

                    const myCollections = await myDb.addCollections({
                        humans: {
                            schema: {},
                            autoMigrate: false,
                        }
                    });

                    const result = await myCollections.humans.findOne().exec();
                    if(result === null) throw new Error('got no document');
                    const oneDoc: RxDocument<DocType> = result;
                    const id: string = oneDoc.passportId;
                    const prim: string = oneDoc.primary;

                    const otherResult = await myCollections.humans.findOne().exec();
                    if(otherResult === null) throw new Error('got no other document');
                    const otherDoc: RxDocument<DocType> = otherResult;
                    const id2 = otherDoc.passportId;
                });
            `;
            await transpileCode(code);
        });
        it('.putAttachment()', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
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
                        data: blobBufferUtil.createBlobBuffer('foo bar', 'text/plain'),
                        type: 'text/plain'
                    });
                });
            `;
            await transpileCode(code);
        });
        it('.toJSON() should have _rev', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
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
            `;
            await transpileCode(code);
        });
        it('.toJSON(false) should not have _rev', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
                    };

                    const myCollections = await myDb.addCollections({
                        humans: {
                            schema: {},
                            autoMigrate: false,
                        }
                    });
                    const collection: RxCollection<{}> = myCollections.humans;

                    const result = await collection.findOne().exec(true);
                    const rev: string = result.toJSON(false)._rev;
                });
            `;
            await AsyncTestUtil.assertThrows(
                () => transpileCode(code),
                Error,
                '_rev'
            );
        });
        it('.incrementalModify()', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: any = {};
                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string
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
            `;
            await transpileCode(code);
        });
    });
    config.parallel('local documents', () => {
        it('should allow to type input data', async () => {
            const code = codeBase + `
            (async() => {
                const myDb: RxDatabase = {} as any;
                const typedLocalDoc = await myDb.getLocal<{foo: string;}>('foobar');
                const typedLocalDocInsert = await myDb.insertLocal<{foo: string;}>('foobar', { bar: 'foo' });

                if (!typedLocalDoc) {
                    throw new Error('local doc missing');
                }

                const x: string = typedLocalDoc.data.foo;
                const x2: string = typedLocalDocInsert.data.foo;
            });
            `;
            await AsyncTestUtil.assertThrows(
                () => transpileCode(code),
                Error
            );
        });
        it('should allow to type the return data', async () => {
            const code = codeBase + `
            (async() => {
                const myDb: RxDatabase = {} as any;
                const typedLocalDoc = await myDb.getLocal<{foo: string;}>('foobar');
                const typedLocalDocUpsert = await myDb.upsertLocal<{foo: string;}>('foobar', { foo: 'bar' });

                if (!typedLocalDoc) {
                    throw new Error('local doc missing');
                }

                const x: string = typedLocalDoc.get('data').foo;
                const x2: string = typedLocalDocUpsert.get('data').foo;
            });
            `;
            await transpileCode(code);
        });
        it('should allow to access different property', async () => {
            const code = codeBase + `
            (async() => {
                const myDb: RxDatabase = {} as any;
                const typedLocalDoc = await myDb.getLocal<{foo: string;}>('foobar');
                const x: string = typedLocalDoc.data.bar;
            });
            `;
            await AsyncTestUtil.assertThrows(
                () => transpileCode(code),
                Error
            );
        });
    });
    config.parallel('other', () => {
        describe('orm', () => {
            it('should correctly recognize orm-methods', async () => {
                const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    const myCollections = await myDb.addCollections({
                        humans: {
                            schema: {},
                            methods: {
                                foobar(){
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
                `;
                await transpileCode(code);
            });
        });
        describe('hooks', () => {
            it('should know the types', async () => {
                const code = codeBase + `
                (async() => {
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
            `;
                await transpileCode(code);
            });
        });
        describe('query', () => {
            it('should know the where-fields', async () => {
                const code = codeBase + `
                (async() => {
                    const myDb: any = {};

                    type DocType = {
                        age: number,
                        firstName: string,
                        lastName: string,
                        passportId: string,
                        nestedObject: {
                            foo: string,
                            bar: number
                        }
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
            `;
                await transpileCode(code);
            });
        });
        describe('rx-error', () => {
            it('should know the parameters of the error', async () => {
                const code = codeBase + `
                (async() => {
                    const myDb: any = {};
                    const myCollections = await myDb.addCollections({
                        humans: {
                            schema: {},
                            autoMigrate: false,
                        }
                    });

                    try{
                        await myCollections.humans.insert({ age: 4});
                    } catch(err) {
                        if ((err as any).rxdb) {
                            (err as RxError).parameters.errors;
                        } else {
                            // handle regular Error class
                        }
                    }
                });
            `;
                await transpileCode(code);
            });
        });
        describe('addRxPlugin', () => {
            it('should be a valid RxPlugin', async () => {
                const code = codeBase + `
                (async() => {
                    const myPlugin: RxPlugin = {
                        name: 'my-plugin',
                        rxdb: true,
                        prototypes: {
                            RxDocument: () => {}
                        }
                    }
                    addRxPlugin(myPlugin);
                });
            `;
                await transpileCode(code);
            });
        });
    });
    config.parallel('issues', () => {
        it('via gitter at 2018 Mai 22 19:20', async () => {
            const code = codeBase + `
                (async() => {
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
                    }
                    const colCreator: RxCollectionCreator = {
                        schema: heroSchema
                    };
                })();
            `;
            await transpileCode(code);
        });
    });
});

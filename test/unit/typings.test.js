/**
 * this checks if typings work as expected
 */
import assert from 'assert';
import * as schemas from './../helper/schemas';

describe('typings.test.js', () => {
    const codeBase = `
        import {
            create,
            RxDatabase,
            RxDatabaseCreator,
            RxCollection,
            RxDocument,
            RxJsonSchema
        } from '../';
    `;
    const transpileCode = async (code) => {
        const spawn = require('child-process-promise').spawn;
        const stdout = [];
        const stderr = [];
        const promise = spawn('ts-node', [
            '--no-cache',
            '--compilerOptions', '{"target":"es6"}',
            '-p', code
        ]);
        const childProcess = promise.childProcess;
        childProcess.stdout.on('data', data => stdout.push(data.toString()));
        childProcess.stderr.on('data', data => stderr.push(data.toString()));
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

    describe('basic', () => {
        it('should sucess on basic test', async () => {
            await transpileCode('console.log("Hello, world!")');
        });
        it('should fail on broken code', async () => {
            const brokenCode = `
                let x: string = 'foo';
                x = 1337;
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
    describe('database', () => {
        describe('positive', () => {
            it('should create the database', async () => {
                const code = codeBase + `
                    (async() => {
                        const databaseCreator: RxDatabaseCreator = {
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false
                        };
                        const myDb: RxDatabase = await create(databaseCreator);
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow additional parameters', async () => {
                const brokenCode = `
                    const databaseCreator: RxDatabaseCreator = {
                        name: 'mydb',
                        adapter: 'memory',
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
        });
    });
    describe('collection', () => {
        describe('positive', () => {
            it('collection-creation', async () => {
                const code = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await create({
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                        const myCollection: RxCollection<any> = await myDb.collection({
                            name: 'humans',
                            schema: mySchema,
                            autoMigrate: false,
                        });
                    })();
                `;
                await transpileCode(code);
            });
        });
        describe('negative', () => {
            it('should not allow wrong collection-settings', async () => {
                const brokenCode = codeBase + `
                    (async() => {
                        const myDb: RxDatabase = await create({
                            name: 'mydb',
                            adapter: 'memory',
                            multiInstance: false,
                            ignoreDuplicate: false
                        });
                        const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                        const myCollection: RxCollection<any> = await myDb.collection({
                            name: 'humans',
                            schema: {}, // wrong schema format
                            autoMigrate: false,
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
    describe('document', () => {
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

                    const myCollection: RxCollection<DocType> = await myDb.collection({
                        name: 'humans',
                        schema: {},
                        autoMigrate: false,
                    });

                    const oneDoc: RxDocument<DocType> = await myCollection.findOne().exec();
                    const id: string = oneDoc.passportId;
                    const prim: string = oneDoc.primary;

                    const otherDoc = await myCollection.findOne().exec();
                    const id2 = otherDoc.passportId;
                });
            `;
            await transpileCode(code);
        });
    });
    describe('orm', () => {
        it('should know the orm-functions of the collection', async () => {
            const code = codeBase + `
                (async() => {
                    const myDb: RxDatabase = await create({
                        name: 'mydb',
                        adapter: 'memory',
                        multiInstance: false,
                        ignoreDuplicate: false
                    });
                    const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                    const myCollection: RxCollection<any> = await myDb.collection({
                        name: 'humans',
                        schema: mySchema,
                        autoMigrate: false,
                    });
                })();
            `;
            await transpileCode(code);
        });
    });
    describe('positive', () => {
        it('should know the orm-methods of an object', async () => {
            const code = codeBase + `
                declare interface RxHeroDocumentType {
                    name?: string;
                    color?: string;
                    maxHP?: number;
                    hp?: number;
                    team?: string;
                    skills?: Array<{
                        name?: string,
                        damage?: string
                    }>;

                    // ORM methods
                    foo(): string;
                };
                declare type RxHeroDocument = RxDocument<RxHeroDocumentType>;
                (async() => {
                    const myDb: RxDatabase = await create({
                        name: 'mydb',
                        adapter: 'memory',
                        multiInstance: false,
                        ignoreDuplicate: false
                    });
                    const mySchema: RxJsonSchema = ${JSON.stringify(schemas.human)};
                    const myCollection: RxCollection<RxHeroDocument> = await myDb.collection({
                        name: 'humans',
                        schema: mySchema,
                        autoMigrate: false,
                        methods: {
                            foo: () => 'bar'
                        }
                    });
                    const oneDoc = await myCollection.findOne().exec();
                    const x: string = oneDoc.foo();
                })();
            `;
            await transpileCode(code);
        });
    });
});

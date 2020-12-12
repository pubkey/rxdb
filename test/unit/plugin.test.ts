/**
 * this checks if the plugin-method and functionality works as expected
 * @nodeOnly
 */

import assert from 'assert';
import PouchReplicationPlugin from 'pouchdb-replication';

import config from './config';
import {
    addRxPlugin,
    randomCouchString,
    _clearHook
} from '../../plugins/core';

import * as humansCollection from '../helper/humans-collection';
import { assertThrows } from 'async-test-util';
import { RxDBDevModePlugin } from '../../plugins/dev-mode';

// used so that browserify will not require things in browsers
const REQUIRE_FUN = require;

config.parallel('plugin.test.js', () => {
    if (!config.platform.isNode()) return;
    describe('.addRxPlugin()', () => {
        describe('positive', () => {
            it('should not crash when the same plugin is added multiple times', () => {
                addRxPlugin(PouchReplicationPlugin);
                addRxPlugin(PouchReplicationPlugin);
                addRxPlugin(PouchReplicationPlugin);
            });
        });
        describe('positive', () => {
            /**
             * this test assumes that at this point,
             * the full RxDB has been imported and dev-mode is already there
             */
            it('should crash when dev-mode is added multiple times', async () => {
                await assertThrows(
                    () => addRxPlugin(RxDBDevModePlugin),
                    'RxError',
                    'DEV1'
                );
            });
        });
    });
    describe('core.node.js', () => {
        it('should run without errors', async function () {
            this.timeout(10000);
            if (!config.platform.isNode())
                return;

            const spawn = REQUIRE_FUN('child-process-promise').spawn;
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [config.rootPath + 'test_tmp/unit/core.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', (data: any) => {
                // comment in to debug
                //               console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', (data: any) => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run Core.node.js.
                    # Error: ${err}
                    # Output: ${stdout}
                    # ErrOut: ${stderr}
                    `);
            }
        });
    });
    describe('full.node.js', () => {
        it('should run without errors', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = REQUIRE_FUN('child-process-promise').spawn;
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [config.rootPath + 'test_tmp/unit/full.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', (data: any) => stdout.push(data.toString()));
            childProcess.stderr.on('data', (data: any) => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run full.node.js.
                    # Error: ${err}
                    # Output: ${stdout}
                    # ErrOut: ${stderr}
                    `);
            }
        });
    });
    describe('in-memory.node.js', () => {
        it('in-memory should run without errors', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = REQUIRE_FUN('child-process-promise').spawn;
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [config.rootPath + 'test_tmp/unit/in-memory.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', (data: any) => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', (data: any) => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run in-memory.node.js.
                        # Error: ${err}
                        # Output: ${stdout}
                        # ErrOut: ${stderr}
                        `);
            }
        });
    });
    describe('ajv-validate.node.js', () => {
        it('should allow everything', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = REQUIRE_FUN('child-process-promise').spawn;
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [config.rootPath + 'test_tmp/unit/ajv-validate.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', (data: any) => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', (data: any) => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run ajv-validate.node.js.
                            # Error: ${err}
                            # Output: ${stdout}
                            # ErrOut: ${stderr}
                            `);
            }
        });
    });
    describe('validate-z-schema.node.js', () => {
        it('should allow everything', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = REQUIRE_FUN('child-process-promise').spawn;
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [config.rootPath + 'test_tmp/unit/validate-z-schema.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', (data: any) => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', (data: any) => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run validate-z-schema.node.js.
                            # Error: ${err}
                            # Output: ${stdout}
                            # ErrOut: ${stderr}
                            `);
            }
        });
    });
    describe('no-validate.node.js', () => {
        it('should allow everything', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = REQUIRE_FUN('child-process-promise').spawn;
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [config.rootPath + 'test_tmp/unit/no-validate.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', (data: any) => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', (data: any) => stderr.push(data.toString()));
            try {
                await promise;
            } catch (err) {
                console.log('errrrr');
                console.dir(stdout);
                throw new Error(`could not run no-validate.node.js.
                            # Error: ${err}
                            # Output: ${stdout}
                            # ErrOut: ${stderr}
                            `);
            }
        });
    });
    describe('hooks', () => {
        it('createRxDatabase', async () => {

            const createRxDatabase = (db: any) => {
                db.foo = 'bar_createRxDatabase';
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxDatabase
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create();
            assert.strictEqual(col.database.foo, 'bar_createRxDatabase');
            col.database.destroy();

            _clearHook('createRxDatabase', createRxDatabase);
        });
        it('createRxCollection', async () => {
            const createRxCollection = (c: any) => {
                c.foo = 'bar_createRxCollection';
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxCollection
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create();
            assert.strictEqual((col as any).foo, 'bar_createRxCollection');
            col.database.destroy();
            _clearHook('createRxCollection', createRxCollection);
        });
        it('createRxSchema', async () => {
            const createRxSchema = (c: any) => {
                c.foo = 'bar_createRxSchema';
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxSchema
                }
            };
            addRxPlugin(plugin);
            const col: any = await humansCollection.create();
            assert.strictEqual(col.schema['foo'], 'bar_createRxSchema');
            col.database.destroy();
            _clearHook('createRxSchema', createRxSchema);
        });
        it('createRxQuery', async () => {
            const createRxQuery = (c: any) => {
                c.foo = 'bar_createRxQuery';
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxQuery
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create();
            const query: any = col.find();
            assert.strictEqual(query['foo'], 'bar_createRxQuery');
            col.database.destroy();
            _clearHook('createRxQuery', createRxQuery);
        });
        it('createRxDocument', async () => {
            const createRxDocument = (c: any) => {
                c.foo = 'bar_createRxDocument';
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxDocument
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create(5);
            const doc: any = await col.findOne().exec();
            assert.strictEqual(doc.foo, 'bar_createRxDocument');
            col.database.destroy();
            _clearHook('createRxDocument', createRxDocument);
        });
        it('postCreateRxDocument', async () => {
            const postCreateRxDocument = (c: any) => {
                c.fooPostCreate = 'bar_postCreateRxDocument';
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    postCreateRxDocument
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create(5);
            const doc: any = await col.findOne().exec();
            assert.strictEqual(doc.fooPostCreate, 'bar_postCreateRxDocument');
            col.database.destroy();
            _clearHook('postCreateRxDocument', postCreateRxDocument);
        });
        it('preCreatePouchDb', async () => {
            const collectionName = randomCouchString(10);
            const preCreatePouchDb = (pouchDbParameters: any) => {
                if (pouchDbParameters.location.includes(collectionName)) {
                    // only do sth at this specific collection-pouch
                    pouchDbParameters.location = pouchDbParameters.location + 'foobar';
                }
            };
            const plugin = {
                rxdb: true,
                hooks: {
                    preCreatePouchDb
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create(0, collectionName);
            const pouchInstance = col.pouch;
            assert.ok(pouchInstance);

            const info = await pouchInstance.info();
            assert.ok(info.db_name.includes('foobar'));
            col.database.destroy();
            _clearHook('preCreatePouchDb', preCreatePouchDb);
        });
    });
});

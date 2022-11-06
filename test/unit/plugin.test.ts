/**
 * this checks if the plugin-method and functionality works as expected
 * @nodeOnly
 */

import assert from 'assert';

import config from './config';
import {
    addRxPlugin,
    randomCouchString,
    _clearHook,
    RxPlugin
} from '../../';

import {
    addPouchPlugin
} from '../../plugins/pouchdb';

import * as humansCollection from '../helper/humans-collection';
import { assertThrows } from 'async-test-util';
import { RxDBDevModePlugin, DEV_MODE_PLUGIN_NAME } from '../../plugins/dev-mode';

// used so that browserify will not require things in browsers
const REQUIRE_FUN = require;

config.parallel('plugin.test.js', () => {
    if (!config.platform.isNode()) return;
    describe('.addRxPlugin()', () => {
        describe('positive', () => {
            it('should not crash when a new plugin is added', () => {
                addRxPlugin({
                    rxdb: true,
                    name: randomCouchString(12)
                });
            });
        });
        describe('positive', () => {
            it('should crash when a plugin with the same name added already but it is NOT the same object', async () => {
                await assertThrows(
                    () => addRxPlugin({
                        name: DEV_MODE_PLUGIN_NAME,
                        rxdb: true
                    }),
                    'RxError',
                    'PL3'
                );
            });
            it('should NOT crash when a plugin with the same name added already but it IS the same object', async () => {
                await addRxPlugin(RxDBDevModePlugin);
            });
        });
    });
    describe('.addPouchPlugin()', () => {
        it('should not crash when pouch plugin is added', () => {
            addPouchPlugin(require('pouchdb-adapter-memory'));
        });
        it('should crash when rxdb plugin is added via addPouchPlugin', async () => {
            await assertThrows(
                () => addPouchPlugin(RxDBDevModePlugin),
                'RxTypeError',
                'PL2'
            );
        });
    });
    describe('core.node.ts', () => {
        it('core.node.ts: should run without errors', async function () {
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
                console.error('errrrr');
                console.dir(stdout);
                throw new Error(`could not run Core.node.js.
                    # Error: ${err}
                    # Output: ${stdout}
                    # ErrOut: ${stderr}
                    `);
            }
        });
    });
    describe('full.node.ts', () => {
        it('full.node.ts should run without errors', async () => {
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
                console.error('errrrr');
                console.dir(stdout);
                throw new Error(`could not run full.node.js.
                    # Error: ${err}
                    # Output: ${stdout}
                    # ErrOut: ${stderr}
                    `);
            }
        });
    });
    describe('hooks', () => {
        it('createRxDatabase', async () => {
            const createRxDatabase = (args: any) => {
                args.database.foo = 'bar_createRxDatabase';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomCouchString(12),
                hooks: {
                    createRxDatabase: {
                        after: createRxDatabase
                    }
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create();
            assert.strictEqual(col.database.foo, 'bar_createRxDatabase');
            col.database.destroy();

            _clearHook('createRxDatabase', createRxDatabase);
        });
        it('createRxCollection', async () => {
            const createRxCollection = (args: any) => {
                args.collection.foo = 'bar_createRxCollection';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomCouchString(12),
                hooks: {
                    createRxCollection: {
                        after: createRxCollection
                    }
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
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomCouchString(12),
                hooks: {
                    createRxSchema: {
                        after: createRxSchema
                    }
                }
            };
            addRxPlugin(plugin);
            const col: any = await humansCollection.create();
            assert.strictEqual(col.schema['foo'], 'bar_createRxSchema');
            col.database.destroy();
            _clearHook('createRxSchema', createRxSchema);
        });
        it('createRxDocument', async () => {
            const createRxDocument = (c: any) => {
                c.foo = 'bar_createRxDocument';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomCouchString(12),
                hooks: {
                    createRxDocument: {
                        after: createRxDocument
                    }
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
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomCouchString(12),
                hooks: {
                    postCreateRxDocument: {
                        after: postCreateRxDocument
                    }
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create(5);
            const doc: any = await col.findOne().exec();
            assert.strictEqual(doc.fooPostCreate, 'bar_postCreateRxDocument');
            await col.database.destroy();
            _clearHook('postCreateRxDocument', postCreateRxDocument);
        });
    });
});

/**
 * this checks if the plugin-method and functionality works as expected
 * @nodeOnly
 */

import assert from 'assert';
import {
    addRxPlugin,
    randomToken,
    _clearHook,
    RxPlugin
} from '../../plugins/core/index.mjs';

import { describeParallel, getRootPath } from './config.ts';
import {
    humansCollection,
    isNode
} from '../../plugins/test-utils/index.mjs';
import { assertThrows } from 'async-test-util';
import { RxDBDevModePlugin, DEV_MODE_PLUGIN_NAME } from '../../plugins/dev-mode/index.mjs';
import { createRequire } from 'node:module';
import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
addRxPlugin(RxDBCleanupPlugin);


describeParallel('plugin.test.js', () => {
    if (!isNode) return;
    describe('.addRxPlugin()', () => {
        it('should not crash when a new plugin is added', () => {
            addRxPlugin({
                rxdb: true,
                name: randomToken(12)
            });
        });
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
    describe('full.node.ts', () => {
        it('full.node.ts should run without errors', async () => {
            if (!isNode)
                return;

            const require = createRequire(import.meta.url);
            const { spawn } = await require('child-process-promise');
            const stdout: any[] = [];
            const stderr: any[] = [];
            const promise = spawn('mocha', [getRootPath() + 'test_tmp/unit/full.node.js']);
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
                    `, { cause: err });
            }

            if (stderr.length > 0) {
                throw new Error('got stderr: ' + stderr.join(', '));
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
                name: randomToken(12),
                hooks: {
                    createRxDatabase: {
                        after: createRxDatabase
                    }
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create();
            assert.strictEqual(col.database.foo, 'bar_createRxDatabase');
            col.database.close();

            _clearHook('createRxDatabase', createRxDatabase);
        });
        it('createRxCollection', async () => {
            const createRxCollection = (args: any) => {
                args.collection.foo = 'bar_createRxCollection';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomToken(12),
                hooks: {
                    createRxCollection: {
                        after: createRxCollection
                    }
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create();
            assert.strictEqual((col as any).foo, 'bar_createRxCollection');
            col.database.close();
            _clearHook('createRxCollection', createRxCollection);
        });
        it('createRxSchema', async () => {
            const createRxSchema = (c: any) => {
                c.foo = 'bar_createRxSchema';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomToken(12),
                hooks: {
                    createRxSchema: {
                        after: createRxSchema
                    }
                }
            };
            addRxPlugin(plugin);
            const col: any = await humansCollection.create();
            assert.strictEqual(col.schema['foo'], 'bar_createRxSchema');
            col.database.close();
            _clearHook('createRxSchema', createRxSchema);
        });
        it('createRxDocument', async () => {
            const createRxDocument = (c: any) => {
                c.foo = 'bar_createRxDocument';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomToken(12),
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
            col.database.close();
            _clearHook('createRxDocument', createRxDocument);
        });
        it('postCreateRxDocument', async () => {
            const postCreateRxDocument = (c: any) => {
                c.fooPostCreate = 'bar_postCreateRxDocument';
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomToken(12),
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
            await col.database.close();
            _clearHook('postCreateRxDocument', postCreateRxDocument);
        });
        it('postCleanup', async () => {
            const runs: any[] = [];
            const hook = (input: any) => {
                runs.push(input);
            };
            const plugin: RxPlugin = {
                rxdb: true,
                name: randomToken(12),
                hooks: {
                    postCleanup: {
                        after: hook
                    }
                }
            };
            addRxPlugin(plugin);
            const col = await humansCollection.create(5);
            await col.cleanup();
            assert.strictEqual(runs.length, 1);

            await col.database.close();
            _clearHook('postCleanup', hook);
        });
    });
});

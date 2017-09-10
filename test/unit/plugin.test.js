/**
 * this checks if the plugin-method and functionality works as expected
 */

import assert from 'assert';
import clone from 'clone';
import AsyncTestUtil from 'async-test-util';
import platform from 'detect-browser';
import RxDB from '../../dist/lib/index';
import * as humansCollection from '../helper/humans-collection';

describe('plugin.test.js', () => {

    describe('Core.node.js', () => {
        it('should run without errors', async() => {
            if (!platform.isNode())
                return;

            const spawn = require('child-process-promise').spawn;
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/core.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => stdout.push(data.toString()));
            childProcess.stderr.on('data', data => stderr.push(data.toString()));
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

    describe('hooks', () => {
        it('createRxDatabase', async() => {
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxDatabase: (db) => {
                        db.foo = 'bar_createRxDatabase';
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create();
            assert.equal(col.database.foo, 'bar_createRxDatabase');
        });
        it('createRxCollection', async() => {
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxCollection: (col) => {
                        col.foo = 'bar_createRxCollection';
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create();
            assert.equal(col.foo, 'bar_createRxCollection');
        });
        it('createRxSchema', async() => {
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxSchema: (col) => {
                        col.foo = 'bar_createRxSchema';
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create();
            assert.equal(col.schema.foo, 'bar_createRxSchema');
        });
        it('createRxQuery', async() => {
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxQuery: (col) => {
                        col.foo = 'bar_createRxQuery';
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create();
            const query = col.find();
            assert.equal(query.foo, 'bar_createRxQuery');
        });
        it('createRxDocument', async() => {
            const plugin = {
                rxdb: true,
                hooks: {
                    createRxDocument: (col) => {
                        col.foo = 'bar_createRxDocument';
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create(5);
            const doc = await col.findOne().exec();
            assert.equal(doc.foo, 'bar_createRxDocument');
        });
    });
});

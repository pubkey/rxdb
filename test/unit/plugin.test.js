/**
 * this checks if the plugin-method and functionality works as expected
 */

import assert from 'assert';
import platform from 'detect-browser';
import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
import * as humansCollection from '../helper/humans-collection';

describe('plugin.test.js', () => {

    describe('core.node.js', () => {
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

    describe('full.node.js', () => {
        it('should run without errors', async() => {
            if (!platform.isNode())
                return;

            const spawn = require('child-process-promise').spawn;
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/full.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => stdout.push(data.toString()));
            childProcess.stderr.on('data', data => stderr.push(data.toString()));
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
            col.database.destroy();
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
            col.database.destroy();
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
            col.database.destroy();
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
            col.database.destroy();
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
            col.database.destroy();
        });
        it('preCreatePouchDb', async() => {
            const collectionName = util.randomCouchString(10);
            const plugin = {
                rxdb: true,
                hooks: {
                    preCreatePouchDb: pouchDbParameters => {
                        if (pouchDbParameters.location.includes(collectionName)) {
                            // only do sth at this specific collection-pouch
                            pouchDbParameters.location = pouchDbParameters.location + 'foobar';
                        }
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create(0, collectionName);
            const pouchInstance = col.pouch;
            assert.ok(pouchInstance);

            const info = await pouchInstance.info();
            assert.ok(info.db_name.includes('foobar'));
            col.database.destroy();
        });
    });
});

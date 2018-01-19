/**
 * this checks if the plugin-method and functionality works as expected
 * @nodeOnly
 */

import assert from 'assert';
import AsyncTestUtil from 'async-test-util';
import PouchReplicationPlugin from 'pouchdb-replication';

import config from './config';
import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';
import * as humansCollection from '../helper/humans-collection';

config.parallel('plugin.test.js', () => {
    describe('.plugin()', () => {
        it('should not crash when the same plugin is added multiple times', async () => {
            RxDB.plugin(PouchReplicationPlugin);
            RxDB.plugin(PouchReplicationPlugin);
            RxDB.plugin(PouchReplicationPlugin);
        });
    });
    describe('core.node.js', () => {
        it('should run without errors', async function() {
            this.timeout(10000);
            if (!config.platform.isNode())
                return;

            const spawn = require('child-process-promise').spawn;
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/core.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => {
                // comment in to debug
                //                console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
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
        it('should run without errors', async () => {
            if (!config.platform.isNode())
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
    describe('in-memory.node.js', () => {
        it('in-memory should run without errors', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = require('child-process-promise').spawn;
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/in-memory.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', data => stderr.push(data.toString()));
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

            const spawn = require('child-process-promise').spawn;
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/ajv-validate.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', data => stderr.push(data.toString()));
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
    describe('no-validate.node.js', () => {
        it('should allow everything', async () => {
            if (!config.platform.isNode())
                return;

            const spawn = require('child-process-promise').spawn;
            const stdout = [];
            const stderr = [];
            const promise = spawn('mocha', ['../test_tmp/unit/no-validate.node.js']);
            const childProcess = promise.childProcess;
            childProcess.stdout.on('data', data => {
                // comment in to debug
                // console.log(':: ' + data.toString());
                stdout.push(data.toString());
            });
            childProcess.stderr.on('data', data => stderr.push(data.toString()));
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
        it('createRxCollection', async () => {
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
        it('createRxSchema', async () => {
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
        it('createRxQuery', async () => {
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
        it('createRxDocument', async () => {
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
        it('postCreateRxDocument', async () => {
            const plugin = {
                rxdb: true,
                hooks: {
                    postCreateRxDocument: async (doc) => {
                        await AsyncTestUtil.wait(100);
                        doc.postCreateFoo = 'postCreateRxDocument worked!';
                    }
                }
            };
            RxDB.plugin(plugin);
            const col = await humansCollection.create(5);
            const doc = await col.findOne().exec();
            assert.equal(doc.postCreateFoo, 'postCreateRxDocument worked!');
            col.database.destroy();
        });
        it('preCreatePouchDb', async () => {
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

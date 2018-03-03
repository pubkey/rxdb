/**
 * this is a template for a test.
 * If you found a bug, edit this test to reproduce it
 * and than make a pull-request with that failing test.
 * The maintainer will later move your test to the correct possition in the test-suite.
 *
 * To run this test do:
 * - 'npm run test:node' so it runs in nodejs
 * - 'npm run test:browsers' so it runs in the browser
 */
import assert from 'assert';

import RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

const SpawnServer = require('../helper/spawn-server');
RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));

describe('bug-report.test.js', () => {
    it('should fail because it reproduces the bug', async () => {
        const playerSchema = {
            version: 0,
            type: 'object',
            properties: {
                name: {type: 'string'},
                score: {type: 'number'}
            }
        };

        const monsterSchema = {
            version: 0,
            type: 'object',
            properties: {
                hitpoints: {type: 'number'},
                size: {type: 'number'},
                defeated: {type: 'boolean'}
            }
        };
        // Prepare 'remote' database
        const remoteDb = await SpawnServer.spawn();

        // Prepare local database
        const localDbName = util.randomCouchString(10);
        let localDb = await RxDB.create({
            name: localDbName,
            adapter: 'memory',
            ignoreDuplicate: true
        });

        // Prepare collections
        let collection1 = await localDb.collection({
            name: 'player',
            schema: playerSchema
        });
        let collection2 = await localDb.collection({
            name: 'monster',
            schema: monsterSchema
        });

        // Setup replication
        collection1.pouch.sync(remoteDb, {live: true});
        collection2.pouch.sync(remoteDb, {live: true });
        await new Promise(res => setTimeout(res, 2000));    // 2 second wait

        // Insert doc on collection1
        await collection1.insert({name: 'Gerard', score: 123});
        
        // Simulate app restart
        await localDb.destroy();
        localDb = null;

        // Prepare local database
        localDb = await RxDB.create({
            name: localDbName,
            adapter: 'memory',
            ignoreDuplicate: true
        });

        // Prepare collections
        collection1 = await localDb.collection({
            name: 'player',
            schema: playerSchema
        });
        collection2 = await localDb.collection({
            name: 'monster',
            schema: monsterSchema
        });

        // Setup replication
        collection1.pouch.sync(remoteDb, {live: true});
        collection2.pouch.sync(remoteDb, {live: true });
        await new Promise(res => setTimeout(res, 2000));    // 2 second wait

        // Query for all documents from collection2 (there should be none)
        const docs = await collection2.find().exec();
        //console.log(docs[0]._data);   // :S
        assert.equal(docs.length, 0);
    });
});

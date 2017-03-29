/**
 * pouchdb allows to easily replicate database across devices.
 * This behaviour is tested here
 * @link https://pouchdb.com/guides/replication.html
 */

import assert from 'assert';
const platform = require('platform');

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import * as RxDB from '../../dist/lib/index';

let request;
let SpawnServer;
if (platform.isNode()) {
    SpawnServer = require('../helper/spawnServer');
    request = require('request-promise');
    RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));
    RxDB.PouchDB.plugin(require('pouchdb-replication'));
}

describe('Replication.test.js', () => {

    if (!platform.isNode()) return;

    describe('spawnServer.js', () => {
        it('spawn and reach a server', async() => {
            let path = await SpawnServer.spawn();
            path = path.split('/');
            path.pop();
            path.pop();
            path = path.join('/');
            const res = await request(path);
            const json = JSON.parse(res);
            assert.equal(typeof json.uuid, 'string');
        });
        it('spawn again', async() => {
            let path = await SpawnServer.spawn();
            path = path.split('/');
            path.pop();
            path.pop();
            path = path.join('/');
            const res = await request(path);
            const json = JSON.parse(res);
            assert.equal(typeof json.uuid, 'string');
        });
    });


    describe('sync', () => {
        it('sync two collections over server', async function() {
            const serverURL = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);

            const pw8 = util.promiseWaitResolveable(1000);
            c.pouch.sync(serverURL, {
                live: true
            }).on('error', function(err) {
                console.log('error:');
                console.log(JSON.stringify(err));
                throw new Error(err);
            });
            c2.pouch.sync(serverURL, {
                live: true
            });
            let count = 0;
            c2.pouch.changes({
                since: 'now',
                live: true,
                include_docs: true
            }).on('change', function(change) {
                count++;
                if (count == 2) pw8.resolve();
            });

            const obj = schemaObjects.human();
            await c.insert(obj);
            await pw8.promise;
            await util.promiseWait(150);

            const docs = await c2.find().exec();
            assert.equal(docs.length, 1);
            assert.equal(docs[0].get('firstName'), obj.firstName);

            c.database.destroy();
            c2.database.destroy();
        });

        it('Observable.fromEvent should fire on sync-change', async() => {
            const serverURL = await SpawnServer.spawn();
            const c = await humansCollection.create(0);
            const c2 = await humansCollection.create(0);
            const pw8 = util.promiseWaitResolveable(1400);
            c.pouch.sync(serverURL, {
                live: true
            });
            c2.pouch.sync(serverURL, {
                live: true
            });

            let e1 = [];
            const pouch$ = util.Rx.Observable
                .fromEvent(c.pouch.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }), 'change')
                .filter(e => !e.id.startsWith('_'))
                .subscribe(e => e1.push(e));
            let e2 = [];
            const pouch2$ = util.Rx.Observable
                .fromEvent(c2.pouch.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }), 'change')
                .filter(e => !e.id.startsWith('_'))
                .subscribe(e => e2.push(e));

            const obj = schemaObjects.human();
            await c.insert(obj);
            await pw8.promise;
            await util.promiseWait(150);

            assert.equal(e1.length, 1);
            assert.equal(e1.length, e2.length);

            c.database.destroy();
            c2.database.destroy();
        });


    });

    describe('events', () => {
        describe('positive', () => {
            it('collection: should get an event when a doc syncs', async() => {
                const serverURL = await SpawnServer.spawn();
                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync(serverURL, {
                    live: true
                });
                c2.sync(serverURL, {
                    live: true
                });

                const pw8 = util.promiseWaitResolveable(1700);
                let events = [];
                c2.$.subscribe(e => {
                    events.push(e);
                    pw8.resolve();
                });

                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;
                await util.waitUntil(() => events.length == 1);
                assert.equal(events[0].constructor.name, 'RxChangeEvent');

                c.database.destroy();
                c2.database.destroy();
            });

            it('query: should re-find when a docs syncs', async() => {
                const serverURL = await SpawnServer.spawn();
                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync(serverURL, {
                    live: true
                });
                c2.sync(serverURL, {
                    live: true
                });

                const pw8 = util.promiseWaitResolveable(10000);
                const results = [];
                c2.find().$.subscribe(res => {
                    results.push(res);
                    if (results.length == 2) pw8.resolve();
                });
                assert.equal(results.length, 0);
                await util.promiseWait(5);


                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                assert.equal(results.length, 2);

                c.database.destroy();
                c2.database.destroy();
            });
            it('document: should change field when doc saves', async() => {
                const serverURL = await SpawnServer.spawn();
                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync(serverURL, {
                    live: true
                });
                c2.sync(serverURL, {
                    live: true
                });

                // insert and w8 for sync
                let pw8 = util.promiseWaitResolveable(1400);
                let results = null;
                c2.find().$.subscribe(res => {
                    results = res;
                    if (results && results.length > 0) pw8.resolve();
                });
                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                const doc = await c.findOne().exec();
                const doc2 = await c2.findOne().exec();

                // update and w8 for sync
                let lastValue = null;
                pw8 = util.promiseWaitResolveable(1400);
                doc2
                    .get$('firstName')
                    .subscribe(newValue => {
                        lastValue = newValue;
                        if (lastValue == 'foobar') pw8.resolve();
                    });
                doc.set('firstName', 'foobar');
                await doc.save();

                await pw8.promise;
                assert.equal(lastValue, 'foobar');

                c.database.destroy();
                c2.database.destroy();
            });


            it('E', () => {
                //                process.exit();
            });
        });
        describe('negative', () => {});

    });

});

/**
 * pouchdb allows to easily replicate database across devices.
 * This behaviour is tested here
 * @link https://pouchdb.com/guides/replication.html
 */

import assert from 'assert';
import config from './config';

import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as util from '../../dist/lib/util';
import AsyncTestUtil from 'async-test-util';
import RxDB from '../../dist/lib/index';

import {
    fromEvent
} from 'rxjs';
import {
    map,
    filter,
    first
} from 'rxjs/operators';

let request;
let SpawnServer;
if (config.platform.isNode()) {
    SpawnServer = require('../helper/spawn-server');
    request = require('request-promise');
    RxDB.PouchDB.plugin(require('pouchdb-adapter-http'));
}

describe('replication.test.js', () => {
    if (!config.platform.isNode()) return;
    describe('spawnServer.js', () => {
        it('spawn and reach a server', async () => {
            const server = await SpawnServer.spawn();
            let path = server.url.split('/');
            path.pop();
            path.pop();
            path = path.join('/');
            const res = await request(path);
            const json = JSON.parse(res);
            assert.equal(typeof json.uuid, 'string');
            server.close();
        });
        it('spawn again', async () => {
            const server = await SpawnServer.spawn();
            let path = server.url.split('/');
            path.pop();
            path.pop();
            path = path.join('/');
            const res = await request(path);
            const json = JSON.parse(res);
            assert.equal(typeof json.uuid, 'string');
            server.close();
        });
    });
    config.parallel('test pouch-sync to ensure nothing broke', () => {
        describe('positive', () => {
            it('sync two collections over server', async function() {
                const server = await SpawnServer.spawn();
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(0);

                const pw8 = AsyncTestUtil.waitResolveable(1000);
                c.pouch.sync(server.url, {
                    live: true
                }).on('error', function(err) {
                    console.log('error:');
                    console.log(JSON.stringify(err));
                    throw new Error(err);
                });
                c2.pouch.sync(server.url, {
                    live: true
                });
                let count = 0;
                c2.pouch.changes({
                    since: 'now',
                    live: true,
                    include_docs: true
                }).on('change', () => {
                    count++;
                    if (count === 2) pw8.resolve();
                });

                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c2.find().exec();
                    return docs.length === 1;
                });
                const docs = await c2.find().exec();
                assert.equal(docs.length, 1);

                assert.equal(docs[0].get('firstName'), obj.firstName);

                c.database.destroy();
                c2.database.destroy();
                server.close();
            });
            it('Observable.fromEvent should fire on sync-change', async () => {
                const server = await SpawnServer.spawn();
                const c = await humansCollection.create(0, null, false);
                const c2 = await humansCollection.create(0, null, false);
                c.pouch.sync(server.url, {
                    live: true
                });
                c2.pouch.sync(server.url, {
                    live: true
                });

                const e1 = [];
                const pouch$ =
                    fromEvent(
                        c.pouch.changes({
                            since: 'now',
                            live: true,
                            include_docs: true
                        }), 'change')
                    .pipe(
                        map(ar => ar[0]),
                        filter(e => !e.id.startsWith('_'))
                    ).subscribe(e => e1.push(e));
                const e2 = [];
                const pouch2$ =
                    fromEvent(c2.pouch.changes({
                        since: 'now',
                        live: true,
                        include_docs: true
                    }), 'change').pipe(
                        map(ar => ar[0]),
                        filter(e => !e.id.startsWith('_'))
                    ).subscribe(e => e2.push(e));

                const obj = schemaObjects.human();
                await c.insert(obj);

                await AsyncTestUtil.waitUntil(() => e1.length === 1);
                await AsyncTestUtil.waitUntil(() => e2.length === 1);
                assert.equal(e1.length, e2.length);

                pouch$.unsubscribe();
                pouch2$.unsubscribe();
                c.database.destroy();
                c2.database.destroy();
                server.close();
            });
        });
    });
    describe('sync-directions', () => {
        describe('positive', () => {
            it('push-only-sync', async () => {
                const c = await humansCollection.create(10, null, false);
                const c2 = await humansCollection.create(10, null, false);
                c.sync({
                    remote: c2,
                    waitForLeadership: false,
                    direction: {
                        pull: false,
                        push: true
                    }
                });
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c2.find().exec();
                    return docs.length === 20;
                });
                await AsyncTestUtil.wait(10);
                const nonSyncedDocs = await c.find().exec();
                assert.equal(nonSyncedDocs.length, 10);

                await c.database.destroy();
                await c2.database.destroy();
            });
            it('pull-only-sync', async () => {
                const c = await humansCollection.create(10, null, false);
                const c2 = await humansCollection.create(10, null, false);
                c.sync({
                    remote: c2,
                    waitForLeadership: false,
                    direction: {
                        pull: true,
                        push: false
                    }
                });
                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 20;
                });
                await util.promiseWait(10);
                const nonSyncedDocs = await c2.find().exec();
                assert.equal(nonSyncedDocs.length, 10);

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {
            it('should not allow non-way-sync', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10, null, false);
                await AsyncTestUtil.assertThrows(
                    () => c.sync({
                        remote: c2,
                        direction: {
                            push: false,
                            pull: false
                        }
                    }),
                    'RxError',
                    'direction'
                );
                c.database.destroy();
                c2.database.destroy();
            });
        });
    });
    describe('query-based sync', () => {
        describe('positive', () => {
            it('should only sync documents that match the query', async () => {
                const c = await humansCollection.create(0, null, false);
                const c2 = await humansCollection.create(10, null, false);
                const query = c.find().where('firstName').eq('foobar');

                const matchingDoc = schemaObjects.human();
                matchingDoc.firstName = 'foobar';
                await c2.insert(matchingDoc);

                c.sync({
                    remote: c2,
                    waitForLeadership: false,
                    query: query
                });

                await AsyncTestUtil.waitUntil(async () => {
                    const docs = await c.find().exec();
                    return docs.length === 1;
                });
                await util.promiseWait(10);
                const docs = await c.find().exec();
                assert.equal(docs.length, 1);
                assert.equal(docs[0].firstName, 'foobar');

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {
            it('should not allow queries from other collection', async () => {
                const c = await humansCollection.create(0, null, false);
                const c2 = await humansCollection.create(10, null, false);
                const otherCollection = await humansCollection.create(0, null, false);

                const query = otherCollection.find().where('firstName').eq('foobar');
                await AsyncTestUtil.assertThrows(
                    () => c.sync({
                        remote: c2,
                        query
                    }),
                    'RxError',
                    'same'
                );

                c.database.destroy();
                c2.database.destroy();
                otherCollection.database.destroy();
            });
        });
    });
    config.parallel('RxReplicationState', () => {
        describe('change$', () => {
            it('should emit change-events', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emited = [];
                repState.change$.subscribe(cE => emited.push(cE));
                await AsyncTestUtil.waitUntil(() => emited.length >= 1);
                await c2.insert(schemaObjects.human());
                await AsyncTestUtil.waitUntil(() => emited.length >= 2);

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('active$', () => {
            it('should be active', async () => {
                const c = await humansCollection.create();
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emited = [];
                repState.active$.subscribe(cE => emited.push(cE));
                await AsyncTestUtil.waitUntil(() => emited.pop() === true);

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('alive$', () => {
            it('should not be alive', async () => {
                const server = await SpawnServer.spawn();
                server.close(true);
                const c = await humansCollection.create(0);

                const repState = c.sync({
                    remote: server.url
                });

                const emited = [];
                repState.alive$.subscribe(cE => emited.push(cE));
                
                assert.equal(emited[emited.length - 1], false);

                c.database.destroy();
            });
            it('should be alive and transit to not alive', async () => {
                const server = await SpawnServer.spawn();
                const c = await humansCollection.create(0);

                const repState = c.sync({
                    remote: server.url
                });

                const emited = [];
                repState.alive$.subscribe(cE => emited.push(cE));
                await AsyncTestUtil.waitUntil(() => !!emited[emited.length - 1]);

                assert.equal(emited[emited.length - 1], true);

                server.close(true);
                const obj = schemaObjects.human();
                await c.insert(obj);

                await AsyncTestUtil.waitUntil(() => !emited[emited.length - 1]);
                assert.equal(emited[emited.length - 1], false);

                c.database.destroy();
            });
        });
        describe('complete$', () => {
            it('should always be false on live-replication', async () => {
                const c = await humansCollection.create();
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const beFalse = await repState.complete$.pipe(first()).toPromise();
                assert.equal(beFalse, false);

                c.database.destroy();
                c2.database.destroy();
            });
            it('should emit true on non-live-replication when done', async () => {
                const c = await humansCollection.create(10);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: true,
                    direction: {
                        pull: true,
                        push: true
                    },
                    options: {
                        live: false,
                        retry: true
                    }
                });

                const emited = [];
                const sub = repState.complete$.subscribe(ev => emited.push(ev));
                await AsyncTestUtil.waitUntil(() => {
                    const lastEv = emited[emited.length - 1];
                    let ret = false;
                    try {
                        if (
                            lastEv.push.ok === true &&
                            lastEv.pull.ok === true
                        ) ret = true;
                    } catch (e) {}
                    return ret;
                });
                sub.unsubscribe();
                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('docs$', () => {
            it('should emit one event per doc', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emitedDocs = [];
                repState.docs$.subscribe(doc => emitedDocs.push(doc));

                await AsyncTestUtil.waitUntil(() => emitedDocs.length === 10);
                emitedDocs.forEach(doc => assert.ok(doc.firstName));

                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('denied$', () => {
            it('should not emit', async () => {
                const c = await humansCollection.create(0);
                const c2 = await humansCollection.create(10);
                const repState = await c.sync({
                    remote: c2,
                    waitForLeadership: false
                });
                const emitted = [];
                repState.denied$.subscribe(doc => emitted.push(doc));

                await AsyncTestUtil.wait(100);
                assert.equal(emitted.length, 0);

                c.database.destroy();
                c2.database.destroy();
            });
        });
    });
    config.parallel('events', () => {
        describe('positive', () => {
            it('collection: should get an event when a doc syncs', async () => {
                const syncC = await humansCollection.create(0);
                const syncPouch = syncC;

                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync({
                    remote: syncPouch
                });
                c2.sync({
                    remote: syncPouch
                });

                const pw8 = AsyncTestUtil.waitResolveable(1700);
                const events = [];
                c2.$.subscribe(e => {
                    events.push(e);
                    pw8.resolve();
                });

                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;
                await AsyncTestUtil.waitUntil(() => events.length === 1);
                assert.equal(events[0].constructor.name, 'RxChangeEvent');

                syncC.database.destroy();
                c.database.destroy();
                c2.database.destroy();
            });

            it('query: should re-find when a docs syncs', async () => {
                const syncC = await humansCollection.create(0);
                const syncPouch = syncC;

                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync({
                    remote: syncPouch
                });
                c2.sync({
                    remote: syncPouch
                });

                const pw8 = AsyncTestUtil.waitResolveable(10000);
                const results = [];
                c2.find().$.subscribe(res => {
                    results.push(res);
                    if (results.length === 2) pw8.resolve();
                });
                assert.equal(results.length, 0);
                await util.promiseWait(5);


                const obj = schemaObjects.human();
                await c.insert(obj);
                await pw8.promise;

                assert.equal(results.length, 2);

                syncC.database.destroy();
                c.database.destroy();
                c2.database.destroy();
            });
            it('document: should change field when doc saves', async () => {
                const syncC = await humansCollection.create(0);
                const syncPouch = syncC;

                const c = await humansCollection.create(0, 'colsource' + util.randomCouchString(5));
                const c2 = await humansCollection.create(0, 'colsync' + util.randomCouchString(5));
                c.sync({
                    remote: syncPouch
                });
                c2.sync({
                    remote: syncPouch
                });

                // insert and w8 for sync
                let pw8 = AsyncTestUtil.waitResolveable(1400);
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
                pw8 = AsyncTestUtil.waitResolveable(1400);
                doc2
                    .get$('firstName')
                    .subscribe(newValue => {
                        lastValue = newValue;
                        if (lastValue === 'foobar') pw8.resolve();
                    });
                await doc.atomicSet('firstName', 'foobar');

                await pw8.promise;
                assert.equal(lastValue, 'foobar');

                syncC.database.destroy();
                c.database.destroy();
                c2.database.destroy();
            });
        });
        describe('negative', () => {});
    });
    describe('ISSUES', () => {
        it('#630 Query cache is not being invalidated by replication', async () => {
            // create a schema
            const mySchema = {
                version: 0,
                type: 'object',
                properties: {
                    passportId: {
                        type: 'string',
                        primary: true
                    },
                    firstName: {
                        type: 'string'
                    },
                    lastName: {
                        type: 'string'
                    },
                    age: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 150
                    }
                }
            };

            // create a database
            const db1 = await RxDB.create({
                name: util.randomCouchString(12),
                adapter: 'memory'
            });
            // create a collection
            const collection1 = await db1.collection({
                name: 'crawlstate',
                schema: mySchema
            });

            // insert a document
            await collection1.insert({
                passportId: 'foobar',
                firstName: 'Bob',
                lastName: 'Kelso',
                age: 56
            });

            // create another database
            const db2 = await RxDB.create({
                name: util.randomCouchString(12),
                adapter: 'memory'
            });
            // create a collection
            const collection2 = await db2.collection({
                name: 'crawlstate',
                schema: mySchema
            });

            // query for all documents on db2-collection2 (query will be cached)
            let documents = await collection2.find({}).exec();

            // Replicate from db1-collection1 to db2-collection2
            const pullstate = collection2.sync({
                remote: collection1,
                direction: {
                    pull: true,
                    push: false
                },
                options: {
                    live: false
                }
            });

            // Wait for replication to complete
            await pullstate.complete$
                .pipe(
                    filter(completed => completed.ok === true),
                    first()
                ).toPromise();

            // query for all documents on db2-collection2 again (result is read from cache which doesnt contain replicated doc)
            // collection2._queryCache.destroy();
            documents = await collection2.find({}).exec();

            assert.equal(documents.length, 1);

            // clean up afterwards
            db1.destroy();
            db2.destroy();
        });
        it('#641 using a collections internal pouch for replication should be prevented', async () => {
            const colA = await humansCollection.create(0);
            const colB = await humansCollection.create(0);

            await AsyncTestUtil.assertThrows(
                () => colA.sync({
                    remote: colB.pouch,
                    direction: {
                        pull: true,
                        push: false
                    },
                    options: {
                        live: false
                    }
                }),
                'RxError',
                'pouchdb as remote'
            );

            colA.database.destroy();
            colB.database.destroy();
        });
    });
});

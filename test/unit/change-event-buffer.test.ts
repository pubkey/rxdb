import assert from 'assert';

import config from './config';
import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import AsyncTestUtil from 'async-test-util';

config.parallel('change-event-buffer.test.js', () => {
    describe('basic', () => {
        it('should contains some events', async () => {
            const col = await humansCollection.create(10);
            assert.strictEqual(col._changeEventBuffer.buffer.length, 10);
            col.database.destroy();
        });
        it('should delete older events when buffer get over limit', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );
            assert.strictEqual(col._changeEventBuffer.buffer.length, 10);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );
            assert.strictEqual(col._changeEventBuffer.buffer.length, 10);

            col.database.destroy();
        });
        it('check if correct events get removed', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const last = schemaObjects.human();
            await col.insert(last);
            const lastBufferEvent = col._changeEventBuffer.buffer[col._changeEventBuffer.buffer.length - 1];
            assert.strictEqual(last.passportId, lastBufferEvent.documentData.passportId);

            col.database.destroy();
        });
    });
    describe('.getArrayIndexByPointer()', () => {
        it('return null if pointer is no more in buffer (too low)', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const pointer = col._changeEventBuffer.getArrayIndexByPointer(0);
            assert.strictEqual(pointer, null);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const pointer2 = col._changeEventBuffer.getArrayIndexByPointer(10);
            assert.strictEqual(pointer2, null);

            col.database.destroy();
        });
        it('return the right pointer', async () => {
            const col = await humansCollection.create(0);
            let got;
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const pointer = col._changeEventBuffer.getArrayIndexByPointer(0);
            assert.strictEqual(pointer, null);

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            got = col._changeEventBuffer.getArrayIndexByPointer(15);
            assert.strictEqual(got, 4);

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );
            got = col._changeEventBuffer.getArrayIndexByPointer(25);
            assert.strictEqual(got, 4);

            got = col._changeEventBuffer.getArrayIndexByPointer(21);
            assert.strictEqual(got, 0);

            col.database.destroy();
        });
        it('return the correct pointer', async () => {
            const col = await humansCollection.create(10);
            col._changeEventBuffer.limit = 10;

            const lastDoc = schemaObjects.human();
            await col.insert(lastDoc);

            const gotIndex: any = col._changeEventBuffer.getArrayIndexByPointer(col._changeEventBuffer.counter);
            assert.strictEqual(col._changeEventBuffer.buffer[gotIndex].documentData.firstName, lastDoc.firstName);

            col.database.destroy();
        });
    });
    describe('.runFrom()', () => {
        it('should run from correctly', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const evs: any[] = [];
            col._changeEventBuffer.runFrom(1, function (cE: any) {
                evs.push(cE);
            });
            assert.strictEqual(evs.length, 10);
            evs.forEach(cE => assert.strictEqual(cE.constructor.name, 'RxChangeEvent'));


            col.database.destroy();
        });
        it('should throw if pointer to low', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(30).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const evs = [];
            assert.throws(() => col._changeEventBuffer.runFrom(5, function (cE: any) {
                evs.push(cE);
            }), Error);

            col.database.destroy();
        });
    });
    describe('.getFrom()', () => {
        it('should getFrom correctly', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const evs: any[] = col._changeEventBuffer.getFrom(1) as any;
            assert.strictEqual(evs.length, 10);
            evs.forEach((cE: any) => assert.strictEqual(cE.constructor.name, 'RxChangeEvent'));


            col.database.destroy();
        });
        it('should run correct on remove', async () => {
            const col = await humansCollection.create(0);
            const q = col.find();
            await q.exec();
            await col.insert(schemaObjects.human());
            await q.exec();

            // remove the doc
            const doc: any = await col.findOne().exec();
            await doc.remove();
            await AsyncTestUtil.waitUntil(() => col._changeEventBuffer.counter === 2);

            const evs: any[] = col._changeEventBuffer.getFrom(q._latestChangeEvent + 1) as any;
            assert.strictEqual(evs.length, 1);
            assert.strictEqual(evs[0].operation, 'DELETE');

            col.database.destroy();
        });
    });
    describe('.reduceByLastOfDoc()', () => {
        it('should only have the last changeEvent for the doc', async () => {
            return; // TODO see reduceByLastOfDoc() implementation
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const oneDoc: any = await col.findOne().exec();
            let newVal = 0;
            while (newVal < 5) {
                newVal++;
                await oneDoc.atomicSet('age', newVal);
            }

            const allEvents: any[] = q.collection._changeEventBuffer.getFrom(1) as any;
            const reduced = q.collection._changeEventBuffer.reduceByLastOfDoc(allEvents);

            assert.strictEqual(reduced.length, 5);
            const lastEvent: any = reduced.find(cE => cE.documentId === oneDoc.primary);
            assert.strictEqual(lastEvent.documentData.age, 5);
            col.database.destroy();
        });
    });
    describe('.hasChangeWithRevision()', () => {
        it('should not have a random revision', async () => {
            const col = await humansCollection.create(5);
            await col.insert(schemaObjects.human());
            const has = col._changeEventBuffer.hasChangeWithRevision('1-foobar');
            assert.strictEqual(has, false);
            col.database.destroy();
        });
        it('should have the revision of the last event', async () => {
            const col = await humansCollection.create(5);
            const doc = await col.insert(schemaObjects.human());
            const lastRev = doc._data._rev;
            const has = col._changeEventBuffer.hasChangeWithRevision(lastRev);
            assert.ok(has);
            col.database.destroy();
        });
    });
});

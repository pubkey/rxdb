import assert from 'assert';

import {
    schemaObjects,
    humansCollection
} from '../../plugins/test-utils/index.mjs';
import { describeParallel } from './config.ts';

import AsyncTestUtil from 'async-test-util';

describeParallel('change-event-buffer.test.js', () => {
    describe('basic', () => {
        it('should contains some events', async () => {
            const col = await humansCollection.create(10);
            assert.strictEqual(col._changeEventBuffer.getBuffer().length, 10);
            col.database.close();
        });
        it('should delete older events when buffer get over limit', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );
            assert.strictEqual(col._changeEventBuffer.getBuffer().length, 10);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );
            assert.strictEqual(col._changeEventBuffer.getBuffer().length, 10);

            col.database.remove();
        });
        it('check if correct events get removed', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const last = schemaObjects.humanData();
            await col.insert(last);
            const lastBufferEvent = col._changeEventBuffer.getBuffer()[col._changeEventBuffer.getBuffer().length - 1];
            assert.strictEqual(last.passportId, lastBufferEvent.documentData.passportId);

            col.database.remove();
        });
    });
    describe('.getArrayIndexByPointer()', () => {
        it('return null if pointer is no more in buffer (too low)', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const pointer = col._changeEventBuffer.getArrayIndexByPointer(0);
            assert.strictEqual(pointer, null);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const pointer2 = col._changeEventBuffer.getArrayIndexByPointer(10);
            assert.strictEqual(pointer2, null);

            col.database.remove();
        });
        it('return the right pointer', async () => {
            const col = await humansCollection.create(0);
            let got;
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const pointer = col._changeEventBuffer.getArrayIndexByPointer(0);
            assert.strictEqual(pointer, null);

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            got = col._changeEventBuffer.getArrayIndexByPointer(15);
            assert.strictEqual(got, 4);

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );
            got = col._changeEventBuffer.getArrayIndexByPointer(25);
            assert.strictEqual(got, 4);

            got = col._changeEventBuffer.getArrayIndexByPointer(21);
            assert.strictEqual(got, 0);

            col.database.remove();
        });
        it('return the correct pointer', async () => {
            const col = await humansCollection.create(10);
            col._changeEventBuffer.limit = 10;

            const lastDoc = schemaObjects.humanData();
            await col.insert(lastDoc);

            const gotIndex: any = col._changeEventBuffer.getArrayIndexByPointer(col._changeEventBuffer.getCounter());
            assert.strictEqual(col._changeEventBuffer.getBuffer()[gotIndex].documentData.firstName, lastDoc.firstName);

            col.database.remove();
        });
    });
    describe('.runFrom()', () => {
        it('should run from correctly', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const evs: any[] = [];
            col._changeEventBuffer.runFrom(1, function (cE: any) {
                evs.push(cE);
            });
            assert.strictEqual(evs.length, 10);
            evs.forEach(cE => assert.ok(cE.documentId));


            col.database.close();
        });
        it('should throw if pointer to low', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(30).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const evs = [];
            assert.throws(() => col._changeEventBuffer.runFrom(5, function (cE: any) {
                evs.push(cE);
            }));

            col.database.remove();
        });
    });
    describe('.getFrom()', () => {
        it('should getFrom correctly', async () => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.humanData()))
            );

            const evs: any[] = col._changeEventBuffer.getFrom(1) as any;
            assert.strictEqual(evs.length, 10);
            evs.forEach((cE: any) => assert.ok(cE.documentId));


            col.database.remove();
        });
        it('should run correct on remove', async () => {
            const col = await humansCollection.create(0);
            const q = col.find();
            await q.exec();
            await col.insert(schemaObjects.humanData());
            await q.exec();

            // remove the doc
            const doc: any = await col.findOne().exec();
            await doc.remove();
            await AsyncTestUtil.waitUntil(() => col._changeEventBuffer.getCounter() === 2);

            const evs: any[] = col._changeEventBuffer.getFrom(q._latestChangeEvent + 1) as any;
            assert.strictEqual(evs.length, 1);
            assert.strictEqual(evs[0].operation, 'DELETE');

            col.database.remove();
        });
    });
});

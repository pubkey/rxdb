import assert from 'assert';

import * as humansCollection from './../helper/humans-collection';
import * as schemaObjects from '../helper/schema-objects';
import * as util from '../../dist/lib/util';
import * as RxDocument from '../../dist/lib/RxDocument';
import * as ChangeEventBuffer from '../../dist/lib/ChangeEventBuffer';


process.on('unhandledRejection', function(err) {
    throw err;
});

describe('ChangeEventBuffer.test.js', () => {
    describe('basic', () => {
        it('should contains some events', async() => {
            const col = await humansCollection.create(10);
            assert.equal(col._changeEventBuffer.buffer.length, 10);
            col.database.destroy();
        });
        it('should delete older events when buffer get over limit', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );
            assert.equal(col._changeEventBuffer.buffer.length, 10);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );
            assert.equal(col._changeEventBuffer.buffer.length, 10);

            col.database.destroy();
        });
        it('check if correct events get removed', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const last = schemaObjects.human();
            await col.insert(last);
            const lastBufferEvent = col._changeEventBuffer.buffer[0];
            assert.equal(last.passportId, lastBufferEvent.data.v.passportId);

            col.database.destroy();
        });
    });
    describe('.getArrayIndexByPointer()', () => {
        it('return null if pointer is no more in buffer (too low)', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const got = col._changeEventBuffer.getArrayIndexByPointer(0);
            assert.equal(got, null);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const got2 = col._changeEventBuffer.getArrayIndexByPointer(10);
            assert.equal(got2, null);

            col.database.destroy();
        });
        it('return null if pointer is no more in buffer (too height)', async() => {
            const col = await humansCollection.create(0);
            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const got = col._changeEventBuffer.getArrayIndexByPointer(200);
            assert.equal(got, null);

            await Promise.all(
                new Array(11).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const got2 = col._changeEventBuffer.getArrayIndexByPointer(1000);
            assert.equal(got2, null);

            col.database.destroy();
        });
        it('return the right pointer', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            let got = col._changeEventBuffer.getArrayIndexByPointer(0);
            assert.equal(got, 0);

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            got = col._changeEventBuffer.getArrayIndexByPointer(15);
            assert.equal(got, 5);

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );
            got = col._changeEventBuffer.getArrayIndexByPointer(25);
            assert.equal(got, 5);

            got = col._changeEventBuffer.getArrayIndexByPointer(20);
            assert.equal(got, 0);

            col.database.destroy();
        });
    });
    describe('.runFrom()', () => {
        it('should run from correctly', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const evs = [];
            col._changeEventBuffer.runFrom(0, function(cE) {
                evs.push(cE);
            });
            assert.equal(evs.length, 10);
            evs.forEach(cE => assert.equal(cE.constructor.name, 'RxChangeEvent'));


            col.database.destroy();
        });
        it('should throw if pointer to low', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(30).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const evs = [];
            assert.throws(() => col._changeEventBuffer.runFrom(5, function(cE) {
                evs.push(cE);
            }), Error);

            col.database.destroy();
        });
    });


});

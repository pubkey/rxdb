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
        it('return the correct pointer', async() => {
            const col = await humansCollection.create(10);
            col._changeEventBuffer.limit = 10;

            const lastDoc = schemaObjects.human();
            await col.insert(lastDoc);
            console.dir(lastDoc);

            let gotIndex = col._changeEventBuffer.getArrayIndexByPointer(col._changeEventBuffer.counter - 1);
            assert.equal(col._changeEventBuffer.buffer[gotIndex].data.v.firstName, lastDoc.firstName);

            // TODO bug: it returns the wrong document

            const cE = col._changeEventBuffer.buffer[gotIndex];
            console.dir(cE.data);

            console.dir(gotIndex);

            process.exit();
            assert.deepEqual();
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
    describe('.getFrom()', () => {
        it('should getFrom correctly', async() => {
            const col = await humansCollection.create(0);
            col._changeEventBuffer.limit = 10;

            await Promise.all(
                new Array(10).fill(0).map(() => col.insert(schemaObjects.human()))
            );

            const evs = col._changeEventBuffer.getFrom(0);
            assert.equal(evs.length, 10);
            evs.forEach(cE => assert.equal(cE.constructor.name, 'RxChangeEvent'));


            col.database.destroy();
        });
        it('should run correct on remove', async() => {
            const col = await humansCollection.create(0);
            const q = col.find();
            await q.exec();
            await col.insert(schemaObjects.human());
            await q.exec();

            // remove the doc
            const doc = await col.findOne().exec();
            await doc.remove();
            await util.promiseWait(0);



            console.log(':::::::::::::::::::::::::::::');
            console.log(q._latestChangeEvent);
            const evs = col._changeEventBuffer.getFrom(q._latestChangeEvent);
            console.dir(evs);
            assert.equal(evs.length, 1);
            assert.equal(evs[0].data.op, 'REMOVE');
            console.log('XXXXXX');
            process.exit();



            sub.unsubscribe();
            c.database.destroy();
        });
    });
    describe('.reduceByLastOfDoc()', () => {
        it('should only have the last changeEvent for the doc', async() => {
            const col = await humansCollection.create(5);
            const q = col.find();
            await q.exec();
            const oneDoc = await col.findOne().exec();
            let newVal = 0;
            while (newVal < 5) {
                newVal++;
                oneDoc.age = newVal;
                await oneDoc.save();
            }
            const allEvents = q.collection._changeEventBuffer.getFrom(0);
            const reduced = q.collection._changeEventBuffer.reduceByLastOfDoc(allEvents);

            assert.equal(reduced.length, 5);
            const lastEvent = reduced.find(cE => cE.data.doc == oneDoc.getPrimary());
            assert.equal(lastEvent.data.v.age, 5);
            col.database.destroy();
        });


    });

});

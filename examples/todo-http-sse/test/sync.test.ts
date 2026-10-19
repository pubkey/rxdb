import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { EventSource } from 'eventsource';
import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { firstValueFrom, filter } from 'rxjs';
import { startTodoServer, type TodoServer } from '../server/server.ts';
import { createTodoDatabase, type TodoDatabase } from '../src/client/database.ts';
import { replicateTodos, type TodoReplication, type EventSourceConstructor } from '../src/client/replication.ts';

addRxPlugin(RxDBDevModePlugin);

type Device = {
    db: TodoDatabase;
    replication: TodoReplication;
    indexedDB: IDBFactory;
};

let deviceCounter = 0;

/**
 * Each device gets its own IndexedDB implementation so that
 * the devices only share data through the server.
 */
async function createDevice(serverUrl: string): Promise<Device> {
    const indexedDB = new IDBFactory();
    const db = await createTodoDatabase({
        name: 'device' + (deviceCounter++),
        password: 'my-secret-password-for-the-example',
        dexieSettings: { indexedDB, IDBKeyRange },
        multiInstance: false
    });
    const replication = replicateTodos(
        db.todos,
        serverUrl,
        EventSource as unknown as EventSourceConstructor
    );
    await replication.awaitInitialReplication();
    return { db, replication, indexedDB };
}

async function waitFor(check: () => Promise<boolean>, timeout = 5000) {
    const start = Date.now();
    while (!(await check())) {
        if (Date.now() - start > timeout) {
            throw new Error('waitFor() timed out');
        }
        await new Promise(res => setTimeout(res, 20));
    }
}

function readRawDocuments(device: Device): Promise<any[]> {
    const dbName = 'rxdb-dexie-' + device.db.name + '--0--todos';
    return new Promise((resolve, reject) => {
        const request = device.indexedDB.open(dbName);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const idb = request.result;
            const tx = idb.transaction('docs', 'readonly');
            const getAll = tx.objectStore('docs').getAll();
            getAll.onsuccess = () => {
                idb.close();
                resolve(getAll.result);
            };
            getAll.onerror = () => reject(getAll.error);
        };
    });
}

describe('todo app with HTTP + SSE replication', () => {
    let server: TodoServer;
    const devices: Device[] = [];

    before(async () => {
        server = await startTodoServer({ port: 0 });
    });
    after(async () => {
        await Promise.all(devices.map(device => device.db.close()));
        await server.close();
    });

    it('streams a new todo from one device to another over Server-Sent Events', async () => {
        const deviceA = await createDevice(server.url);
        const deviceB = await createDevice(server.url);
        devices.push(deviceA, deviceB);

        const now = Date.now();
        await deviceA.db.todos.insert({
            id: 'todo-1',
            title: 'buy milk',
            done: false,
            createdAt: now,
            updatedAt: now
        });

        /**
         * Device B never calls the pull handler again after the initial replication.
         * The document arrives through the SSE pull stream.
         */
        await waitFor(async () => !!(await deviceB.db.todos.findOne('todo-1').exec()));
        const docOnB = await deviceB.db.todos.findOne('todo-1').exec();
        assert.equal(docOnB?.title, 'buy milk');
    });

    it('stores the data encrypted and key-compressed in IndexedDB', async () => {
        const [deviceA] = devices;
        const rawDocs = await readRawDocuments(deviceA);
        const raw = rawDocs.find(d => JSON.stringify(d).includes('todo-1'));
        assert.ok(raw, 'raw document must exist');
        const rawJson = JSON.stringify(raw);
        assert.ok(!rawJson.includes('buy milk'), 'title must not be stored as plain text');
        assert.ok(!('title' in raw), 'property names must be compressed');
    });

    it('merges concurrent offline edits with the conflict handler', async () => {
        const [deviceA, deviceB] = devices;
        await deviceA.replication.pause();
        await deviceB.replication.pause();

        const docOnA = await deviceA.db.todos.findOne('todo-1').exec(true);
        await docOnA.incrementalPatch({ title: 'buy oat milk', updatedAt: Date.now() });
        await new Promise(res => setTimeout(res, 5));
        const docOnB = await deviceB.db.todos.findOne('todo-1').exec(true);
        await docOnB.incrementalPatch({ done: true, updatedAt: Date.now() });

        await deviceA.replication.start();
        await deviceA.replication.awaitInSync();

        const conflictPromise = firstValueFrom(
            deviceB.replication.conflict$.pipe(filter(c => c.input.realMasterState.id === 'todo-1'))
        );
        await deviceB.replication.start();
        await deviceB.replication.awaitInSync();
        const conflict = await conflictPromise;
        assert.equal(conflict.output.title, 'buy oat milk');
        assert.equal(conflict.output.done, true);

        // device A gets the merged state through the pull stream
        for (const device of devices) {
            await waitFor(async () => {
                const doc = await device.db.todos.findOne('todo-1').exec(true);
                return doc.title === 'buy oat milk' && doc.done === true;
            });
        }
    });

    it('a deletion on one device wins over an offline edit on another device', async () => {
        const [deviceA, deviceB] = devices;
        const now = Date.now();
        await deviceA.db.todos.insert({
            id: 'todo-2',
            title: 'walk the dog',
            done: false,
            createdAt: now,
            updatedAt: now
        });
        await waitFor(async () => !!(await deviceB.db.todos.findOne('todo-2').exec()));

        await deviceA.replication.pause();
        await deviceB.replication.pause();
        await (await deviceA.db.todos.findOne('todo-2').exec(true)).remove();
        await (await deviceB.db.todos.findOne('todo-2').exec(true))
            .incrementalPatch({ title: 'walk the cat', updatedAt: Date.now() });

        await deviceA.replication.start();
        await deviceA.replication.awaitInSync();
        await deviceB.replication.start();
        await deviceB.replication.awaitInSync();

        for (const device of devices) {
            await waitFor(async () => !(await device.db.todos.findOne('todo-2').exec()));
        }
    });

    it('a device that was offline catches up with the changes it missed', async () => {
        const [deviceA, deviceB] = devices;
        await deviceB.replication.pause();
        const now = Date.now();
        await deviceA.db.todos.bulkInsert(
            new Array(120).fill(0).map((_, i) => ({
                id: 'bulk-' + i,
                title: 'bulk todo ' + i,
                done: false,
                createdAt: now,
                updatedAt: now
            }))
        );
        await deviceA.replication.awaitInSync();

        await deviceB.replication.start();
        await deviceB.replication.reSync();
        await deviceB.replication.awaitInSync();
        const expectedCount = await deviceA.db.todos.count().exec();
        assert.ok(expectedCount >= 120);
        await waitFor(async () => (await deviceB.db.todos.count().exec()) === expectedCount);
    });

    it('the server rejects invalid push requests', async () => {
        const response = await fetch(server.url + '/api/todos/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([{ newDocumentState: { id: 'x' } }])
        });
        assert.equal(response.status, 400);
    });
});

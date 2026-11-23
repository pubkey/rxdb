/**
 * Uses the cleanup plugin without adding any other plugin,
 * like it is shown in the docs of the cleanup plugin.
 * This is run in a separate node-process via plugin.test.ts
 * because the other tests add the leader-election plugin.
 */

import assert from 'assert';
import { waitUntil } from 'async-test-util';

/**
 * exit with non-zero on unhandledRejection
 */
process.on('unhandledRejection', function (err) {
    console.log('cleanup-only.node.ts: unhandledRejection');
    console.error(err);
    process.exit(1);
});

import {
    createRxDatabase,
    randomToken,
    addRxPlugin
} from '../../plugins/core/index.mjs';
import {
    getRxStorageMemory
} from '../../plugins/storage-memory/index.mjs';
import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
import type {
    RxJsonSchema,
} from '../../plugins/core/index.mjs';
addRxPlugin(RxDBCleanupPlugin);

const schema: RxJsonSchema<{ id: string; name: string; }> = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        }
    },
    required: ['id', 'name']
};

const run = async function () {
    /**
     * multiInstance and cleanupPolicy.waitForLeadership
     * are not set so that their defaults are used.
     */
    const db = await createRxDatabase({
        name: randomToken(10),
        storage: getRxStorageMemory(),
        cleanupPolicy: {
            minimumCollectionAge: 0,
            minimumDeletedTime: 0,
            runEach: 10
        }
    });
    await db.addCollections({
        todos: {
            schema
        }
    });
    const collection = db.todos;

    await collection.insert({ id: 'todo1', name: 'Learn RxDB' });
    const doc = await collection.insert({ id: 'todo2', name: 'Buy groceries' });
    await doc.remove();

    /**
     * The automatic cleanup must purge the deleted document.
     * No timeout is set here, plugin.test.ts stops
     * the process when it runs for too long.
     */
    await waitUntil(async () => {
        const docsInStorage = await collection.storageInstance.findDocumentsById(
            ['todo1', 'todo2'],
            true
        );
        assert.ok(docsInStorage.find(d => d.id === 'todo1'));
        return !docsInStorage.find(d => d.id === 'todo2');
    });

    await db.close();
};

run();

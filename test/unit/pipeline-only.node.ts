/**
 * Uses the pipeline plugin without adding any other plugin.
 * This is run in a separate node-process via plugin.test.ts
 * because the other tests add the leader-election plugin.
 */

import assert from 'assert';

/**
 * exit with non-zero on unhandledRejection
 */
process.on('unhandledRejection', function (err) {
    console.log('pipeline-only.node.ts: unhandledRejection');
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
import { RxDBPipelinePlugin } from '../../plugins/pipeline/index.mjs';
import type {
    RxJsonSchema,
} from '../../plugins/core/index.mjs';
addRxPlugin(RxDBPipelinePlugin);

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
    const db = await createRxDatabase({
        name: randomToken(10),
        storage: getRxStorageMemory()
    });
    await db.addCollections({
        todos: {
            schema
        },
        todonames: {
            schema
        }
    });

    /**
     * options.waitForLeadership is not set
     * so that its default is used.
     */
    const pipeline = await db.todos.addPipeline({
        identifier: 'todo-names',
        destination: db.todonames,
        handler: async (docs) => {
            for (const doc of docs) {
                await db.todonames.upsert({
                    id: doc.primary,
                    name: doc.name
                });
            }
        }
    });

    await db.todos.insert({ id: 'todo1', name: 'Learn RxDB' });
    await pipeline.awaitIdle();
    const processed = await db.todonames.findOne('todo1').exec(true);
    assert.strictEqual(processed.name, 'Learn RxDB');

    await db.close();
};

run();

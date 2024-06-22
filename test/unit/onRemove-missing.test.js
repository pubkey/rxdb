// test/createDatabase.test.js

import { createRxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { addRxPlugin } from 'rxdb';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';
import { RxDBLeaderElectionPlugin } from 'rxdb/plugins/leader-election';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBJsonDumpPlugin } from 'rxdb/plugins/json-dump';
import { RxDBLocalDocumentsPlugin } from 'rxdb/plugins/local-documents';
import assert from 'assert';
import config from './config.ts';
import {
    isNode
} from '../../plugins/test-utils/index.mjs';

addRxPlugin(RxDBDevModePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBLeaderElectionPlugin);
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBJsonDumpPlugin);
addRxPlugin(RxDBLocalDocumentsPlugin);

const spaceTaskScheduleSchema = {
    version: 0,
    primaryKey: 'space_task_id',
    type: 'object',
    properties: {
        space_task_id: { type: 'string', maxLength: 100 },
        workcenter_id: { type: 'string' },
        space_id: { type: 'string' },
        task_id: { type: 'string' },
        building_name: { type: 'string' },
        section_name: { type: 'string' },
        space_pretty_name: { type: 'string' },
        space_name: { type: 'string' },
        task_name: { type: 'string' },
        task_ordinal_position: { type: 'number' },
        expected_start_date: { type: 'string', format: 'date' },
        expected_finish_date: { type: 'string', format: 'date' },
        actual_start_date: { type: 'string', format: 'date', maxLength: 100 },
        actual_finish_date: { type: 'string', format: 'date', maxLength: 100 },
        workcenter_comment: { type: 'string' },
        space_task_comment: { type: 'string' },
        status: { type: 'string' },
        float_backward: { type: 'number' },
        float_forward: { type: 'number' },
        updated_at: { type: 'string', format: 'date-time' },
        _deleted: { type: 'boolean' }
    },
    required: ['space_task_id'],
    indexes: [
        'actual_start_date',
        'actual_finish_date'
    ]
};

const createDatabase = async () => {
    const db = await createRxDatabase({
        name: 'project_schedules',
        storage: getRxStorageDexie(),
        multiInstance: true,
        eventReduce: true,
    });

    const collections = await db.addCollections({
        space_task_schedule: { schema: spaceTaskScheduleSchema, localDocuments: true },
    });

    return { db, collections };
};

describe('createDatabase', () => {
    it('should create the database and collection successfully, with the collection containing the onRemove property', async function () {
        // Ensure the test runs only in Node.js or only in browser, based on config\
        if (
            // !isNode // Runs only in Node.js
            isNode // Runs only in the browser
        ) {
            return;
        }

        if (!config.storage.hasMultiInstance) {
            return;
        }

        const { db, collections } = await createDatabase();

        // Assertions
        assert.strictEqual(db.name, 'project_schedules');
        assert.ok(collections.space_task_schedule);
        assert.ok(collections.space_task_schedule.onRemove);

        // Clean up
        await db.destroy();
    });
});

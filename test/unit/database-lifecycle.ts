import assert from 'assert';

import config, { describeParallel } from './config.ts';

import {
    createRxDatabase,
    randomToken,
    addRxPlugin,
    RxCollection,
    RxDatabase
} from '../../plugins/core/index.mjs';
import {
    HumanDocumentType,
    isDeno,
    schemaObjects,
    schemas
} from '../../plugins/test-utils/index.mjs';
import {
    RxDBStatePlugin
} from '../../plugins/state/index.mjs';
addRxPlugin(RxDBStatePlugin);

import { RxDBAttachmentsPlugin } from '../../plugins/attachments/index.mjs';
addRxPlugin(RxDBAttachmentsPlugin);
import { RxDBJsonDumpPlugin } from '../../plugins/json-dump/index.mjs';
addRxPlugin(RxDBJsonDumpPlugin);


/**
 * In these tests we check if combinations of operations work together.
 * In the past many storages had trouble when doing many things
 * and then doing cleanups or reopening themself.
 */
describeParallel('database-lifecycle.ts', () => {
    type Collection = RxCollection<HumanDocumentType, {}, {}>;
    type Collections = { humans: RxCollection<HumanDocumentType, {}, {}>; };

    it('do some writes updates and deletes and cleanups and reopens', async () => {
        if (isDeno) {
            return;
        }
        const dbName = randomToken(10);
        let col: Collection = {} as any;
        let db: RxDatabase<Collections> = undefined as any;
        async function refreshDatabase() {
            if (db) {
                await db.close();
            }
            db = await createRxDatabase({
                name: dbName,
                storage: config.storage.getStorage(),
            });
            await db.addCollections<Collections>({
                humans: {
                    schema: schemas.human
                }
            });
            col = db.humans;
        };
        await refreshDatabase();


        await col.bulkInsert([
            schemaObjects.humanData(),
            schemaObjects.humanData()
        ]);

        let result = await col.bulkInsert([
            schemaObjects.humanData(),
            schemaObjects.humanData()
        ]);

        await col.bulkUpsert(
            result.success.map(d => {
                const data = d.toMutableJSON();
                data.firstName = 'äää';
                return data;
            })
        );

        let oneDoc = await col.findOne().exec(true);
        await oneDoc.remove();

        await col.cleanup(0);

        await refreshDatabase();

        oneDoc = await col.findOne().exec(true);
        await oneDoc.patch({ age: 100 });

        const queryResult = await col.find({ selector: { age: 100 } }).exec();
        assert.ok(queryResult.length >= 1);


        result = await col.bulkInsert([
            schemaObjects.humanData(),
            schemaObjects.humanData(),
            schemaObjects.humanData(),
            schemaObjects.humanData(),
            schemaObjects.humanData()
        ]);

        await result.success[0].incrementalPatch({ age: 99 });
        await col.cleanup(0);
        await refreshDatabase();

        await col.bulkInsert([
            schemaObjects.humanData(),
            schemaObjects.humanData(),
            schemaObjects.humanData(),
            schemaObjects.humanData(),
            schemaObjects.humanData()
        ]);
        await col.find({ selector: { age: { $gt: 50 } } }).remove();

        await refreshDatabase();


        await col.cleanup(0);
        await db.remove();
    });


});

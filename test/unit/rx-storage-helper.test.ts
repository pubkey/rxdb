
import config from './config.ts';
import * as schemaObjects from '../helper/schema-objects.ts';
import {
    randomCouchString,
    now,
    fillWithDefaultSettings,
    categorizeBulkWriteRows,
    getPrimaryFieldOfPrimaryKey,
    BulkWriteRow
} from '../../plugins/core/index.mjs';
import * as schemas from '../helper/schemas.ts';
import {
    EXAMPLE_REVISION_1
} from '../helper/revisions.ts';
import assert from 'assert';


const testContext = 'rx-storage-helper.test.ts';

config.parallel('rx-storage-helper.test.ts', () => {
    describe('.categorizeBulkWriteRows()', () => {
        it('performance', async () => {

            const instance = await config.storage.getStorage().createStorageInstance({
                databaseInstanceToken: randomCouchString(10),
                databaseName: randomCouchString(10),
                collectionName: randomCouchString(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });
            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const amount = config.isFastMode() ? 100 : 10000;
            const writeRows: BulkWriteRow<schemas.HumanDocumentType>[] = new Array(amount).fill(0).map(() => {
                const document = Object.assign(
                    schemaObjects.human(),
                    {
                        _deleted: false,
                        _rev: EXAMPLE_REVISION_1,
                        _attachments: {},
                        _meta: {
                            lwt: now()
                        }
                    }
                );
                return { document };
            });

            const startTime = performance.now();

            await categorizeBulkWriteRows(
                instance,
                primaryPath,
                new Map(),
                writeRows,
                testContext
            );

            const endTime = performance.now();
            const time = endTime - startTime;

            // console.log('time ' + time);
            // process.exit();


            assert.ok(time);
            instance.close();
        });
    });
});

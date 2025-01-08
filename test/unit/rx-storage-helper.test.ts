
import config, { describeParallel } from './config.ts';
import {
    randomToken,
    now,
    fillWithDefaultSettings,
    categorizeBulkWriteRows,
    getPrimaryFieldOfPrimaryKey,
    BulkWriteRow
} from '../../plugins/core/index.mjs';
import {
    schemaObjects,
    schemas,
    isFastMode,
    EXAMPLE_REVISION_1,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import assert from 'assert';


const testContext = 'rx-storage-helper.test.ts';

describeParallel('rx-storage-helper.test.ts', () => {
    describe('.categorizeBulkWriteRows()', () => {
        it('performance', async () => {
            const instance = await config.storage.getStorage().createStorageInstance({
                databaseInstanceToken: randomToken(10),
                databaseName: randomToken(10),
                collectionName: randomToken(10),
                schema: fillWithDefaultSettings(schemas.human),
                options: {},
                multiInstance: false,
                devMode: true
            });
            const primaryPath = getPrimaryFieldOfPrimaryKey(schemas.human.primaryKey);
            const amount = isFastMode() ? 100 : 10000;
            const writeRows: BulkWriteRow<HumanDocumentType>[] = new Array(amount).fill(0).map(() => {
                const document = Object.assign(
                    schemaObjects.humanData(),
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


            assert.ok(typeof time === 'number');
            instance.remove();
        });
    });
});

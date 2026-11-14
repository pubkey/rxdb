
import config from './config.ts';
import {
    randomToken,
    now,
    fillWithDefaultSettings,
    categorizeBulkWriteRows,
    getPrimaryFieldOfPrimaryKey,
    BulkWriteRow,
    createRxDatabase,
    randomDelayStorage,
    newRxError,
    RxStorage
} from '../../plugins/core/index.mjs';
import { getRxStorageMemory } from '../../plugins/storage-memory/index.mjs';
import { wrappedValidateAjvStorage } from '../../plugins/validate-ajv/index.mjs';
import {
    schemaObjects,
    schemas,
    isFastMode,
    EXAMPLE_REVISION_1,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import assert from 'assert';


const testContext = 'rx-storage-helper.test.ts';

describe('rx-storage-helper.test.ts', () => {
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
    describe('randomDelayStorage()', () => {
        it('should continue with later writes after one bulkWrite() of the wrapped storage has rejected', async () => {
            const baseStorage = getRxStorageMemory();
            let failNextWrite = false;
            const flakyStorage: RxStorage<any, any> = {
                name: baseStorage.name,
                rxdbVersion: baseStorage.rxdbVersion,
                async createStorageInstance<RxDocType>(
                    params: Parameters<typeof baseStorage.createStorageInstance<RxDocType>>[0]
                ) {
                    const instance = await baseStorage.createStorageInstance<RxDocType>(params);
                    const originalBulkWrite = instance.bulkWrite.bind(instance);
                    instance.bulkWrite = (rows, context) => {
                        if (failNextWrite && params.collectionName === 'humans') {
                            failNextWrite = false;
                            return Promise.reject(newRxError('SNH', { name: 'transient write error' }));
                        }
                        return originalBulkWrite(rows, context);
                    };
                    return instance;
                }
            };
            const db = await createRxDatabase({
                name: randomToken(10),
                storage: wrappedValidateAjvStorage({
                    storage: randomDelayStorage({
                        storage: flakyStorage,
                        delayTimeBefore: () => 1,
                        delayTimeAfter: () => 1
                    })
                }),
                multiInstance: false
            });
            await db.addCollections({
                humans: { schema: schemas.human },
                others: { schema: schemas.human }
            });
            await db.humans.insert(schemaObjects.humanData('first'));

            failNextWrite = true;
            await assert.rejects(
                () => db.humans.insert(schemaObjects.humanData('failing'))
            );
            assert.strictEqual(failNextWrite, false);

            await db.humans.insert(schemaObjects.humanData('second'));
            await db.others.insert(schemaObjects.humanData('third'));

            const humansIds = (await db.humans.find().exec()).map(d => d.passportId).sort();
            assert.deepStrictEqual(humansIds, ['first', 'second']);
            const othersIds = (await db.others.find().exec()).map(d => d.passportId);
            assert.deepStrictEqual(othersIds, ['third']);

            await db.remove();
        });
    });
});

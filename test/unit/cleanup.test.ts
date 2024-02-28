import assert from 'assert';
import { wait, waitUntil } from 'async-test-util';

import config, { describeParallel } from './config.ts';
import {
    schemaObjects,
    schemas,
    isFastMode,
    HumanDocumentType
} from '../../plugins/test-utils/index.mjs';
import {
    createRxDatabase,
    randomCouchString,
    addRxPlugin,
    RxCollection
} from '../../plugins/core/index.mjs';

import { replicateRxCollection } from '../../plugins/replication/index.mjs';

import { RxDBCleanupPlugin } from '../../plugins/cleanup/index.mjs';
addRxPlugin(RxDBCleanupPlugin);

describeParallel('cleanup.test.js', () => {
    it('should clean up the deleted documents', async () => {
        const db = await createRxDatabase({
            name: randomCouchString(10),
            storage: config.storage.getStorage(),
            cleanupPolicy: {
                awaitReplicationsInSync: false,
                minimumCollectionAge: 0,
                minimumDeletedTime: 0,
                runEach: 10,
                waitForLeadership: false
            }
        });
        const cols = await db.addCollections({
            humans: {
                schema: schemas.human
            }
        });
        const collection: RxCollection<HumanDocumentType> = cols.humans;
        const notDeleted = await collection.insert(schemaObjects.humanData());
        const doc = await collection.insert(schemaObjects.humanData());
        await doc.remove();

        await waitUntil(async () => {
            const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
                [
                    doc.primary,
                    notDeleted.primary
                ],
                true
            );
            assert.ok(deletedDocInStorage.find(d => d[collection.schema.primaryPath] === notDeleted.primary));
            const deletedDocStillInStorage = !!deletedDocInStorage.find(d => d[collection.schema.primaryPath] === doc.primary);
            return !deletedDocStillInStorage;
        });

        db.destroy();
    });
    it('should pause the cleanup when a replication is not in sync', async () => {
        if (!config.storage.hasReplication) {
            return;
        }
        const db = await createRxDatabase({
            name: randomCouchString(10),
            storage: config.storage.getStorage(),
            cleanupPolicy: {
                awaitReplicationsInSync: true,
                minimumCollectionAge: 0,
                minimumDeletedTime: 0,
                runEach: 10,
                waitForLeadership: false
            }
        });
        const cols = await db.addCollections({
            humans: {
                schema: schemas.human
            }
        });

        const collection: RxCollection<HumanDocumentType> = cols.humans;
        replicateRxCollection({
            collection,
            replicationIdentifier: 'my-rep',
            deletedField: '_deleted',
            pull: {
                async handler() {
                    await wait(50);
                    throw new Error('never success');
                }
            },
            live: true
        });

        const doc = await collection.insert(schemaObjects.humanData());
        await doc.remove();
        await wait(isFastMode() ? 200 : 500);

        /**
         * The deleted document still be there
         * because the errored replication
         * blocks the cleanup
         */
        const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
            [doc.primary],
            true
        );
        assert.ok(deletedDocInStorage[0]);

        db.remove();
    });
    it('should work by manually calling RxCollection.cleanup()', async () => {
        const db = await createRxDatabase({
            name: randomCouchString(10),
            storage: config.storage.getStorage()
        });
        const cols = await db.addCollections({
            humans: {
                schema: schemas.human
            }
        });
        const collection: RxCollection<HumanDocumentType> = cols.humans;
        const notDeleted = await collection.insert(schemaObjects.humanData());
        const doc = await collection.insert(schemaObjects.humanData());
        await doc.remove();


        await collection.cleanup(0);
        const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
            [
                doc.primary,
                notDeleted.primary
            ],
            true
        );
        assert.strictEqual(deletedDocInStorage.length, 1);

        db.destroy();
    });
});

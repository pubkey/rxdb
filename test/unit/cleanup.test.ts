import assert from 'assert';
import { wait, waitUntil } from 'async-test-util';

import config from './config';
import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import {
    createRxDatabase,
    randomCouchString,
    addRxPlugin,
    RxCollection
} from '../../';

import { HumanDocumentType } from '../helper/schemas';
import { replicateRxCollection } from '../../plugins/replication';

import { RxDBCleanupPlugin } from '../../plugins/cleanup';
addRxPlugin(RxDBCleanupPlugin);

config.parallel('cleanup.test.js', () => {
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
        const notDeleted = await collection.insert(schemaObjects.human());
        const doc = await collection.insert(schemaObjects.human());
        await doc.remove();

        await waitUntil(async () => {
            const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
                [
                    doc.primary,
                    notDeleted.primary
                ],
                true
            );
            assert.ok(deletedDocInStorage[notDeleted.primary]);
            const deletedDocStillInStorage = !!deletedDocInStorage[doc.primary];
            return !deletedDocStillInStorage;
        });

        db.destroy();
    });
    it('should pause the cleanup when a replication is not in sync', async () => {
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

        const doc = await collection.insert(schemaObjects.human());
        await doc.remove();
        await wait(config.isFastMode() ? 200 : 500);

        /**
         * The deleted document still be there
         * because the errored replication
         * blocks the cleanup
         */
        const deletedDocInStorage = await collection.storageInstance.findDocumentsById(
            [doc.primary],
            true
        );
        assert.ok(deletedDocInStorage[doc.primary]);

        db.destroy();
    });
});

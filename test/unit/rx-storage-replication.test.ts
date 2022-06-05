import assert from 'assert';

import config from './config';
import * as schemaObjects from '../helper/schema-objects';
import {
    addRxPlugin,
    randomCouchString,
    getPseudoSchemaForVersion,
    lastOfArray,
    writeSingle,
    blobBufferUtil,
    flattenEvents,
    flatClone,
    RxJsonSchema,
    ensureNotFalsy,
    getFromObjectOrThrow,
    shuffleArray,
    now,
    getSingleDocument,
    hashAttachmentData,
    parseRevision,
    getAttachmentSize,
    fillWithDefaultSettings,
    createRevision,
    normalizeRxJsonSchema,
    replicateRxStorageInstance,
    awaitRxStorageReplicationFirstInSync,
    normalizeMangoQuery,
    MangoQuery
} from '../../';

import {
    getCompressionStateByRxJsonSchema,
    RxDBKeyCompressionPlugin
} from '../../plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);
import { RxDBValidatePlugin } from '../../plugins/validate';
addRxPlugin(RxDBValidatePlugin);
import * as schemas from '../helper/schemas';

import { RxDBQueryBuilderPlugin } from '../../plugins/query-builder';
import {
    clone,
    randomString,
    wait,
    waitUntil
} from 'async-test-util';
import {
    EventBulk,
    FilledMangoQuery,
    PreparedQuery,
    RxConflictHandler,
    RxDocumentData,
    RxDocumentWriteData,
    RxStorageBulkWriteResponse,
    RxStorageChangeEvent,
    RxStorageInstance,
    RxStorageInstanceReplicationState
} from '../../src/types';
import { filter, map } from 'rxjs/operators';
import {
    EXAMPLE_REVISION_1,
    EXAMPLE_REVISION_2,
    EXAMPLE_REVISION_3,
    EXAMPLE_REVISION_4
} from '../helper/revisions';
import { compressObject } from 'jsonschema-key-compression';
import { SimpleHumanDocumentType } from '../helper/schema-objects';
import { HumanDocumentType } from '../helper/schemas';

config.parallel('rx-storage-replication.test.js (implementation: ' + config.storage.name + ')', () => {
    const THROWING_CONFLICT_HANDLER: RxConflictHandler<HumanDocumentType> = () => {
        throw new Error('THROWING_CONFLICT_HANDLER');
    }
    function getDocData(): RxDocumentData<HumanDocumentType> {
        const docData = schemaObjects.human();
        const withMeta = Object.assign(
            {
                _deleted: false,
                _attachments: {},
                _meta: {
                    lwt: new Date().getTime()
                },
                _rev: EXAMPLE_REVISION_1
            },
            docData
        );
        return withMeta;
    }
    async function createRxStorageInstance(
        documentAmount: number = 0
    ): Promise<RxStorageInstance<HumanDocumentType, any, any>> {

        const storageInstance = await config.storage.getStorage().createStorageInstance<HumanDocumentType>({
            databaseName: randomCouchString(12),
            collectionName: randomCouchString(12),
            schema: fillWithDefaultSettings(schemas.human),
            options: {},
            multiInstance: false
        });

        if (documentAmount > 0) {
            await storageInstance.bulkWrite(
                new Array(documentAmount)
                    .fill(0)
                    .map(() => ({ document: getDocData() }))
            )
        }

        return storageInstance;
    }
    async function runQuery<RxDocType>(
        storageInstance: RxStorageInstance<RxDocType, any, any>,
        mangoQuery: MangoQuery<RxDocType> = {}
    ): Promise<RxDocumentData<RxDocType>[]> {
        const preparedQuery = storageInstance.storage.statics.prepareQuery(
            storageInstance.schema,
            normalizeMangoQuery(
                storageInstance.schema,
                mangoQuery
            )
        );
        const result = await storageInstance.query(preparedQuery);
        return result.documents;
    }

    async function cleanUp(replicationState: RxStorageInstanceReplicationState<any>) {
        replicationState.canceled.next(true);
        await Promise.all([
            replicationState.input.parent.close(),
            replicationState.input.child.close()
        ]);
    }

    config.parallel('helpers', () => {

    });
    config.parallel('up', () => {
        describe('it should write the initial data and also the ongoing insert', async () => {
            const parent = await createRxStorageInstance(1);
            const child = await createRxStorageInstance(0);

            const replicationState = replicateRxStorageInstance({
                parent,
                child,
                bulkSize: 100,
                conflictHandler: THROWING_CONFLICT_HANDLER
            });
            await awaitRxStorageReplicationFirstInSync(replicationState);

            // check inital doc
            const docsOnChild = await runQuery(child);
            assert.strictEqual(docsOnChild.length, 1);

            // check ongoing doc
            await child.bulkWrite([{
                document: getDocData()
            }]);

            await waitUntil(async () => {
                const docsOnParent = await runQuery(parent);
                return docsOnParent.length === 2;
            });

            cleanUp(replicationState);
        });
    });
});

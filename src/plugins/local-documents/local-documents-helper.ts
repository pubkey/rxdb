import { filter, map } from 'rxjs';
import { DocumentCache } from '../../doc-cache.ts';
import { IncrementalWriteQueue } from '../../incremental-write.ts';
import { newRxError } from '../../rx-error.ts';
import { fillWithDefaultSettings } from '../../rx-schema-helper.ts';
import {
    getWrappedStorageInstance
} from '../../rx-storage-helper.ts';
import type {
    LocalDocumentParent,
    LocalDocumentState,
    RxChangeEvent,
    RxChangeEventBulk,
    RxDatabase,
    RxDocumentData,
    RxJsonSchema,
    RxLocalDocumentData,
    RxStorage
} from '../../types/index.d.ts';
import { randomToken } from '../../plugins/utils/index.ts';
import { createRxLocalDocument } from './rx-local-document.ts';
import { overwritable } from '../../overwritable.ts';

export const LOCAL_DOC_STATE_BY_PARENT: WeakMap<LocalDocumentParent, Promise<LocalDocumentState>> = new WeakMap();
export const LOCAL_DOC_STATE_BY_PARENT_RESOLVED: WeakMap<LocalDocumentParent, LocalDocumentState> = new WeakMap();

export function createLocalDocStateByParent(parent: LocalDocumentParent): void {
    const database: RxDatabase = parent.database ? parent.database : parent as any;
    const collectionName = parent.database ? parent.name : '';
    const statePromise = (async () => {
        let storageInstance = await createLocalDocumentStorageInstance(
            database.token,
            database.storage,
            database.name,
            collectionName,
            database.instanceCreationOptions,
            database.multiInstance
        );
        storageInstance = getWrappedStorageInstance(
            database,
            storageInstance,
            RX_LOCAL_DOCUMENT_SCHEMA
        );

        const docCache = new DocumentCache<RxLocalDocumentData, {}>(
            'id',
            database.eventBulks$.pipe(
                filter(changeEventBulk => {
                    let ret = false;
                    if (
                        // parent is database
                        (
                            collectionName === '' &&
                            !changeEventBulk.collectionName
                        ) ||
                        // parent is collection
                        (
                            collectionName !== '' &&
                            changeEventBulk.collectionName === collectionName
                        )
                    ) {
                        ret = true;
                    }
                    return ret && changeEventBulk.isLocal;
                }),
                map(b => b.events)
            ),
            docData => createRxLocalDocument(docData, parent) as any
        );

        const incrementalWriteQueue = new IncrementalWriteQueue(
            storageInstance,
            'id',
            () => { },
            () => { }
        );

        /**
         * Emit the changestream into the collections change stream
         */
        const databaseStorageToken = await database.storageToken;
        const subLocalDocs = storageInstance.changeStream().subscribe(eventBulk => {
            const events = new Array(eventBulk.events.length);
            const rawEvents = eventBulk.events;
            const collectionName = parent.database ? parent.name : undefined;
            for (let index = 0; index < rawEvents.length; index++) {
                const event = rawEvents[index];
                events[index] = {
                    documentId: event.documentId,
                    collectionName,
                    isLocal: true,
                    operation: event.operation,
                    documentData: overwritable.deepFreezeWhenDevMode(event.documentData) as any,
                    previousDocumentData: overwritable.deepFreezeWhenDevMode(event.previousDocumentData) as any
                };
            }
            const changeEventBulk: RxChangeEventBulk<RxLocalDocumentData> = {
                id: eventBulk.id,
                isLocal: true,
                internal: false,
                collectionName: parent.database ? parent.name : undefined,
                storageToken: databaseStorageToken,
                events,
                databaseToken: database.token,
                checkpoint: eventBulk.checkpoint,
                context: eventBulk.context
            };
            database.$emit(changeEventBulk);
        });
        parent._subs.push(subLocalDocs);

        const state = {
            database,
            parent,
            storageInstance,
            docCache,
            incrementalWriteQueue
        };
        LOCAL_DOC_STATE_BY_PARENT_RESOLVED.set(parent, state);
        return state;
    })();
    LOCAL_DOC_STATE_BY_PARENT.set(parent, statePromise);
}

export function getLocalDocStateByParent(parent: LocalDocumentParent): Promise<LocalDocumentState> {
    const statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
    if (!statePromise) {
        const database: RxDatabase = parent.database ? parent.database : parent as any;
        const collectionName = parent.database ? parent.name : '';
        throw newRxError('LD8', {
            database: database.name,
            collection: collectionName
        });
    }
    return statePromise;
}

export function createLocalDocumentStorageInstance(
    databaseInstanceToken: string,
    storage: RxStorage<any, any>,
    databaseName: string,
    collectionName: string,
    instanceCreationOptions: any,
    multiInstance: boolean
) {
    return storage.createStorageInstance<RxLocalDocumentData>({
        databaseInstanceToken,
        databaseName: databaseName,
        /**
         * Use a different collection name for the local documents instance
         * so that the local docs can be kept while deleting the normal instance
         * after migration.
         */
        collectionName: getCollectionLocalInstanceName(collectionName),
        schema: RX_LOCAL_DOCUMENT_SCHEMA,
        options: instanceCreationOptions,
        multiInstance,
        devMode: overwritable.isDevMode()
    });
}

export function closeStateByParent(parent: LocalDocumentParent) {
    const statePromise = LOCAL_DOC_STATE_BY_PARENT.get(parent);
    if (statePromise) {
        LOCAL_DOC_STATE_BY_PARENT.delete(parent);
        return statePromise.then(state => state.storageInstance.close());
    }
}

export async function removeLocalDocumentsStorageInstance(
    storage: RxStorage<any, any>,
    databaseName: string,
    collectionName: string
) {
    const databaseInstanceToken = randomToken(10);
    const storageInstance = await createLocalDocumentStorageInstance(
        databaseInstanceToken,
        storage,
        databaseName,
        collectionName,
        {},
        false
    );
    await storageInstance.remove();
}

export function getCollectionLocalInstanceName(collectionName: string): string {
    return 'plugin-local-documents-' + collectionName;
}

export const RX_LOCAL_DOCUMENT_SCHEMA: RxJsonSchema<RxDocumentData<RxLocalDocumentData>> = fillWithDefaultSettings({
    title: 'RxLocalDocument',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 128
        },
        data: {
            type: 'object',
            additionalProperties: true
        }
    },
    required: [
        'id',
        'data'
    ]
});

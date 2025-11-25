import { newRxError } from '../../rx-error.ts';
import { fillWithDefaultSettings } from '../../rx-schema-helper.ts';
import type {
    LocalDocumentParent,
    LocalDocumentState,
    RxDatabase,
    RxDocumentData,
    RxJsonSchema,
    RxLocalDocumentData,
    RxStorage
} from '../../types/index.d.ts';
import { randomToken } from '../../plugins/utils/index.ts';
import { overwritable } from '../../overwritable.ts';

export const LOCAL_DOC_STATE_BY_PARENT: WeakMap<LocalDocumentParent, Promise<LocalDocumentState>> = new WeakMap();
export const LOCAL_DOC_STATE_BY_PARENT_RESOLVED: WeakMap<LocalDocumentParent, LocalDocumentState> = new WeakMap();

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

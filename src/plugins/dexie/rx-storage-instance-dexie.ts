import type {
    ChangeEvent
} from 'event-reduce-js';
import {
    Subject,
    Observable
} from 'rxjs';
import {
    promiseWait,
    createRevision,
    getHeightOfRevision,
    parseRevision,
    lastOfArray,
    flatClone,
    now,
    ensureNotFalsy,
    randomCouchString,
    isMaybeReadonlyArray
} from '../../util';
import { newRxError } from '../../rx-error';
import { getPrimaryFieldOfPrimaryKey } from '../../rx-schema';
import type {
    RxStorageInstance,
    RxStorageChangeEvent,
    RxDocumentData,
    BulkWriteRow,
    RxStorageBulkWriteResponse,
    RxStorageBulkWriteError,
    RxStorageQueryResult,
    BlobBuffer,
    ChangeStreamOnceOptions,
    RxJsonSchema,
    MangoQuery,
    RxStorageChangedDocumentMeta,
    RxStorageInstanceCreationParams,
    EventBulk
} from '../../types';
import { DexieSettings, DexieStorageInternals } from '../../types/plugins/dexie';
import { RxStorageDexie } from './rx-storage-dexie';
import { getDexieDbByName } from './dexie-helper';

let instanceId = now();

export class RxStorageInstanceDexie<RxDocType> implements RxStorageInstance<
    RxDocType,
    DexieStorageInternals,
    DexieSettings
> {
    public readonly primaryPath: keyof RxDocType;
    private changes$: Subject<EventBulk<RxStorageChangeEvent<RxDocumentData<RxDocType>>>> = new Subject();
    public readonly instanceId = instanceId++;
    public closed = false;


    constructor(
        public readonly storage: RxStorageDexie,
        public readonly databaseName: string,
        public readonly collectionName: string,
        public readonly schema: Readonly<RxJsonSchema<RxDocType>>,
        public readonly internals: DexieStorageInternals,
        public readonly options: Readonly<DexieSettings>,
        public readonly databaseSettings: DexieSettings
    ) {
        this.primaryPath = getPrimaryFieldOfPrimaryKey(this.schema.primaryKey);
    }
}


export async function createDexieStorageInstance<RxDocType>(
    storage: RxStorageDexie,
    params: RxStorageInstanceCreationParams<RxDocType, DexieSettings>,
    databaseSettings: DexieSettings
): Promise<RxStorageInstanceDexie<RxDocType>> {
    const internals: DexieStorageInternals = {
        database: getDexieDbByName(params.databaseName)
    };

    const instance = new RxStorageInstanceDexie(
        storage,
        params.databaseName,
        params.collectionName,
        params.schema,
        internals,
        params.options,
        databaseSettings
    );

    return instance;
}

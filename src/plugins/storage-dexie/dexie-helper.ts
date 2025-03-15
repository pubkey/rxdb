import type {
    DexieStorageInternals,
    RxDocumentData,
    RxJsonSchema
} from '../../types/index.d.ts';
import { Dexie } from 'dexie';
import type { DexieSettings } from '../../types/index.d.ts';
import { flatClone, getFromMapOrCreate, getProperty, setProperty, toArray, uniqueArray } from '../utils/index.ts';
import {
    getPrimaryFieldOfPrimaryKey,
    getSchemaByObjectPath
} from '../../rx-schema-helper.ts';

export const DEXIE_DOCS_TABLE_NAME = 'docs';
export const DEXIE_CHANGES_TABLE_NAME = 'changes';
export const DEXIE_ATTACHMENTS_TABLE_NAME = 'attachments';

export const RX_STORAGE_NAME_DEXIE = 'dexie';

const DEXIE_STATE_DB_BY_NAME: Map<string, DexieStorageInternals> = new Map();
const REF_COUNT_PER_DEXIE_DB: Map<DexieStorageInternals, number> = new Map();
export function getDexieDbWithTables(
    databaseName: string,
    collectionName: string,
    settings: DexieSettings,
    schema: RxJsonSchema<any>
): DexieStorageInternals {
    const dexieDbName = 'rxdb-dexie-' + databaseName + '--' + schema.version + '--' + collectionName;

    const state = getFromMapOrCreate(
        DEXIE_STATE_DB_BY_NAME,
        dexieDbName,
        () => {
            const value = (async () => {
                /**
                 * IndexedDB was not designed for dynamically adding tables on the fly,
                 * so we create one dexie database per RxDB storage instance.
                 * @link https://github.com/dexie/Dexie.js/issues/684#issuecomment-373224696
                 */
                const useSettings = flatClone(settings);
                useSettings.autoOpen = false;
                const dexieDb = new Dexie(dexieDbName, useSettings);
                if (settings.onCreate) {
                    await settings.onCreate(dexieDb, dexieDbName);
                }
                const dexieStoresSettings = {
                    [DEXIE_DOCS_TABLE_NAME]: getDexieStoreSchema(schema),
                    [DEXIE_CHANGES_TABLE_NAME]: '++sequence, id',
                    [DEXIE_ATTACHMENTS_TABLE_NAME]: 'id'
                };

                dexieDb.version(1).stores(dexieStoresSettings);
                await dexieDb.open();

                return {
                    dexieDb,
                    dexieTable: (dexieDb as any)[DEXIE_DOCS_TABLE_NAME],
                    dexieAttachmentsTable: (dexieDb as any)[DEXIE_ATTACHMENTS_TABLE_NAME],
                    booleanIndexes: getBooleanIndexes(schema)
                };
            })();
            DEXIE_STATE_DB_BY_NAME.set(dexieDbName, state);
            REF_COUNT_PER_DEXIE_DB.set(state, 0);
            return value;
        }
    );
    return state;
}

export async function closeDexieDb(statePromise: DexieStorageInternals) {
    const state = await statePromise;
    const prevCount = REF_COUNT_PER_DEXIE_DB.get(statePromise);
    const newCount = (prevCount as any) - 1;
    if (newCount === 0) {
        state.dexieDb.close();
        REF_COUNT_PER_DEXIE_DB.delete(statePromise);
    } else {
        REF_COUNT_PER_DEXIE_DB.set(statePromise, newCount);
    }
}



/**
 * It is not possible to set non-javascript-variable-syntax
 * keys as IndexedDB indexes. So we have to substitute the pipe-char
 * which comes from the key-compression plugin.
 */
export const DEXIE_PIPE_SUBSTITUTE = '__';
export function dexieReplaceIfStartsWithPipe(str: string): string {
    const split = str.split('.');
    if (split.length > 1) {
        return split.map(part => dexieReplaceIfStartsWithPipe(part)).join('.');
    }

    if (str.startsWith('|')) {
        const withoutFirst = str.substring(1);
        return DEXIE_PIPE_SUBSTITUTE + withoutFirst;
    } else {
        return str;
    }
}

export function dexieReplaceIfStartsWithPipeRevert(str: string): string {
    const split = str.split('.');
    if (split.length > 1) {
        return split.map(part => dexieReplaceIfStartsWithPipeRevert(part)).join('.');
    }

    if (str.startsWith(DEXIE_PIPE_SUBSTITUTE)) {
        const withoutFirst = str.substring(DEXIE_PIPE_SUBSTITUTE.length);
        return '|' + withoutFirst;
    } else {
        return str;
    }
}


/**
 * IndexedDB does not support boolean indexing.
 * So we have to replace true/false with '1'/'0'
 * @param d 
 */
export function fromStorageToDexie<RxDocType>(
    booleanIndexes: string[],
    inputDoc: RxDocumentData<RxDocType>
): any {
    if (!inputDoc) {
        return inputDoc;
    }
    let d = flatClone(inputDoc);
    d = fromStorageToDexieField(d);

    booleanIndexes.forEach(idx => {
        const val = getProperty(inputDoc, idx);
        const newVal = val ? '1' : '0';
        const useIndex = dexieReplaceIfStartsWithPipe(idx);
        setProperty(d, useIndex, newVal);
    });

    return d;
}
export function fromDexieToStorage<RxDocType>(
    booleanIndexes: string[],
    d: any
): RxDocumentData<RxDocType> {
    if (!d) {
        return d;
    }

    d = flatClone(d);
    d = fromDexieToStorageField(d);

    booleanIndexes.forEach(idx => {
        const val = getProperty(d, idx);
        const newVal = val === '1' ? true : false;
        setProperty(d, idx, newVal);
    });

    return d;
}

/**
 * @recursive
 */
export function fromStorageToDexieField(documentData: RxDocumentData<any>): any {
    if (
        !documentData ||
        typeof documentData === 'string' ||
        typeof documentData === 'number' ||
        typeof documentData === 'boolean'
    ) {
        return documentData;
    } else if (Array.isArray(documentData)) {
        return documentData.map(row => fromStorageToDexieField(row));
    } else if (typeof documentData === 'object') {
        const ret: any = {};
        Object.entries(documentData).forEach(([key, value]) => {
            if (typeof value === 'object') {
                value = fromStorageToDexieField(value);
            }
            ret[dexieReplaceIfStartsWithPipe(key)] = value;
        });
        return ret;
    }
}

export function fromDexieToStorageField(documentData: any): RxDocumentData<any> {
    if (!documentData || typeof documentData === 'string' || typeof documentData === 'number' || typeof documentData === 'boolean') {
        return documentData;
    } else if (Array.isArray(documentData)) {
        return documentData.map(row => fromDexieToStorageField(row));
    } else if (typeof documentData === 'object') {
        const ret: any = {};
        Object.entries(documentData).forEach(([key, value]) => {
            if (typeof value === 'object' || Array.isArray(documentData)) {
                value = fromDexieToStorageField(value);
            }
            ret[dexieReplaceIfStartsWithPipeRevert(key)] = value;
        });
        return ret;
    }
}


/**
 * Creates a string that can be used to create the dexie store.
 * @link https://dexie.org/docs/API-Reference#quick-reference
 */
export function getDexieStoreSchema(
    rxJsonSchema: RxJsonSchema<any>
): string {
    let parts: string[][] = [];

    /**
     * First part must be the primary key
     * @link https://github.com/dexie/Dexie.js/issues/1307#issuecomment-846590912
     */
    const primaryKey = getPrimaryFieldOfPrimaryKey(rxJsonSchema.primaryKey);
    parts.push([primaryKey]);
    parts.push(['_deleted', primaryKey]);

    // add other indexes
    if (rxJsonSchema.indexes) {
        rxJsonSchema.indexes.forEach(index => {
            const arIndex = toArray(index);
            parts.push(arIndex);
        });
    }

    // we also need the _meta.lwt+primaryKey index for the getChangedDocumentsSince() method.
    parts.push(['_meta.lwt', primaryKey]);

    // and this one for the cleanup()
    parts.push(['_meta.lwt']);

    /**
     * It is not possible to set non-javascript-variable-syntax
     * keys as IndexedDB indexes. So we have to substitute the pipe-char
     * which comes from the key-compression plugin.
     */
    parts = parts.map(part => {
        return part.map(str => dexieReplaceIfStartsWithPipe(str));
    });

    let dexieSchemaRows = parts.map(part => {
        if (part.length === 1) {
            return part[0];
        } else {
            return '[' + part.join('+') + ']';
        }
    });
    dexieSchemaRows = dexieSchemaRows.filter((elem: any, pos: any, arr: any) => arr.indexOf(elem) === pos); // unique;

    const dexieSchema = dexieSchemaRows.join(', ');

    return dexieSchema;
}

/**
 * Returns all documents in the database.
 * Non-deleted plus deleted ones.
 */
export async function getDocsInDb<RxDocType>(
    internals: DexieStorageInternals,
    docIds: string[]
): Promise<RxDocumentData<RxDocType>[]> {
    const state = await internals;
    const docsInDb = await state.dexieTable.bulkGet(docIds);
    return docsInDb.map(d => fromDexieToStorage(state.booleanIndexes, d));
}


export function attachmentObjectId(documentId: string, attachmentId: string): string {
    return documentId + '||' + attachmentId;
}


export function getBooleanIndexes(schema: RxJsonSchema<any>): string[] {
    const checkedFields = new Set<string>();
    const ret: string[] = [];
    if (!schema.indexes) {
        return ret;
    }
    schema.indexes.forEach(index => {
        const fields = toArray(index);
        fields.forEach(field => {
            if (checkedFields.has(field)) {
                return;
            }
            checkedFields.add(field);
            const schemaObj = getSchemaByObjectPath(schema, field);
            if (schemaObj.type === 'boolean') {
                ret.push(field);
            }
        });
    });
    ret.push('_deleted');

    return uniqueArray(ret);
}


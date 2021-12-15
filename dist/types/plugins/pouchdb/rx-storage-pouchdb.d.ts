/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { PouchDBInstance, PouchSettings, RxJsonSchema, RxStorageInstanceCreationParams, RxStorage, RxKeyObjectStorageInstanceCreationParams, MangoQuery, RxDocumentWriteData, RxStorageStatics } from '../../types';
import { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { RxStorageKeyObjectInstancePouch } from './rx-storage-key-object-instance-pouch';
import { PouchStorageInternals } from './pouchdb-helper';
import type { DeterministicSortComparator, QueryMatcher } from 'event-reduce-js';
export declare const RxStoragePouchStatics: RxStorageStatics;
export declare class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    adapter: any;
    pouchSettings: PouchSettings;
    name: string;
    statics: Readonly<{
        hash(data: string | Blob | Buffer): Promise<string>;
        hashKey: string;
        prepareQuery<DocumentData>(schema: RxJsonSchema<DocumentData>, mutateableQuery: MangoQuery<DocumentData>): any;
        getSortComparator<DocumentData_1>(schema: RxJsonSchema<DocumentData_1>, query: MangoQuery<DocumentData_1>): DeterministicSortComparator<DocumentData_1>;
        getQueryMatcher<DocumentData_2>(schema: RxJsonSchema<DocumentData_2>, query: MangoQuery<DocumentData_2>): QueryMatcher<RxDocumentWriteData<DocumentData_2>>;
    }>;
    constructor(adapter: any, pouchSettings?: PouchSettings);
    private createPouch;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, PouchSettings>): Promise<RxStorageInstancePouch<RxDocType>>;
    createKeyObjectStorageInstance(params: RxKeyObjectStorageInstanceCreationParams<PouchSettings>): Promise<RxStorageKeyObjectInstancePouch>;
}
/**
 * Checks if all is ok with the given adapter,
 * else throws an error.
 */
export declare function checkPouchAdapter(adapter: string | any): void;
/**
 * Creates the indexes of the schema inside of the pouchdb instance.
 * Will skip indexes that already exist.
 */
export declare function createIndexesOnPouch(pouch: PouchDBInstance, schema: RxJsonSchema<any>): Promise<void>;
/**
 * returns the pouchdb-database-name
 */
export declare function getPouchLocation(dbName: string, collectionName: string, schemaVersion: number): string;
export declare function getRxStoragePouch(adapter: any, pouchSettings?: PouchSettings): RxStoragePouch;

import type { PouchDBInstance, PouchSettings, RxJsonSchema, RxStorageInstanceCreationParams, RxStorage, RxCollection } from '../../types';
import { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { PouchStorageInternals } from './pouchdb-helper';
export declare class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    adapter: any;
    pouchSettings: PouchSettings;
    name: string;
    statics: Readonly<{
        prepareQuery<RxDocType>(schema: RxJsonSchema<import("../../types").RxDocumentData<RxDocType>>, mutateableQuery: import("../../types").FilledMangoQuery<RxDocType>): any;
        getSortComparator<RxDocType_1>(schema: RxJsonSchema<import("../../types").RxDocumentData<RxDocType_1>>, preparedQuery: any): import("event-reduce-js").DeterministicSortComparator<RxDocType_1>;
        getQueryMatcher<RxDocType_2>(schema: RxJsonSchema<import("../../types").RxDocumentData<RxDocType_2>>, preparedQuery: any): import("event-reduce-js").QueryMatcher<import("../../types").RxDocumentData<RxDocType_2>>;
    }>;
    constructor(adapter: any, pouchSettings?: PouchSettings);
    private createPouch;
    createStorageInstance<RxDocType>(params: RxStorageInstanceCreationParams<RxDocType, PouchSettings>): Promise<RxStorageInstancePouch<RxDocType>>;
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
export declare function getPouchDBOfRxCollection(collection: RxCollection<any>): PouchDBInstance;
export declare function getRxStoragePouch(adapter: any, pouchSettings?: PouchSettings): RxStoragePouch;

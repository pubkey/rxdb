/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { PouchDBInstance, PouchSettings, RxJsonSchema, RxStorageInstanceCreationParams, RxStorage, RxKeyObjectStorageInstanceCreationParams } from '../../types';
import { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import { RxStorageKeyObjectInstancePouch } from './rx-storage-key-object-instance-pouch';
import { PouchStorageInternals } from './pouchdb-helper';
export declare class RxStoragePouch implements RxStorage<PouchStorageInternals, PouchSettings> {
    adapter: any;
    pouchSettings: PouchSettings;
    name: string;
    constructor(adapter: any, pouchSettings?: PouchSettings);
    /**
     * create the same diggest as an attachment with that data
     * would have created by pouchdb internally.
     */
    hash(data: Buffer | Blob | string): Promise<string>;
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

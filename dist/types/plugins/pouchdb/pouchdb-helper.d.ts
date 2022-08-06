/// <reference types="node" />
/// <reference types="pouchdb-core" />
import type { ChangeStreamEvent, MaybeReadonly, PouchChangeRow, PouchDBInstance, RxAttachmentData, RxAttachmentWriteData, RxDocumentData, RxDocumentWriteData, RxLocalDocumentData, StringKeys, WithAttachments } from '../../types';
import type { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import type { ChangeEvent } from 'event-reduce-js';
export declare type PouchStorageInternals = {
    pouchInstanceId: string;
    pouch: PouchDBInstance;
};
export declare const RX_STORAGE_NAME_POUCHDB = "pouchdb";
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageInstancePouch<any>>;
/**
 * All open PouchDB instances are stored here
 * so that we can find them again when needed in the internals.
 */
export declare const OPEN_POUCH_INSTANCES: Map<string, PouchDBInstance>;
export declare function openPouchId(databaseInstanceToken: string, databaseName: string, collectionName: string, schemaVersion: number): string;
/**
 * prefix of local pouchdb documents
 */
export declare const POUCHDB_LOCAL_PREFIX: '_local/';
export declare const POUCHDB_LOCAL_PREFIX_LENGTH: number;
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export declare const POUCHDB_DESIGN_PREFIX: '_design/';
/**
 * PouchDB does not allow to add custom properties
 * that start with lodash like RxDB's _meta field.
 * So we have to map this field into a non-lodashed field.
 */
export declare const POUCHDB_META_FIELDNAME = "rxdbMeta";
export declare function pouchSwapIdToPrimary<T>(primaryKey: StringKeys<RxDocumentData<T>>, docData: any): any;
export declare function pouchSwapIdToPrimaryString<T>(primaryKey: StringKeys<RxDocumentData<T>>, str: keyof T): StringKeys<RxDocumentData<T>>;
export declare function pouchDocumentDataToRxDocumentData<T>(primaryKey: StringKeys<RxDocumentData<T>>, pouchDoc: WithAttachments<T>): RxDocumentData<T>;
export declare function rxDocumentDataToPouchDocumentData<T>(primaryKey: StringKeys<RxDocumentData<T>>, doc: RxDocumentData<T> | RxDocumentWriteData<T>): WithAttachments<T & {
    _id: string;
}>;
/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export declare function pouchSwapPrimaryToId<RxDocType>(primaryKey: StringKeys<RxDocumentData<RxDocType>>, docData: any): RxDocType & {
    _id: string;
};
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */
export declare function pouchStripLocalFlagFromPrimary(str: string): string;
export declare function getEventKey(pouchDBInstance: PouchDBInstance, primary: string, change: ChangeEvent<RxDocumentData<any>>): string;
export declare function pouchChangeRowToChangeEvent<DocumentData>(primaryKey: StringKeys<DocumentData>, pouchDoc: any): ChangeEvent<RxDocumentData<DocumentData>>;
export declare function pouchChangeRowToChangeStreamEvent<DocumentData>(primaryKey: StringKeys<DocumentData>, pouchRow: PouchChangeRow): ChangeStreamEvent<DocumentData>;
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export declare function primarySwapPouchDbQuerySelector<RxDocType>(selector: any, primaryKey: StringKeys<RxDocumentData<RxDocType>>): any;
export declare function pouchHash(data: Buffer | Blob | string): Promise<string>;
export declare function writeAttachmentsToAttachments(attachments: {
    [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
}): Promise<{
    [attachmentId: string]: RxAttachmentData;
}>;
export declare function getPouchIndexDesignDocNameByIndex(index: MaybeReadonly<string[]>): string;
/**
 * PouchDB has not way to read deleted local documents
 * out of the database.
 * So instead of deleting them, we set a custom deleted flag.
 */
export declare const RXDB_POUCH_DELETED_FLAG: "rxdb-pouch-deleted";
export declare type RxLocalDocumentDataWithCustomDeletedField<D> = RxLocalDocumentData<D> & {
    [k in typeof RXDB_POUCH_DELETED_FLAG]?: boolean;
};

/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { ChangeStreamEvent, MaybeReadonly, PouchChangeRow, PouchDBInstance, RxAttachmentData, RxAttachmentWriteData, RxDocumentData, RxDocumentWriteData, RxLocalDocumentData, WithAttachments } from '../../types';
import type { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import type { ChangeEvent } from 'event-reduce-js';
export declare type PouchStorageInternals = {
    pouch: PouchDBInstance;
};
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageInstancePouch<any>>;
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
export declare function pouchSwapIdToPrimary<T>(primaryKey: keyof T, docData: any): any;
export declare function pouchSwapIdToPrimaryString<T>(primaryKey: keyof T, str: keyof T): keyof T;
export declare function pouchDocumentDataToRxDocumentData<T>(primaryKey: keyof T, pouchDoc: WithAttachments<T>): RxDocumentData<T>;
export declare function rxDocumentDataToPouchDocumentData<T>(primaryKey: keyof T, doc: RxDocumentData<T> | RxDocumentWriteData<T>): WithAttachments<T & {
    _id: string;
}>;
/**
 * Swaps the primaryKey of the document
 * to the _id property.
 */
export declare function pouchSwapPrimaryToId<RxDocType>(primaryKey: keyof RxDocType, docData: any): RxDocType & {
    _id: string;
};
/**
 * in:  '_local/foobar'
 * out: 'foobar'
 */
export declare function pouchStripLocalFlagFromPrimary(str: string): string;
export declare function getEventKey(pouchDBInstance: PouchDBInstance, primary: string, change: ChangeEvent<RxDocumentData<any>>): string;
export declare function pouchChangeRowToChangeEvent<DocumentData>(primaryKey: keyof DocumentData, pouchDoc: any): ChangeEvent<RxDocumentData<DocumentData>>;
export declare function pouchChangeRowToChangeStreamEvent<DocumentData>(primaryKey: keyof DocumentData, pouchRow: PouchChangeRow): ChangeStreamEvent<DocumentData>;
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export declare function primarySwapPouchDbQuerySelector<RxDocType>(selector: any, primaryKey: keyof RxDocumentData<RxDocType>): any;
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
export declare type RxLocalDocumentDataWithCustomDeletedFlag<D> = RxLocalDocumentData<D> & {
    [k in typeof RXDB_POUCH_DELETED_FLAG]?: boolean;
};

/// <reference types="pouchdb-core" />
/// <reference types="node" />
import type { ChangeStreamEvent, PouchChangeRow, PouchDBInstance, RxAttachmentData, RxAttachmentWriteData, RxDocumentData, RxDocumentWriteData, WithAttachments } from '../../types';
import type { RxStorageInstancePouch } from './rx-storage-instance-pouch';
import type { RxStorageKeyObjectInstancePouch } from './rx-storage-key-object-instance-pouch';
import type { ChangeEvent } from 'event-reduce-js';
export declare type PouchStorageInternals = {
    pouch: PouchDBInstance;
};
/**
 * Used to check in tests if all instances have been cleaned up.
 */
export declare const OPEN_POUCHDB_STORAGE_INSTANCES: Set<RxStorageKeyObjectInstancePouch | RxStorageInstancePouch<any>>;
/**
 * prefix of local pouchdb documents
 */
export declare const POUCHDB_LOCAL_PREFIX: '_local/';
/**
 * Pouchdb stores indexes as design documents,
 * we have to filter them out and not return the
 * design documents to the outside.
 */
export declare const POUCHDB_DESIGN_PREFIX: '_design/';
export declare function pouchHash(data: Buffer | Blob | string): Promise<string>;
export declare function pouchSwapIdToPrimary<T>(primaryKey: keyof T, docData: any): any;
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
export declare function getEventKey(isLocal: boolean, primary: string, revision: string): string;
export declare function pouchChangeRowToChangeEvent<DocumentData>(primaryKey: keyof DocumentData, pouchDoc: any): ChangeEvent<RxDocumentData<DocumentData>>;
export declare function pouchChangeRowToChangeStreamEvent<DocumentData>(primaryKey: keyof DocumentData, pouchRow: PouchChangeRow): ChangeStreamEvent<DocumentData>;
/**
 * Runs a primary swap with transform all custom primaryKey occurences
 * into '_id'
 * @recursive
 */
export declare function primarySwapPouchDbQuerySelector<RxDocType>(selector: any, primaryKey: keyof RxDocType): any;
export declare function writeAttachmentsToAttachments(attachments: {
    [attachmentId: string]: RxAttachmentData | RxAttachmentWriteData;
}): Promise<{
    [attachmentId: string]: RxAttachmentData;
}>;

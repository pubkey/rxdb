/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
import { WriteOperation, ChangeEvent as EventReduceChangeEvent } from 'event-reduce-js';
import type { RxCollection, RxDocument, RxDocumentTypeWithRev } from './types';
export declare type RxChangeEventJson<DocType = any> = {
    operation: WriteOperation;
    documentId: string;
    documentData: RxDocumentTypeWithRev<DocType>;
    previousData?: DocType;
    databaseToken: string;
    collectionName: string;
    isLocal: boolean;
    startTime?: number;
    endTime?: number;
};
export declare type RxChangeEventBroadcastChannelData = {
    cE: RxChangeEventJson;
    storageToken: string;
};
export declare class RxChangeEvent<DocType = any> {
    readonly operation: WriteOperation;
    readonly documentId: string;
    readonly documentData: RxDocumentTypeWithRev<DocType>;
    readonly databaseToken: string;
    readonly collectionName: string;
    readonly isLocal: boolean;
    /**
     * timestam on when the operation was triggered
     * and when it was finished
     * This is optional because we do not have this time
     * for events that come from pouchdbs changestream.
     */
    startTime?: number | undefined;
    endTime?: number | undefined;
    readonly previousData?: DocType | null | undefined;
    readonly rxDocument?: RxDocument<DocType, {}> | undefined;
    constructor(operation: WriteOperation, documentId: string, documentData: RxDocumentTypeWithRev<DocType>, databaseToken: string, collectionName: string, isLocal: boolean, 
    /**
     * timestam on when the operation was triggered
     * and when it was finished
     * This is optional because we do not have this time
     * for events that come from pouchdbs changestream.
     */
    startTime?: number | undefined, endTime?: number | undefined, previousData?: DocType | null | undefined, rxDocument?: RxDocument<DocType, {}> | undefined);
    isIntern(): boolean;
    toJSON(): RxChangeEventJson<DocType>;
    toEventReduceChangeEvent(): EventReduceChangeEvent<DocType>;
}
export interface RxChangeEventInsert<DocType = any> extends RxChangeEvent<DocType> {
    operation: 'INSERT';
    previousData: null;
}
export interface RxChangeEventUpdate<DocType = any> extends RxChangeEvent<DocType> {
    operation: 'UPDATE';
}
export interface RxChangeEventDelete<DocType = any> extends RxChangeEvent<DocType> {
    operation: 'DELETE';
}
export declare function changeEventfromPouchChange<DocType>(changeDoc: any, collection: RxCollection, startTime: number, // time when the event was streamed out of pouchdb
endTime: number): RxChangeEvent<DocType>;
export declare function createInsertEvent<RxDocumentType>(collection: RxCollection<RxDocumentType>, docData: RxDocumentTypeWithRev<RxDocumentType>, startTime: number, endTime: number, doc?: RxDocument<RxDocumentType>): RxChangeEvent<RxDocumentType>;
export declare function createUpdateEvent<RxDocumentType>(collection: RxCollection<RxDocumentType>, docData: RxDocumentTypeWithRev<RxDocumentType>, previous: RxDocumentType, startTime: number, endTime: number, rxDocument: RxDocument<RxDocumentType>): RxChangeEvent<RxDocumentType>;
export declare function createDeleteEvent<RxDocumentType>(collection: RxCollection<RxDocumentType>, docData: RxDocumentTypeWithRev<RxDocumentType>, previous: RxDocumentType, startTime: number, endTime: number, rxDocument: RxDocument<RxDocumentType>): RxChangeEvent<RxDocumentType>;
export declare function isInstanceOf(obj: RxChangeEvent<any> | any): boolean;

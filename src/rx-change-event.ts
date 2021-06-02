/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import {
    WriteOperation,
    ChangeEvent as EventReduceChangeEvent
} from 'event-reduce-js';
import { pouchSwapIdToPrimary } from './rx-storage-pouchdb';

import type {
    RxCollection,
    RxDocument,
    RxDocumentData
} from './types';
import { flatClone } from './util';

export type RxChangeEventJson<DocType = any> = {
    operation: WriteOperation;
    documentId: string;
    documentData: RxDocumentData<DocType>;
    previousData?: DocType;
    databaseToken: string;
    collectionName: string;
    isLocal: boolean;
    startTime?: number;
    endTime?: number;
};

export type RxChangeEventBroadcastChannelData = {
    cE: RxChangeEventJson,
    storageToken: string
};

export class RxChangeEvent<DocType = any> {

    constructor(
        public readonly operation: WriteOperation,
        public readonly documentId: string,
        public readonly documentData: RxDocumentData<DocType>,
        public readonly databaseToken: string,
        public readonly collectionName: string,
        public readonly isLocal: boolean,
        /**
         * timestam on when the operation was triggered
         * and when it was finished
         * This is optional because we do not have this time
         * for events that come from pouchdbs changestream.
         */
        public startTime?: number,
        public endTime?: number,
        public readonly previousData?: DocType | null,
        public readonly rxDocument?: RxDocument<DocType>
    ) { }

    isIntern(): boolean {
        if (this.collectionName && this.collectionName.charAt(0) === '_') {
            return true;
        } else {
            return false;
        }
    }

    toJSON(): RxChangeEventJson<DocType> {
        const ret: RxChangeEventJson<DocType> = {
            operation: this.operation,
            documentId: this.documentId,
            documentData: this.documentData,
            previousData: this.previousData ? this.previousData : undefined,
            databaseToken: this.databaseToken,
            collectionName: this.collectionName,
            isLocal: this.isLocal,
            startTime: this.startTime,
            endTime: this.endTime
        };
        return ret;
    }

    toEventReduceChangeEvent(): EventReduceChangeEvent<DocType> {
        switch (this.operation) {
            case 'INSERT':
                return {
                    operation: this.operation,
                    id: this.documentId,
                    doc: this.documentData,
                    previous: null
                };
            case 'UPDATE':
                return {
                    operation: this.operation,
                    id: this.documentId,
                    doc: this.documentData,
                    previous: this.previousData ? this.previousData : 'UNKNOWN'
                };
            case 'DELETE':
                return {
                    operation: this.operation,
                    id: this.documentId,
                    doc: null,
                    previous: this.previousData as DocType
                };
        }
    }
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


export function changeEventfromPouchChange<DocType>(
    changeDoc: any,
    collection: RxCollection,
    startTime: number, // time when the event was streamed out of pouchdb
    endTime: number, // time when the event was streamed out of pouchdb
    handleFromPouch = true
): RxChangeEvent<DocType> {
    let operation: WriteOperation = changeDoc._rev.startsWith('1-') ? 'INSERT' : 'UPDATE';
    if (changeDoc._deleted) {
        operation = 'DELETE';
    }

    // decompress / primarySwap
    let doc: RxDocumentData<DocType> = handleFromPouch ? collection._handleFromPouch(changeDoc) : flatClone(changeDoc);
    doc = pouchSwapIdToPrimary(collection.schema.primaryPath, doc);

    const documentId: string = (doc as any)[collection.schema.primaryPath] as string;
    const changeEvent = new RxChangeEvent<DocType>(
        operation,
        documentId,
        doc,
        collection.database.token,
        collection.name,
        false,
        startTime,
        endTime
    );

    return changeEvent;
}


export function createInsertEvent<RxDocumentType>(
    collection: RxCollection<RxDocumentType>,
    docData: RxDocumentData<RxDocumentType>,
    startTime: number,
    endTime: number,
    doc?: RxDocument<RxDocumentType>
): RxChangeEvent<RxDocumentType> {
    // TODO remove this checks after rx-storage is migrated
    if (!docData._rev) {
        throw new Error('_rev missing');
    }
    const primary = (docData as any)[collection.schema.primaryPath];
    if (!primary) {
        throw new Error('primary missing ' + collection.schema.primaryPath);
    }

    const ret = new RxChangeEvent<RxDocumentType>(
        'INSERT',
        (docData as any)[collection.schema.primaryPath],
        docData,
        collection.database.token,
        collection.name,
        false,
        startTime,
        endTime,
        null,
        doc
    );
    return ret;

}

export function createUpdateEvent<RxDocumentType>(
    collection: RxCollection<RxDocumentType>,
    docData: RxDocumentData<RxDocumentType>,
    previous: RxDocumentType,
    startTime: number,
    endTime: number,
    rxDocument: RxDocument<RxDocumentType>
): RxChangeEvent<RxDocumentType> {
    return new RxChangeEvent<RxDocumentType>(
        'UPDATE',
        (docData as any)[collection.schema.primaryPath],
        docData,
        collection.database.token,
        collection.name,
        false,
        startTime,
        endTime,
        previous,
        rxDocument
    );
}

export function createDeleteEvent<RxDocumentType>(
    collection: RxCollection<RxDocumentType>,
    docData: RxDocumentData<RxDocumentType>,
    previous: RxDocumentType,
    startTime: number,
    endTime: number,
    rxDocument: RxDocument<RxDocumentType>
): RxChangeEvent<RxDocumentType> {
    return new RxChangeEvent<RxDocumentType>(
        'DELETE',
        (docData as any)[collection.schema.primaryPath],
        docData,
        collection.database.token,
        collection.name,
        false,
        startTime,
        endTime,
        previous,
        rxDocument
    );
}

export function isInstanceOf(obj: RxChangeEvent<any> | any): boolean {
    return obj instanceof RxChangeEvent;
}

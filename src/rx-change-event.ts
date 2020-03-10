/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import {
    WriteOperation
} from 'event-reduce-js';

import {
    RxCollection,
    RxDocument
} from './types';
import { RxCollectionBase } from './rx-collection';


export type RxChangeEventJson<DocType = any> = {
    operation: WriteOperation,
    documentId: string,
    documentData: DocType
    previousData?: DocType,
    databaseToken: string,
    collectionName: string,
    isLocal: boolean
};

export type RxChangeEventBroadcastChannelData = {
    cE: RxChangeEventJson,
    storageToken: string
};

export class RxChangeEvent<DocType = any> {
    public readonly time: number = new Date().getTime();

    constructor(
        public readonly operation: WriteOperation,
        public readonly documentId: string,
        public readonly documentData: DocType,
        public readonly databaseToken: string,
        public readonly collectionName: string,
        public readonly isLocal: boolean,
        public readonly previousData?: DocType | null,
        public readonly rxDocument?: RxDocument<DocType>
    ) { }

    toJSON(): RxChangeEventJson<DocType> {
        const ret: RxChangeEventJson<DocType> = {
            operation: this.operation,
            documentId: this.documentId,
            documentData: this.documentData,
            previousData: this.previousData ? this.previousData : undefined,
            databaseToken: this.databaseToken,
            collectionName: this.collectionName,
            isLocal: this.isLocal
        };
        return ret;
    }

    isIntern(): boolean {
        if (this.collectionName && this.collectionName.charAt(0) === '_') {
            return true;
        } else {
            return false;
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
    collection: RxCollection
): RxChangeEvent<DocType> {
    let operation: WriteOperation = changeDoc._rev.startsWith('1-') ? 'INSERT' : 'UPDATE';
    if (changeDoc._deleted) {
        operation = 'DELETE';
    }

    // decompress / primarySwap
    const doc: DocType = collection._handleFromPouch(changeDoc);
    const documentId: string = (doc as any)[collection.schema.primaryPath] as string;

    const cE = new RxChangeEvent<DocType>(
        operation,
        documentId,
        doc,
        collection.database.token,
        collection.name,
        false
    );
    return cE;
}


export function createInsertEvent<RxDocumentType>(
    collection: RxCollectionBase<RxDocumentType>,
    docData: RxDocumentType,
    doc?: RxDocument<RxDocumentType>
): RxChangeEvent<RxDocumentType> {
    return new RxChangeEvent<RxDocumentType>(
        'INSERT',
        (docData as any)[collection.schema.primaryPath],
        docData,
        collection.database.token,
        collection.name,
        false,
        doc
    );
}

export function createUpdateEvent<RxDocumentType>(
    collection: RxCollectionBase<RxDocumentType>,
    docData: RxDocumentType,
    previous: RxDocumentType,
    rxDocument: RxDocument<RxDocumentType>
): RxChangeEvent<RxDocumentType> {
    return new RxChangeEvent<RxDocumentType>(
        'UPDATE',
        (docData as any)[collection.schema.primaryPath],
        docData,
        collection.database.token,
        collection.name,
        false,
        previous,
        rxDocument
    );
}

export function createDeleteEvent<RxDocumentType>(
    collection: RxCollectionBase<RxDocumentType>,
    docData: RxDocumentType,
    previous: RxDocumentType,
    rxDocument: RxDocument<RxDocumentType>
): RxChangeEvent<RxDocumentType> {
    return new RxChangeEvent<RxDocumentType>(
        'DELETE',
        (docData as any)[collection.schema.primaryPath],
        docData,
        collection.database.token,
        collection.name,
        false,
        previous,
        rxDocument
    );
}

export function isInstanceOf(obj: RxChangeEvent<any> | any): boolean {
    return obj instanceof RxChangeEvent;
}

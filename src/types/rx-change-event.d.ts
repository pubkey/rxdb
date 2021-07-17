import { DeepReadonly } from './util';

export type RxChangeEventBase = {
    readonly eventId: string;
    readonly documentId: string;
    readonly databaseToken: string;

    // optional does not exist on changes to localdocs of the database
    readonly collectionName?: string;

    // true if the event is about a local document, false if not.
    readonly isLocal: boolean;

    /**
     * Unix timestamp in milliseconds of when the operation was triggered
     * and when it was finished.
     * This is optional because we do not have this time
     * for events that come from the internal storage instance changestream.
     */
    readonly startTime?: number;
    readonly endTime?: number;
}

export type RxChangeEventInsert<DocType> = RxChangeEventBase & {
    operation: 'INSERT';
    documentData: DeepReadonly<DocType>;
    previousDocumentData: null;
}

export type RxChangeEventUpdate<DocType> = RxChangeEventBase & {
    operation: 'UPDATE';
    documentData: DeepReadonly<DocType>;
    previousDocumentData: DeepReadonly<DocType> | 'UNKNOWN';
}

export type RxChangeEventDelete<DocType> = RxChangeEventBase & {
    operation: 'DELETE';
    documentData: null;
    previousDocumentData: DeepReadonly<DocType> | 'UNKNOWN';
}

// TODO remove =any
export type RxChangeEvent<DocType = any> = RxChangeEventInsert<DocType> | RxChangeEventUpdate<DocType> | RxChangeEventDelete<DocType>;

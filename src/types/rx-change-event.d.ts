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
    startTime?: number;
    endTime?: number;
}

export type RxChangeEventInsert<DocType> = RxChangeEventBase & {
    operation: 'INSERT';
    documentData: DocType;
}

export type RxChangeEventUpdate<DocType> = RxChangeEventBase & {
    operation: 'UPDATE';
    documentData: DocType;
    previousDocumentData: DocType | 'UNKNOWN';
}

export type RxChangeEventDelete<DocType> = RxChangeEventBase & {
    operation: 'DELETE';
    previousDocumentData: DocType | 'UNKNOWN';
}

// TODO remove =any
export type RxChangeEvent<DocType = any> = RxChangeEventInsert<DocType> | RxChangeEventUpdate<DocType> | RxChangeEventDelete<DocType>;

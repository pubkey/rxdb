import type {
    EventBulk,
    RxDocumentData
} from './rx-storage.d.ts';


export type RxChangeEventBase<RxDocType> = {
    operation: 'INSERT' | 'UPDATE' | 'DELETE';

    readonly documentId: string;

    // optional, does not exist on changes to localdocs of the database
    readonly collectionName?: string;

    // true if the event is about a local document, false if not.
    readonly isLocal: boolean;

    documentData: RxDocumentData<RxDocType>;
};

export type RxChangeEventInsert<RxDocType> = RxChangeEventBase<RxDocType> & {
    operation: 'INSERT';
    previousDocumentData: undefined;
};

export type RxChangeEventUpdate<RxDocType> = RxChangeEventBase<RxDocType> & {
    operation: 'UPDATE';
    previousDocumentData: RxDocumentData<RxDocType>;
};

export type RxChangeEventDelete<RxDocType> = RxChangeEventBase<RxDocType> & {
    operation: 'DELETE';
    previousDocumentData: RxDocumentData<RxDocType>;
};

export type RxChangeEvent<RxDocType> = RxChangeEventInsert<RxDocType> | RxChangeEventUpdate<RxDocType> | RxChangeEventDelete<RxDocType>;

/**
 * Internally, all events are processed via bulks
 * to save performance when sending them over a transport layer
 * or de-duplicating them.
 */
export type RxChangeEventBulk<DocType> = EventBulk<RxChangeEvent<DocType>, any> & {
    // optional, not given for changes to local documents of a RxDatabase.
    collectionName?: string;
    /**
     * Token of the database instance that created the events.
     * Used to determine if the events came from another instance over the BroadcastChannel.
     */
    databaseToken: string;
    /**
     * The storageToken of the RxDatabase that created the events.
     * Used to ensure we do not process events of other RxDatabases.
     */
    storageToken: string;
    /**
     * If true, the events belong to some internal stuff like from plugins.
     * Internal events are not emitted to the outside over the .$ Observables.
     */
    internal: boolean;
};

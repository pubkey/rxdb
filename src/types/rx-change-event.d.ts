import { EventBulk, RxDocumentData } from './rx-storage';
import { DeepReadonly } from './util';

export type RxChangeEventBase = {
    readonly eventId: string;
    readonly documentId: string;

    // optional, does not exist on changes to localdocs of the database
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
    documentData: DeepReadonly<RxDocumentData<DocType>>;
    previousDocumentData: null;
}

export type RxChangeEventUpdate<DocType> = RxChangeEventBase & {
    operation: 'UPDATE';
    documentData: DeepReadonly<RxDocumentData<DocType>>;
    previousDocumentData: DeepReadonly<RxDocumentData<DocType>> | 'UNKNOWN';
}

export type RxChangeEventDelete<DocType> = RxChangeEventBase & {
    operation: 'DELETE';
    documentData: null;
    previousDocumentData: DeepReadonly<RxDocumentData<DocType>> | 'UNKNOWN';
}

export type RxChangeEvent<DocType> = RxChangeEventInsert<DocType> | RxChangeEventUpdate<DocType> | RxChangeEventDelete<DocType>;

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
}

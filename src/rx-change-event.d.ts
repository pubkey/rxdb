/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
import type { ChangeEvent as EventReduceChangeEvent } from 'event-reduce-js';
import type { EventBulk, RxChangeEvent, RxChangeEventBulk, RxDocumentData, RxStorageChangeEvent } from './types/index.d.ts';
export declare function getDocumentDataOfRxChangeEvent<T>(rxChangeEvent: RxStorageChangeEvent<T>): RxDocumentData<T>;
/**
 * Might return null which means an
 * already deleted document got modified but still is deleted.
 * These kind of events are not relevant for the event-reduce algorithm
 * and must be filtered out.
 */
export declare function rxChangeEventToEventReduceChangeEvent<DocType>(rxChangeEvent: RxStorageChangeEvent<DocType>): EventReduceChangeEvent<DocType> | null;
/**
 * Flattens the given events into a single array of events.
 * Used mostly in tests.
 */
export declare function flattenEvents<EventType>(input: EventBulk<EventType, any> | EventBulk<EventType, any>[] | EventType | EventType[]): EventType[];
export declare function rxChangeEventBulkToRxChangeEvents(eventBulk: RxChangeEventBulk<any>): RxChangeEvent<any>[];

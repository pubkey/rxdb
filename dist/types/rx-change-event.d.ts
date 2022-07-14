/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
import { ChangeEvent as EventReduceChangeEvent } from 'event-reduce-js';
import type { EventBulk, RxChangeEvent, RxDocumentData } from './types';
export declare function getDocumentDataOfRxChangeEvent<T>(rxChangeEvent: RxChangeEvent<T>): RxDocumentData<T>;
export declare function rxChangeEventToEventReduceChangeEvent<DocType>(rxChangeEvent: RxChangeEvent<DocType>): EventReduceChangeEvent<DocType>;
/**
 * Flattens the given events into a single array of events.
 * Used mostly in tests.
 */
export declare function flattenEvents<EventType>(input: EventBulk<EventType, any> | EventBulk<EventType, any>[] | EventType | EventType[]): EventType[];

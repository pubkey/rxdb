/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */
import { ChangeEvent as EventReduceChangeEvent } from 'event-reduce-js';
import type { RxChangeEvent } from './types';
export declare type RxChangeEventBroadcastChannelData = {
    cE: RxChangeEvent<any>;
    storageToken: string;
};
export declare function getDocumentDataOfRxChangeEvent<T>(rxChangeEvent: RxChangeEvent<T>): T;
export declare function isRxChangeEventIntern(rxChangeEvent: RxChangeEvent<any>): boolean;
export declare function rxChangeEventToEventReduceChangeEvent<DocType>(rxChangeEvent: RxChangeEvent<DocType>): EventReduceChangeEvent<DocType>;

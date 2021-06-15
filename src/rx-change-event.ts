/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import {
    ChangeEvent as EventReduceChangeEvent,
} from 'event-reduce-js';

import type {
    RxChangeEvent
} from './types';
import { deepFreezeWhenDevMode } from './util';

export type RxChangeEventBroadcastChannelData = {
    cE: RxChangeEvent<any>,
    storageToken: string
};

export function getDocumentDataOfRxChangeEvent<T>(
    rxChangeEvent: RxChangeEvent<T>
): T {
    if ((rxChangeEvent as any).documentData) {
        return (rxChangeEvent as any).documentData;
    } else {
        return (rxChangeEvent as any).previousDocumentData;
    }

}

export function isRxChangeEventIntern(
    rxChangeEvent: RxChangeEvent<any>
): boolean {
    if (rxChangeEvent.collectionName && rxChangeEvent.collectionName.charAt(0) === '_') {
        return true;
    } else {
        return false;
    }
}


export function rxChangeEventToEventReduceChangeEvent<DocType>(
    rxChangeEvent: RxChangeEvent<DocType>
): EventReduceChangeEvent<DocType> {
    switch (rxChangeEvent.operation) {
        case 'INSERT':
            return {
                operation: rxChangeEvent.operation,
                id: rxChangeEvent.documentId,
                doc: rxChangeEvent.documentData as any,
                previous: null
            };
        case 'UPDATE':
            return {
                operation: rxChangeEvent.operation,
                id: rxChangeEvent.documentId,
                doc: deepFreezeWhenDevMode(rxChangeEvent.documentData) as any,
                previous: rxChangeEvent.previousDocumentData ? rxChangeEvent.previousDocumentData as any : 'UNKNOWN'
            };
        case 'DELETE':
            return {
                operation: rxChangeEvent.operation,
                id: rxChangeEvent.documentId,
                doc: null,
                previous: rxChangeEvent.previousDocumentData as DocType
            };
    }
}

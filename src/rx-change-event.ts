/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import type {
    ChangeEvent as EventReduceChangeEvent,
} from 'event-reduce-js';
import { overwritable } from './overwritable.ts';

import type {
    EventBulk,
    RxChangeEvent,
    RxDocumentData
} from './types/index.d.ts';
import { appendToArray } from './plugins/utils/index.ts';

export function getDocumentDataOfRxChangeEvent<T>(
    rxChangeEvent: RxChangeEvent<T>
): RxDocumentData<T> {
    if ((rxChangeEvent as any).documentData) {
        return (rxChangeEvent as any).documentData;
    } else {
        return (rxChangeEvent as any).previousDocumentData;
    }
}

/**
 * Might return null which means an
 * already deleted document got modified but still is deleted.
 * These kind of events are not relevant for the event-reduce algorithm
 * and must be filtered out.
 */
export function rxChangeEventToEventReduceChangeEvent<DocType>(
    rxChangeEvent: RxChangeEvent<DocType>
): EventReduceChangeEvent<DocType> | null {
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
                doc: overwritable.deepFreezeWhenDevMode(rxChangeEvent.documentData) as any,
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

/**
 * Flattens the given events into a single array of events.
 * Used mostly in tests.
 */
export function flattenEvents<EventType>(
    input: EventBulk<EventType, any> | EventBulk<EventType, any>[] | EventType | EventType[]
): EventType[] {
    const output: EventType[] = [];
    if (Array.isArray(input)) {
        input.forEach(inputItem => {
            const add = flattenEvents(inputItem);
            appendToArray(output, add);
        });
    } else {
        if ((input as any).id && (input as any).events) {
            // is bulk
            (input as EventBulk<EventType, any>)
                .events
                .forEach(ev => output.push(ev));
        } else {
            output.push(input as any);
        }
    }

    const usedIds = new Set<string>();
    const nonDuplicate: EventType[] = [];

    function getEventId(ev: any): string {
        return [
            ev.documentId,
            ev.documentData ? ev.documentData._rev : '',
            ev.previousDocumentData ? ev.previousDocumentData._rev : ''
        ].join('|');
    }

    output.forEach(ev => {
        const eventId = getEventId(ev);
        if (!usedIds.has(eventId)) {
            usedIds.add(eventId);
            nonDuplicate.push(ev);
        }
    });

    return nonDuplicate;
}

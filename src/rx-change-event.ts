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
    RxChangeEventBulk,
    RxStorageChangeEvent
} from './types/index.d.ts';
import { getFromMapOrCreate } from './plugins/utils/index.ts';
import { newRxError } from './rx-error.ts';

export function rxChangeEventToEventReduceChangeEvent<DocType>(
    rxChangeEvent: RxStorageChangeEvent<DocType>
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
            /**
             * TODO remove this dev-mode check in the next major version,
             * see orga/before-next-major.md
             */
            if (
                overwritable.isDevMode() &&
                !rxChangeEvent.previousDocumentData
            ) {
                throw newRxError('CE1', {
                    args: {
                        documentId: rxChangeEvent.documentId,
                        documentData: rxChangeEvent.documentData
                    }
                });
            }
            return {
                operation: rxChangeEvent.operation,
                id: rxChangeEvent.documentId,
                doc: overwritable.deepFreezeWhenDevMode(rxChangeEvent.documentData) as any,
                previous: rxChangeEvent.previousDocumentData as DocType
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
    let output: EventType[] = [];
    if (Array.isArray(input)) {
        input.forEach(inputItem => {
            const add = flattenEvents(inputItem);
            output = output.concat(add);
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

const EVENT_BULK_CACHE = new Map<RxChangeEventBulk<any>, RxChangeEvent<any>[]>();
export function rxChangeEventBulkToRxChangeEvents(
    eventBulk: RxChangeEventBulk<any>
) {
    return getFromMapOrCreate(
        EVENT_BULK_CACHE,
        eventBulk,
        () => {
            const events: RxChangeEvent<any>[] = new Array(eventBulk.events.length);
            const rawEvents = eventBulk.events;
            const collectionName = eventBulk.collectionName;
            const isLocal = eventBulk.isLocal;
            const deepFreezeWhenDevMode = overwritable.deepFreezeWhenDevMode;
            for (let index = 0; index < rawEvents.length; index++) {
                const event = rawEvents[index];
                events[index] = {
                    documentId: event.documentId,
                    collectionName,
                    isLocal,
                    operation: event.operation,
                    documentData: deepFreezeWhenDevMode(event.documentData) as any,
                    previousDocumentData: deepFreezeWhenDevMode(event.previousDocumentData) as any
                };
            }
            return events;
        }
    );
}

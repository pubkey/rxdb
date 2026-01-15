import { type Observable, Subject } from 'rxjs';
import type {
    RxCollection,
    RxDatabase,
    RxPlugin,
} from '../../types/index.d.ts';

export type RxCollectionCreatedEvent = {
    type: 'CREATED';
    collection: RxCollection;
    name: string;
};

export type RxCollectionRemovedEvent = {
    type: 'REMOVED';
    name: string;
};

export type RxCollectionEvent =
    | RxCollectionCreatedEvent
    | RxCollectionRemovedEvent;

export type RxDatabaseCollections$ = {
    collections$: Observable<RxCollectionEvent>;
};

const collectionsEvents = new Subject<RxCollectionEvent>();

export const RxDbReactPlugin: RxPlugin = {
    name: 'react',
    rxdb: true,
    hooks: {
        createRxCollection: {
            after: ({ collection }) =>
                collectionsEvents.next({
                    type: 'CREATED',
                    collection: collection,
                    name: collection.name,
                }),
        },
        postRemoveRxCollection: {
            after: ({ collectionName }) =>
                collectionsEvents.next({
                    type: 'REMOVED',
                    name: collectionName,
                }),
        },
    },
    prototypes: {
        RxDatabase: (proto: RxDatabase) => {
            const extended = proto as RxDatabase & RxDatabaseCollections$;
            extended.collections$ = collectionsEvents.asObservable();
        },
    },
};

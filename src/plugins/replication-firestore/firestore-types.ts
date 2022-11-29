import {
    ById,
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions,
    StringKeys
} from '../../types';

import {
    CollectionReference,
    Firestore,
    getFirestore
} from 'firebase/firestore';

export type FirestoreCheckpointType = {
    updateSortValue: string;
};
export type FirestoreCollection<RxDocType> = CollectionReference<RxDocType>;

export type FirestoreOptions<RxDocType> = {
    projectId: string;
    collection: FirestoreCollection<RxDocType>;
    database: Firestore;
};

export type SyncOptionsFirestore<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push' | 'replicationIdentifier' | 'collection'
> & {
    firestore: FirestoreOptions<RxDocType>;
    /**
     * In firestore it is not possible to read out
     * the internally used write timestamp.
     * Even if we could read it out, it is not indexed which
     * is required for fetch 'changes-since-x'.
     * So instead we have to rely on a custom user defined field
     * that is a compound string of [unix-timetamp]+[document.primary]
     * @link https://groups.google.com/g/firebase-talk/c/tAmPzPei-mE
     */
    updateSortField: StringKeys<RxDocType>;
    pull?: Omit<ReplicationPullOptions<RxDocType, FirestoreCheckpointType>, 'handler' | 'stream$'> & {
        /**
         * Heartbeat time in milliseconds
         * for the long polling of the changestream.
         */
        heartbeat?: number;
    };
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};

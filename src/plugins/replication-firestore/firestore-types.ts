import {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types';

import {
    CollectionReference,
    Firestore
} from 'firebase/firestore';

export type FirestoreCheckpointType = {
    id: string;
    /**
     * Firestore internally sets the time to an object like
     * {
     *       "seconds": 1669807105,
     *       "nanoseconds": 476000000
     * }
     * But to be able to query that, we have to use a date string
     * like '2022-11-30T11:18:25.141Z'
     * so we store that string instead.
     */
    serverTimestamp: string;
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
     * that contains the server time which is set by firestore via serverTimestamp()
     * IMPORTANT: The serverTimestampField MUST NOT be part of the collections RxJsonSchema!
     * [default='serverTimestamp']
     * @link https://groups.google.com/g/firebase-talk/c/tAmPzPei-mE
     */
    serverTimestampField?: string;
    pull?: Omit<ReplicationPullOptions<RxDocType, FirestoreCheckpointType>, 'handler' | 'stream$'>;
    push?: Omit<ReplicationPushOptions<RxDocType>, 'handler'>;
};

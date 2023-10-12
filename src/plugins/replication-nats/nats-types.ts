import type {
    ReplicationOptions,
    ReplicationPullOptions,
    ReplicationPushOptions
} from '../../types/index.d.ts';


import {
    ConnectionOptions
} from 'nats';


export type NatsCheckpointType = {
    sequence: number;
};

export type NatsSyncPullOptions<RxDocType> =
    Omit<ReplicationPullOptions<RxDocType, NatsCheckpointType>, 'handler' | 'stream$'>
    & {
    };

export type NatsSyncPushOptions<RxDocType> = Omit<ReplicationPushOptions<RxDocType>, 'handler'>
    & {
};

export type NatsSyncOptions<RxDocType> = Omit<
    ReplicationOptions<RxDocType, any>,
    'pull' | 'push'
> & {

    connection: ConnectionOptions;
    streamName: string;
    /**
     * NATS subject prefix like 'foo.bar'
     * which means a message for a document would have the subject
     * 'foo.bar.myDoc' where the last part 'myDoc' would be the primaryKey in
     * the RxDB document.
     * @link https://docs.nats.io/nats-concepts/subjects
     */
    subjectPrefix: string;
    pull?: NatsSyncPullOptions<RxDocType>;
    push?: NatsSyncPushOptions<RxDocType>;
};

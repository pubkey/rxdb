import type {
    RxReplicationWriteToMasterRow,
} from '../../types';

export class RxReplicationPullError<CheckpointType> extends Error {
    public readonly type = 'pull';
    constructor(
        public readonly message: string,
        /**
         * The checkpoint of the response from the last successfull
         * pull by the client.
         * Null if there was no pull operation before
         * so that there is no last pulled checkpoint.
         */
        public readonly latestPulledDocument: CheckpointType | null,
        public readonly innerErrors?: any
    ) {
        super(message);
    }
}

export class RxReplicationPushError<RxDocType> extends Error {
    public readonly type = 'push';
    constructor(
        public readonly message: string,
        /**
         * The documents that failed to be pushed.
         * Typed as 'any' because they might be modified by the push modifier.
         */
        public readonly pushRows: RxReplicationWriteToMasterRow<RxDocType>[],
        public readonly innerErrors?: any
    ) {
        super(message);
    }
}

export type RxReplicationError<RxDocType, CheckpointType> = RxReplicationPullError<CheckpointType> | RxReplicationPushError<RxDocType>;

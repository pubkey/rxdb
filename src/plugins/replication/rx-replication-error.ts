import type {
    RxDocumentData,
} from '../../types';

export class RxReplicationPullError<RxDocType> extends Error {
    public readonly type = 'pull';
    constructor(
        public readonly message: string,
        /**
         * The last pulled document that exists on the client.
         * Null if there was no pull operation before
         * so that there is no last pulled document.
         */
        public readonly latestPulledDocument: RxDocumentData<RxDocType> | null,
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
         */
        public readonly documentsData: RxDocumentData<RxDocType>[],
        public readonly innerErrors?: any
    ) {
        super(message);
    }
}

export type RxReplicationError<RxDocType> = RxReplicationPullError<RxDocType> | RxReplicationPushError<RxDocType>;

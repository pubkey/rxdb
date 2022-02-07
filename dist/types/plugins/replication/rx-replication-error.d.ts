import type { RxDocumentData } from '../../types';
export declare class RxReplicationPullError<RxDocType> extends Error {
    readonly message: string;
    /**
     * The last pulled document that exists on the client.
     * Null if there was no pull operation before
     * so that there is no last pulled document.
     */
    readonly latestPulledDocument: RxDocumentData<RxDocType> | null;
    readonly innerErrors?: any;
    readonly type = "pull";
    constructor(message: string, 
    /**
     * The last pulled document that exists on the client.
     * Null if there was no pull operation before
     * so that there is no last pulled document.
     */
    latestPulledDocument: RxDocumentData<RxDocType> | null, innerErrors?: any);
}
export declare class RxReplicationPushError<RxDocType> extends Error {
    readonly message: string;
    /**
     * The documents that failed to be pushed.
     */
    readonly documentsData: RxDocumentData<RxDocType>[];
    readonly innerErrors?: any;
    readonly type = "push";
    constructor(message: string, 
    /**
     * The documents that failed to be pushed.
     */
    documentsData: RxDocumentData<RxDocType>[], innerErrors?: any);
}
export declare type RxReplicationError<RxDocType> = RxReplicationPullError<RxDocType> | RxReplicationPushError<RxDocType>;

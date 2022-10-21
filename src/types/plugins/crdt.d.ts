import { MangoQuerySelector } from '../rx-query';
import { UpdateQuery } from './update';


export type CRDTEntry<RxDocType> = {
    selector?: MangoQuerySelector<RxDocType>;
    ifMatch?: UpdateQuery<RxDocType>;
    ifNotMatch?: UpdateQuery<RxDocType>;
};



export type CRDTOperation<RxDocType> = {
    body: CRDTEntry<RxDocType>[];
    /**
     * A string to uniquely represent the creator
     * of this operation.
     * Mostly you would use the RxDatabase().storageToken().
     */
    creator: string;

    /**
     * Unix time in milliseconds
     * that determines when the operation was created.
     * Used to properly clean up old operations.
     */
    time: number;
}


export type CRDTDocumentField<RxDocType> = {
    operations: {
        /**
         * Sorted by revision height.
         * If we have a conflict and need a rebuild,
         * the operations will be run in the revision height
         * sort order to make everything deterministic.
         */
        [revHeight: number]: CRDTOperation<RxDocType>[];
    }
}

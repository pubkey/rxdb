import type { MangoQuerySelector } from '../rx-query.d.ts';
import type { StringKeys } from '../util.d.ts';
import type { UpdateQuery } from './update.d.ts';


export type CRDTEntry<RxDocType> = {
    selector?: MangoQuerySelector<RxDocType>;
    ifMatch?: UpdateQuery<RxDocType>;
    ifNotMatch?: UpdateQuery<RxDocType>;
};

/**
 * Options for the crdt plugin.
 * We set these in the schema because changing them
 * is not possible on the fly because it would
 * close the document state in an unpredictable way.
 */
export type CRDTSchemaOptions<RxDocType> = {
    /**
     * Determines which field of the document must be used
     * to store the crdt operations.
     * The given field must exist with the content of "CRDT_FIELD_SCHEMA" in the
     * properties part of your schema.
     */
    field: StringKeys<RxDocType> | string;

    /**
     * After BOTH of the limits
     * maxOperations/maxTTL is reached,
     * the document will clean up the stored operations
     * and merged them together to ensure
     * that not too many operations are stored which could slow down the
     * database operations.
     */
    // TODO not implemented yet, make a pull request if you need that.
    // maxOperations: number;
    // maxTTL: number;
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
};


export type CRDTDocumentField<RxDocType> = {
    /**
     * An array with arrays of CRDT operations.
     * The index of the top level array is equal
     * to the revision height where the operations
     * belong to.
     * Sorted by revision height ascending.
     * If we have a conflict and we need a rebuild,
     * the operations will be run in the revision height
     * sort order to make everything deterministic.
     */
    operations: CRDTOperation<RxDocType>[][];

    /**
     * A hash to uniquely define the whole operations state.
     */
    hash: string;
};

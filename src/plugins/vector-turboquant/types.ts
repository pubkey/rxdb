import type {
    RxCollection,
    RxDocument,
    RxDocumentData
} from '../../types/index.d.ts';

export type TurboQuantVector = number[] | Float32Array | Float64Array;

/**
 * How many bits are used to store a single coordinate.
 * More bits means better recall and more storage usage.
 */
export type TurboQuantBitWidth = 1 | 2 | 4;

export type TurboQuantDistance = 'dotProduct' | 'cosine' | 'euclidean';

export type TurboQuantIndexOptions = {
    /**
     * Amount of dimensions of the vectors that are stored in the index.
     */
    dimensions: number;
    /**
     * (optional) [default=4]
     */
    bitWidth?: TurboQuantBitWidth;
    /**
     * Seed of the random rotation. Two indexes can only be
     * merged or compared when they use the same seed.
     * (optional) [default=1337]
     */
    seed?: number;
    /**
     * (optional) [default='cosine']
     */
    distance?: TurboQuantDistance;
};

export type TurboQuantSearchOptions = {
    /**
     * When set, only these ids can be returned by the search.
     * Use this to combine a vector search with a normal RxDB query.
     * (optional)
     */
    allowlist?: Iterable<string>;
    /**
     * Overwrite the distance method of the index for this single search.
     * (optional)
     */
    distance?: TurboQuantDistance;
};

export type TurboQuantSearchResult = {
    id: string;
    /**
     * Value of the used distance method.
     * For 'dotProduct' and 'cosine' a higher value means a better match,
     * for 'euclidean' a lower value means a better match.
     */
    score: number;
};

export type TurboQuantCodebook = {
    bitWidth: TurboQuantBitWidth;
    levels: number;
    /**
     * Decision boundaries between the buckets, length is levels - 1.
     */
    boundaries: Float64Array;
    /**
     * Reconstruction value of each bucket, length is levels.
     */
    centroids: Float64Array;
};

export type RxVectorIndexOptions<RxDocType> = TurboQuantIndexOptions & {
    /**
     * Must be unique per collection.
     */
    identifier: string;
    /**
     * Returns the vector of a document.
     * Return null to not store the document in the vector index.
     */
    embedding: (
        docData: RxDocumentData<RxDocType>
    ) => TurboQuantVector | null | undefined | Promise<TurboQuantVector | null | undefined>;
    /**
     * How many documents are read from the storage at once
     * while the index is filled initially.
     * (optional) [default=100]
     */
    batchSize?: number;
    /**
     * When set to a value greater than zero, the first N vectors are used
     * to calibrate the quantizer before the index is filled.
     * (optional) [default=0]
     */
    calibrationSampleSize?: number;
};

export type RxVectorIndexSearchResult<RxDocType> = TurboQuantSearchResult & {
    document: RxDocument<RxDocType>;
};

export type RxCollectionWithVectorIndex<RxDocType> = RxCollection<RxDocType> & {
    vectorIndexes?: Map<string, any>;
};

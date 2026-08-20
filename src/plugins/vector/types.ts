import type {
    RxCollection,
    RxDocument
} from '../../types/index.d.ts';

export type Vector = number[];

export type VectorDistanceFn = (a: Vector, b: Vector) => number;

export type VectorDistanceName = 'euclidean' | 'manhattan' | 'cosine' | 'jaccard';

/**
 * Describes a vector comparison function together with the value range
 * it can return. The range is needed to build the number indexes
 * that store the distance from a document to the sample vectors.
 */
export type VectorDistanceMeta = {
    fn: VectorDistanceFn;
    /**
     * true for similarity functions where a higher value means a closer match,
     * false for distance functions where a lower value means a closer match.
     */
    higherIsCloser: boolean;
    /**
     * Lowest value the function can return.
     */
    minimum: number;
    /**
     * Highest value the function can return.
     */
    maximum: number;
    /**
     * Index values are stored as integers to keep them exact.
     * The float value is multiplied with this factor and rounded.
     * A higher factor stores more decimal digits.
     */
    precision: number;
};

export type VectorIndexOptions = {
    /**
     * Object path of the field that stores the vector,
     * for example 'embedding' or 'data.embedding'.
     */
    vectorPath: string;
    /**
     * Amount of numbers each vector contains.
     */
    dimensions: number;
    /**
     * Amount of index fields to create. More indexes mean more precise
     * results and more storage usage.
     * (optional)
     * [default=5]
     */
    indexAmount?: number;
    /**
     * (optional)
     * [default='euclidean']
     */
    distance?: VectorDistanceName | VectorDistanceMeta;
    /**
     * The vectors that all documents are compared against.
     * By default they are derived from the seed so that every
     * client calculates exactly the same index values.
     * (optional)
     */
    sampleVectors?: Vector[];
    /**
     * Prefix of the generated index fields.
     * (optional)
     * [default='vectorIdx']
     */
    fieldPrefix?: string;
    /**
     * Seed for the default sample vectors.
     * (optional)
     * [default=1]
     */
    seed?: number;
};

export type VectorIndexOptionsFilled = {
    vectorPath: string;
    dimensions: number;
    indexAmount: number;
    distance: VectorDistanceMeta;
    sampleVectors: Vector[];
    fieldPrefix: string;
    seed: number;
};

export type VectorSearchResult<RxDocType> = {
    doc: RxDocument<RxDocType>;
    /**
     * Return value of the distance function for this document.
     */
    distance: number;
};

export type VectorSearchOptions = {
    /**
     * Amount of documents to return.
     * (optional)
     * [default=10]
     */
    limit?: number;
    /**
     * Amount of documents that are read per index and direction.
     * A higher value means more precise results and slower queries.
     * (optional)
     * [default=100]
     */
    docsPerIndexSide?: number;
};

export type VectorRangeSearchOptions = {
    /**
     * (optional)
     * [default=10]
     */
    limit?: number;
    /**
     * Documents are read when their index value lies within
     * this range around the index value of the query vector.
     */
    range: number;
};

export type VectorFullScanSearchOptions = {
    /**
     * (optional)
     * [default=10]
     */
    limit?: number;
};

export type RxVectorIndex<RxDocType = any> = {
    collection: RxCollection<RxDocType>;
    options: VectorIndexOptionsFilled;
    /**
     * Names of the generated index fields.
     */
    fields: string[];
    /**
     * Calculates the index values of a given vector.
     */
    getIndexValues(vector: Vector): { [field: string]: number; };
    /**
     * Approximate nearest neighbor search that reads
     * documents around the query vector from each index.
     */
    search(queryVector: Vector, options?: VectorSearchOptions): Promise<VectorSearchResult<RxDocType>[]>;
    /**
     * Approximate nearest neighbor search that reads all documents
     * whose index value lies within a fixed range around the query vector.
     */
    searchByRange(queryVector: Vector, options: VectorRangeSearchOptions): Promise<VectorSearchResult<RxDocType>[]>;
    /**
     * Exact nearest neighbor search that reads all documents of the collection.
     */
    searchFullScan(queryVector: Vector, options?: VectorFullScanSearchOptions): Promise<VectorSearchResult<RxDocType>[]>;
    /**
     * Writes the index values of all documents that do not have
     * the correct ones yet and returns the amount of changed documents.
     * Run this once when you add a vector index to a collection
     * that already contains documents.
     */
    reindex(batchSize?: number): Promise<number>;
    /**
     * Removes the hooks that keep the index fields up to date.
     */
    close(): void;
};

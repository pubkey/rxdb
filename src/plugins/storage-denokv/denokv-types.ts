import type { RxDocumentData } from "../../types/index.d.ts";

export type DenoKVSettings = {
    consistencyLevel: "strong" | "eventual";
    openKvPath?: string;
    batchSize?: number;
};
export type DenoKVStorageInternals<RxDocType> = {
    indexes: {
        [indexName: string]: DenoKVIndexMeta<RxDocType>;
    };
};

export type DenoKVIndexMeta<RxDocType> = {
    indexId: string;
    indexName: string;
    index: string[];
    getIndexableString: (doc: RxDocumentData<RxDocType>) => string;
};

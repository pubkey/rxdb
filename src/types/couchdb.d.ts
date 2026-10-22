/**
 * This file contains types that are CouchDB specific
 */

export type CouchChangeRow = {
    id: string;
    seq: number;
    deleted?: true;
    changes: {
        rev: 'string';
    }[];
    /**
     * only if include_docs === true
     */
    doc?: CouchChangeDoc;
};

export type CouchAttachmentMeta = {
    digest: string;
    content_type: string;
    length: number;
    stub: boolean;

    /**
     * 'revpos indicates the generation number (numeric prefix in the revID) at which the attachment was last altered'
     *  @link https://github.com/couchbase/couchbase-lite-ios/issues/1200#issuecomment-206444554
     */
    revpos: number;
};

export type CouchAttachmentWithData = CouchAttachmentMeta & {
    /**
     * Base64 string with the data
     * or directly a buffer
     */
    data: Blob;
    type: string;
    /**
     * If set, must be false
     * because we have the full data and not only a stub.
     */
    stub?: false;
};

export type CouchChangeDoc = {
    _id: string;
    _rev: string;
    /**
     * True if the document is deleted.
     */
    _deleted?: boolean;
    _attachments: {
        [attachmentId: string]: CouchAttachmentMeta;
    };
};

export type WithAttachments<Data> = Data & {
    /**
     * Intentional optional,
     * if the document has no attachments,
     * we do NOT have an empty object.
     */
    _attachments?: {
        [attachmentId: string]: CouchAttachmentMeta;
    };
};
export type WithAttachmentsData<Data> = Data & {
    /**
     * Intentional optional,
     * if the document has no attachments,
     * we do NOT have an empty object.
     */
    _attachments?: {
        [attachmentId: string]: CouchAttachmentWithData;
    };
};


export type CouchdbChangesResult = {
    results: CouchChangeRow[];
    last_seq: number;
};

export type CouchBulkDocResultRow = {
    ok: boolean;
    id: string;
    rev: string;

    error?: 'conflict';
    reason?: string;
};

export type CouchAllDocsResponse = {
    offset: number;
    rows: {
        id: string;
        doc: any;
        key: string;
        value: {
            rev: string;
            deleted?: boolean;
        };
        error?: 'not_found' | string;
    }[];
    total_rows: number;
};

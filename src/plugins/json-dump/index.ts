/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import {
    createRxQuery,
    queryCollection,
    _getDefaultQuery
} from '../../rx-query.ts';
import {
    newRxError
} from '../../rx-error.ts';
import type {
    RxDatabase,
    RxCollection,
    RxPlugin,
    RxDocumentData,
    RxDumpOptions,
    RxDumpImportConflictMode,
    RxDumpAttachmentData,
    RxAttachmentData,
    RxAttachmentWriteData,
    BulkWriteRow
} from '../../types/index.d.ts';
import {
    blobToBase64String,
    createBlobFromBase64,
    flatClone,
    getDefaultRevision,
    now
} from '../../plugins/utils/index.ts';

function dumpRxDatabase(
    this: RxDatabase,
    collectionsOrOptions?: string[] | RxDumpOptions,
    options?: RxDumpOptions
): Promise<any> {
    const collections = Array.isArray(collectionsOrOptions) ? collectionsOrOptions : undefined;
    const useOptions = Array.isArray(collectionsOrOptions) ? options : collectionsOrOptions;

    const json: any = {
        name: this.name,
        instanceToken: this.token,
        collections: []
    };

    const useCollections = Object.keys(this.collections)
        .filter(colName => !collections || collections.includes(colName))
        .filter(colName => colName.charAt(0) !== '_')
        .map(colName => this.collections[colName]);

    return Promise.all(
        useCollections
            .map(col => col.exportJSON(useOptions))
    ).then(cols => {
        json.collections = cols;
        return json;
    });
}

/**
 * Returns the current state of all documents of the dump
 * that already exist in the collection.
 * Deleted documents do not count as existing.
 */
async function getExistingDocumentsOfDump<RxDocType>(
    collection: RxCollection<RxDocType>,
    docs: any[]
): Promise<Map<string, RxDocumentData<RxDocType>>> {
    const primaryPath = collection.schema.primaryPath;
    const ret = new Map<string, RxDocumentData<RxDocType>>();
    if (docs.length === 0) {
        return ret;
    }
    const existing = await collection.storageInstance.findDocumentsById(
        docs.map(docData => docData[primaryPath]),
        false
    );
    existing.forEach(docData => ret.set((docData as any)[primaryPath], docData));
    return ret;
}

function throwOnIntersectingDocuments(
    collection: RxCollection,
    existingDocs: Map<string, any>
) {
    if (existingDocs.size > 0) {
        throw newRxError('JD4', {
            collection: collection.name,
            firstId: existingDocs.keys().next().value,
            args: {
                intersectingDocuments: existingDocs.size
            }
        });
    }
}

const importDumpRxDatabase = function (
    this: RxDatabase,
    dump: any,
    conflictMode: RxDumpImportConflictMode = 'skip'
) {
    /**
     * collections must be created before the import
     * because we do not know about the other collection-settings here
     */
    const missingCollections = dump.collections
        .filter((col: any) => !this.collections[col.name])
        .map((col: any) => col.name);
    if (missingCollections.length > 0) {
        throw newRxError('JD1', {
            missingCollections
        });
    }

    const importCollections = () => Promise.all(
        dump.collections
            .map((colDump: any) => this.collections[colDump.name].importJSON(colDump, conflictMode))
    );
    if (conflictMode !== 'abort') {
        return importCollections();
    }

    /**
     * All collections of the dump are checked
     * before the first collection is written.
     */
    return Promise.all(
        dump.collections.map((colDump: any) => getExistingDocumentsOfDump(
            this.collections[colDump.name],
            colDump.docs
        ))
    ).then(existingPerCollection => {
        existingPerCollection.forEach((existingDocs, index) => throwOnIntersectingDocuments(
            this.collections[dump.collections[index].name],
            existingDocs
        ));
        return importCollections();
    });
};

/**
 * Loads the data of all attachments of a single document
 * and returns them in a JSON friendly format where the
 * attachments data is stored as a base64 string.
 */
async function exportAttachmentsOfDocument(
    collection: RxCollection,
    documentId: string,
    attachments: { [attachmentId: string]: RxAttachmentData; }
): Promise<{ [attachmentId: string]: RxDumpAttachmentData; }> {
    const ret: { [attachmentId: string]: RxDumpAttachmentData; } = {};
    await Promise.all(
        Object.entries(attachments).map(async ([attachmentId, attachmentData]) => {
            const blob = await collection.storageInstance.getAttachmentData(
                documentId,
                attachmentId,
                attachmentData.digest
            );
            ret[attachmentId] = {
                type: attachmentData.type,
                length: blob.size,
                data: await blobToBase64String(blob)
            };
        })
    );
    return ret;
}

const dumpRxCollection = async function (
    this: RxCollection,
    options?: RxDumpOptions
) {
    const withAttachments = !!(options && options.attachments);
    const primaryPath = this.schema.primaryPath;
    const json: any = {
        name: this.name,
        schemaHash: await this.schema.hash,
        docs: []
    };

    const query = createRxQuery(
        'find',
        _getDefaultQuery(),
        this
    );
    const result = await queryCollection(query);
    json.docs = await Promise.all(
        result.docs.map(async (docData: any) => {
            const attachments = docData._attachments;
            docData = flatClone(docData);
            delete docData._rev;
            delete docData._attachments;
            if (
                withAttachments &&
                attachments &&
                Object.keys(attachments).length > 0
            ) {
                docData._attachments = await exportAttachmentsOfDocument(
                    this,
                    docData[primaryPath],
                    attachments
                );
            }
            return docData;
        })
    );
    return json;
};

/**
 * Transforms the base64 attachments of an exported document
 * back into the write format that the RxStorage expects.
 */
async function importAttachmentsOfDocument(
    collection: RxCollection,
    attachments: { [attachmentId: string]: RxDumpAttachmentData; }
): Promise<{ [attachmentId: string]: RxAttachmentWriteData; }> {
    const ret: { [attachmentId: string]: RxAttachmentWriteData; } = {};
    await Promise.all(
        Object.entries(attachments).map(async ([attachmentId, attachmentData]) => {
            const blob = await createBlobFromBase64(attachmentData.data, attachmentData.type);
            ret[attachmentId] = {
                type: attachmentData.type,
                length: blob.size,
                data: blob,
                /**
                 * The digest is recalculated because the hashFunction
                 * of the importing database can be a different one.
                 */
                digest: await collection.database.hashFunction(blob)
            };
        })
    );
    return ret;
}

async function importDumpRxCollection<RxDocType>(
    this: RxCollection<RxDocType>,
    exportedJSON: any,
    conflictMode: RxDumpImportConflictMode = 'skip'
): Promise<any> {
    // check schemaHash
    if (exportedJSON.schemaHash !== await this.schema.hash) {
        throw newRxError('JD2', {
            schemaHash: exportedJSON.schemaHash,
            own: this.schema.hash
        });
    }

    const primaryPath = this.schema.primaryPath;
    const existingDocs = await getExistingDocumentsOfDump<RxDocType>(this as any, exportedJSON.docs);
    if (conflictMode === 'abort') {
        throwOnIntersectingDocuments(this as any, existingDocs);
    }

    const docs: any[] = conflictMode === 'skip' ?
        exportedJSON.docs.filter((docData: any) => !existingDocs.has(docData[primaryPath])) :
        exportedJSON.docs;
    const rows: BulkWriteRow<RxDocType>[] = await Promise.all(
        docs.map(async (docData) => {
            const previous = existingDocs.get(docData[primaryPath]);
            let attachments: { [attachmentId: string]: RxAttachmentWriteData; } = {};
            if (docData._attachments) {
                const attachmentsJson = docData._attachments;
                docData = flatClone(docData);
                delete docData._attachments;
                attachments = await importAttachmentsOfDocument(this as any, attachmentsJson);
            }
            const document: RxDocumentData<RxDocType> = Object.assign(
                {},
                docData,
                {
                    _meta: {
                        lwt: now()
                    },
                    _rev: getDefaultRevision(),
                    _attachments: attachments,
                    _deleted: false
                }
            );
            if (previous) {
                /**
                 * In merge mode the document of the dump is written
                 * on top of the existing document like an upsert:
                 * The existing meta data and the existing attachments
                 * that are not in the dump are kept.
                 */
                document._meta = previous._meta;
                document._attachments = Object.assign(
                    {},
                    previous._attachments,
                    attachments
                );
                return {
                    previous,
                    document
                };
            }
            return {
                document
            };
        })
    );
    const writeResult = await this.storageInstance.bulkWrite(
        rows,
        'json-dump-import'
    );
    if (conflictMode === 'skip' && writeResult.error.length > 0) {
        /**
         * A document that was inserted by another write
         * while the import was running, is skipped too.
         */
        writeResult.error = writeResult.error.filter(error => error.status !== 409);
    }
    return writeResult;
}

export const RxDBJsonDumpPlugin: RxPlugin = {
    name: 'json-dump',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.exportJSON = dumpRxDatabase;
            proto.importJSON = importDumpRxDatabase;
        },
        RxCollection: (proto: any) => {
            proto.exportJSON = dumpRxCollection;
            proto.importJSON = importDumpRxCollection;
        }
    },
    overwritable: {}
};

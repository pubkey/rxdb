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
    RxDumpAttachmentData,
    RxAttachmentData,
    RxAttachmentWriteData
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

const importDumpRxDatabase = function (
    this: RxDatabase,
    dump: any
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

    return Promise.all(
        dump.collections
            .map((colDump: any) => this.collections[colDump.name].importJSON(colDump))
    );
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
    exportedJSON: any
): Promise<any> {
    // check schemaHash
    if (exportedJSON.schemaHash !== await this.schema.hash) {
        throw newRxError('JD2', {
            schemaHash: exportedJSON.schemaHash,
            own: this.schema.hash
        });
    }

    const docs: any[] = exportedJSON.docs;
    const rows = await Promise.all(
        docs.map(async (docData) => {
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
            return {
                document
            };
        })
    );
    return this.storageInstance.bulkWrite(
        rows as any,
        'json-dump-import'
    );
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

import { wrapRxStorageInstance } from '../../plugin-helpers.ts';
import type {
    RxStorage,
    RxStorageInstanceCreationParams,
    RxDocumentData,
    RxDocumentWriteData,
    CompressionMode,
    RxAttachmentWriteData
} from '../../types/index.d.ts';

import {
    ensureNotFalsy,
    flatClone
} from '../utils/index.ts';


/**
 * Default MIME type patterns that benefit from compression.
 * Types like images (JPEG, PNG, WebP), videos, and audio
 * are already compressed and should NOT be re-compressed.
 */
export const DEFAULT_COMPRESSIBLE_TYPES: string[] = [
    'text/*',
    'application/json',
    'application/xml',
    'application/xhtml+xml',
    'application/javascript',
    'application/x-javascript',
    'application/ecmascript',
    'application/rss+xml',
    'application/atom+xml',
    'application/soap+xml',
    'application/wasm',
    'application/x-yaml',
    'application/sql',
    'application/graphql',
    'application/ld+json',
    'application/manifest+json',
    'application/schema+json',
    'application/vnd.api+json',
    'image/svg+xml',
    'image/bmp',
    'font/ttf',
    'font/otf',
    'application/x-font-ttf',
    'application/x-font-otf',
    'application/pdf',
    'application/rtf',
    'application/x-sh',
    'application/x-csh',
    'application/x-httpd-php'
];

/**
 * Normalizes a MIME type by lowercasing it and stripping any
 * RFC 2045 parameters (everything after the first ';'), e.g.
 * 'application/json; charset=utf-8' -> 'application/json'.
 */
function normalizeMimeType(mimeType: string): string {
    const semicolonIndex = mimeType.indexOf(';');
    const withoutParams = semicolonIndex === -1 ? mimeType : mimeType.slice(0, semicolonIndex);
    return withoutParams.trim().toLowerCase();
}

/**
 * Checks if a given MIME type should be compressed,
 * based on a list of type patterns. Supports wildcard suffix matching
 * (e.g., 'text/*' matches 'text/plain', 'text/html', etc.).
 *
 * RFC 2045 parameters on the MIME type (e.g. '; charset=utf-8') are
 * stripped before matching, so 'application/json; charset=utf-8'
 * matches the 'application/json' pattern.
 *
 * Deterministic: same type + same pattern list = same answer.
 * No byte-level inspection needed.
 */
export function isCompressibleType(
    mimeType: string,
    compressibleTypes: string[]
): boolean {
    const lower = normalizeMimeType(mimeType);
    for (const pattern of compressibleTypes) {
        const lowerPattern = normalizeMimeType(pattern);
        if (lowerPattern.endsWith('/*')) {
            // 'text/*' -> 'text/', so startsWith matches all subtypes
            const prefix = lowerPattern.slice(0, -1);
            if (lower.startsWith(prefix)) {
                return true;
            }
        } else if (lower === lowerPattern) {
            return true;
        }
    }
    return false;
}


/**
 * Compress a Blob using streaming CompressionStream API.
 * @link https://github.com/WICG/compression/blob/main/explainer.md
 */
export async function compressBlob(
    mode: CompressionMode,
    blob: Blob
): Promise<Blob> {
    const stream = blob.stream().pipeThrough(new CompressionStream(mode));
    return new Response(stream).blob();
}

/**
 * Decompress a Blob using streaming DecompressionStream API.
 */
export async function decompressBlob(
    mode: CompressionMode,
    blob: Blob
): Promise<Blob> {
    const stream = blob.stream().pipeThrough(new DecompressionStream(mode));
    return new Response(stream).blob();
}


/**
 * Digest prefixes that mark an attachment as having been
 * stored with compression. Used by getAttachmentData to
 * determine whether decompression is needed.
 *
 * The stored digest of a compressed attachment is
 * COMPRESSED_HIDDEN_DIGEST_PREFIX + hash(originalData) and the stored length
 * is the length of the original data. The prefix only exists inside of the
 * wrapped storage. Everything above the wrapper works with the plain digest,
 * so that the attachment stubs of a document are equal to the stubs of
 * the same document on a replication master or on a collection without compression.
 *
 * Attachments with the COMPRESSED_DIGEST_PREFIX have the prefix as part of their
 * digest above the wrapper and their length is the length of the compressed data.
 * Such attachments exist in stored data and in the replication states
 * that belong to it, so they are passed through as they are.
 */
const COMPRESSED_DIGEST_PREFIX = 'c-';
const COMPRESSED_HIDDEN_DIGEST_PREFIX = 'c2-';

/**
 * A RxStorage wrapper that compresses attachment data on writes
 * and decompresses the data on reads.
 *
 * Only compresses attachments whose MIME type is in the compressible list.
 * Already-compressed formats (JPEG, PNG, MP4, etc.) are passed through as-is.
 *
 * This is using the CompressionStream API,
 * @link https://caniuse.com/?search=compressionstream
 */
export function wrappedAttachmentsCompressionStorage<Internals, InstanceCreationOptions>(
    args: {
        storage: RxStorage<Internals, InstanceCreationOptions>;
    }
): RxStorage<Internals, InstanceCreationOptions> {
    return Object.assign(
        {},
        args.storage,
        {
            async createStorageInstance<RxDocType>(
                params: RxStorageInstanceCreationParams<RxDocType, any>
            ) {
                if (
                    !params.schema.attachments ||
                    !params.schema.attachments.compression
                ) {
                    return args.storage.createStorageInstance(params);
                }

                const mode = params.schema.attachments.compression;
                const compressibleTypes = params.schema.attachments.compressibleTypes || DEFAULT_COMPRESSIBLE_TYPES;

                /**
                 * The passed document is not mutated because callers like the
                 * replication protocol keep using the given object after the write.
                 */
                async function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
                    const attachments = docData._attachments;
                    const attachmentIds = Object.keys(attachments);
                    if (attachmentIds.length === 0) {
                        return docData;
                    }
                    const useAttachments = await Promise.all(
                        attachmentIds.map(async (attachmentId) => {
                            const attachment = attachments[attachmentId];
                            if (!isCompressibleType(attachment.type, compressibleTypes)) {
                                return attachment;
                            }
                            const useAttachment = flatClone(attachment);
                            if (!useAttachment.digest.startsWith(COMPRESSED_DIGEST_PREFIX)) {
                                useAttachment.digest = COMPRESSED_HIDDEN_DIGEST_PREFIX + useAttachment.digest;
                            }
                            if ((useAttachment as RxAttachmentWriteData).data) {
                                (useAttachment as RxAttachmentWriteData).data = await compressBlob(
                                    mode,
                                    (useAttachment as RxAttachmentWriteData).data
                                );
                            }
                            return useAttachment;
                        })
                    );
                    const ret = flatClone(docData);
                    ret._attachments = {};
                    attachmentIds.forEach((attachmentId, idx) => ret._attachments[attachmentId] = useAttachments[idx]);
                    return ret;
                }

                function modifyFromStorage(docData: RxDocumentData<RxDocType>) {
                    const attachments = docData._attachments;
                    let ret = docData;
                    Object.entries(attachments).forEach(([attachmentId, attachment]) => {
                        if (attachment.digest.startsWith(COMPRESSED_HIDDEN_DIGEST_PREFIX)) {
                            if (ret === docData) {
                                ret = flatClone(docData);
                                ret._attachments = flatClone(attachments);
                            }
                            ret._attachments[attachmentId] = Object.assign({}, attachment, {
                                digest: attachment.digest.slice(COMPRESSED_HIDDEN_DIGEST_PREFIX.length)
                            });
                        }
                    });
                    return ret;
                }

                /**
                 * Because this wrapper resolves the attachments.compression,
                 * we have to remove it before sending it to the underlying RxStorage.
                 * which allows underlying storages to detect wrong configurations
                 * like when compression is set to false but no attachment-compression module is used.
                 */
                const childSchema = flatClone(params.schema);
                childSchema.attachments = flatClone(childSchema.attachments);
                delete ensureNotFalsy(childSchema.attachments).compression;

                const instance = await args.storage.createStorageInstance(
                    Object.assign(
                        {},
                        params,
                        {
                            schema: childSchema
                        }
                    )
                );

                const wrappedInstance = wrapRxStorageInstance(
                    params.schema,
                    instance,
                    modifyToStorage,
                    modifyFromStorage
                );

                /**
                 * The attachment is compressed when its stored digest has the prefix.
                 * Callers pass the plain digest, so the stored digest
                 * is read from the document.
                 */
                wrappedInstance.getAttachmentData = async (
                    documentId: string,
                    attachmentId: string,
                    digest: string
                ) => {
                    let storedDigest = digest;
                    if (!digest.startsWith(COMPRESSED_DIGEST_PREFIX)) {
                        const docs = await instance.findDocumentsById([documentId], true);
                        const storedAttachment = docs[0] ? docs[0]._attachments[attachmentId] : undefined;
                        if (storedAttachment && storedAttachment.digest === COMPRESSED_HIDDEN_DIGEST_PREFIX + digest) {
                            storedDigest = storedAttachment.digest;
                        }
                    }
                    const data = await instance.getAttachmentData(documentId, attachmentId, storedDigest);
                    if (storedDigest !== digest || digest.startsWith(COMPRESSED_DIGEST_PREFIX)) {
                        return decompressBlob(mode, data);
                    }
                    return data;
                };

                return wrappedInstance;
            }
        }
    );
}

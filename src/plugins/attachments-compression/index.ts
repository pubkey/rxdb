import { wrapRxStorageInstance } from '../../plugin-helpers.ts';
import type {
    RxStorage,
    RxStorageInstanceCreationParams,
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
const DEFAULT_COMPRESSIBLE_TYPES: string[] = [
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
 * Checks if a given MIME type should be compressed,
 * based on a list of type patterns. Supports wildcard suffix matching
 * (e.g., 'text/*' matches 'text/plain', 'text/html', etc.).
 *
 * Deterministic: same type + same pattern list = same answer.
 * No byte-level inspection needed.
 */
export function isCompressibleType(
    mimeType: string,
    compressibleTypes: string[]
): boolean {
    const lower = mimeType.toLowerCase();
    for (const pattern of compressibleTypes) {
        if (pattern.endsWith('/*')) {
            const prefix = pattern.slice(0, -1);
            if (lower.startsWith(prefix)) {
                return true;
            }
        } else if (lower === pattern) {
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

                async function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
                    await Promise.all(
                        Object.values(docData._attachments).map(async (attachment) => {
                            if (!(attachment as RxAttachmentWriteData).data) {
                                return;
                            }
                            const attachmentWriteData = attachment as RxAttachmentWriteData;
                            if (isCompressibleType(attachmentWriteData.type, compressibleTypes)) {
                                attachmentWriteData.data = await compressBlob(mode, attachmentWriteData.data);
                            }
                        })
                    );
                    return docData;
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
                    d => d
                );

                /**
                 * Override getAttachmentData to selectively decompress
                 * based on the attachment's MIME type.
                 * Non-compressible types (JPEG, PNG, etc.) are returned as-is.
                 */
                wrappedInstance.getAttachmentData = async (
                    documentId: string,
                    attachmentId: string,
                    digest: string
                ) => {
                    const data = await instance.getAttachmentData(documentId, attachmentId, digest);
                    const docs = await instance.findDocumentsById([documentId], false);
                    const doc = docs[0];
                    if (doc) {
                        const attachmentMeta = doc._attachments[attachmentId];
                        if (attachmentMeta && isCompressibleType(attachmentMeta.type, compressibleTypes)) {
                            return decompressBlob(mode, data);
                        }
                    }
                    return data;
                };

                return wrappedInstance;
            }
        }
    );
}

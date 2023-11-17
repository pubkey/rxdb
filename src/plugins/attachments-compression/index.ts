import { wrapRxStorageInstance } from '../../plugin-helpers.ts';
import type {
    RxStorage,
    RxStorageInstanceCreationParams,
    RxDocumentWriteData,
    CompressionMode,
    RxAttachmentWriteData
} from '../../types/index.d.ts';

import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    ensureNotFalsy,
    flatClone
} from '../utils/index.ts';


/**
 * @link https://github.com/WICG/compression/blob/main/explainer.md
 */
export async function compressBase64(
    mode: CompressionMode,
    base64String: string
): Promise<string> {
    const arrayBuffer = base64ToArrayBuffer(base64String);
    const stream = ensureNotFalsy(new Response(arrayBuffer).body)
        .pipeThrough(new CompressionStream(mode));
    const result = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64(result);
}
export async function decompressBase64(
    mode: CompressionMode,
    base64String: string
): Promise<string> {
    const arrayBuffer = base64ToArrayBuffer(base64String);
    const stream = ensureNotFalsy(new Response(arrayBuffer).body)
        .pipeThrough(new DecompressionStream(mode));
    const result = await new Response(stream).arrayBuffer();
    return arrayBufferToBase64(result);
}


/**
 * A RxStorage wrapper that compresses attachment data on writes
 * and decompresses the data on reads.
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

                async function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
                    await Promise.all(
                        Object.values(docData._attachments).map(async (attachment) => {
                            if (!(attachment as RxAttachmentWriteData).data) {
                                return;
                            }
                            const attachmentWriteData = attachment as RxAttachmentWriteData;
                            attachmentWriteData.data = await compressBase64(mode, attachmentWriteData.data);
                        })
                    );
                    return docData;
                }
                function modifyAttachmentFromStorage(attachmentData: string): Promise<string> {
                    return decompressBase64(mode, attachmentData);
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

                return wrapRxStorageInstance(
                    params.schema,
                    instance,
                    modifyToStorage,
                    d => d,
                    modifyAttachmentFromStorage
                );
            }
        }
    );
}

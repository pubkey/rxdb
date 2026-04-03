/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import pkg from 'crypto-js';
const { AES, enc: cryptoEnc } = pkg;

import { wrapRxStorageInstance } from '../../plugin-helpers.ts';
import { newRxError, newRxTypeError } from '../../rx-error.ts';
import { hasEncryption } from '../../rx-storage-helper.ts';
import type {
    InternalStoreDocType,
    RxAttachmentWriteData,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types/index.d.ts';
import {
    arrayBufferToBase64,
    base64ToArrayBuffer,
    clone,
    ensureNotFalsy,
    flatClone,
    getProperty,
    setProperty
} from '../../plugins/utils/index.ts';

export const MINIMUM_PASSWORD_LENGTH: 8 = 8;


export function encryptString(value: string, password: string): string {
    const encrypted = AES.encrypt(value, password);
    return encrypted.toString();
}

export function decryptString(cipherText: string, password: any): string {
    /**
     * Trying to decrypt non-strings
     * will cause no errors and will be hard to debug.
     * So instead we do this check here.
     */
    if (typeof cipherText !== 'string') {
        throw newRxError('SNH', {
            args: {
                cipherText
            }
        });
    }

    const decrypted = AES.decrypt(cipherText, password);
    const ret = decrypted.toString(cryptoEnc.Utf8);
    return ret;
}

export type InternalStorePasswordDocType = InternalStoreDocType<{
    hash: string;
}>;

export function wrappedKeyEncryptionCryptoJsStorage<Internals, InstanceCreationOptions>(
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
                if (typeof params.password !== 'undefined') {
                    validatePassword(params.password as any);
                }

                if (!hasEncryption(params.schema)) {
                    const retInstance = await args.storage.createStorageInstance(params);
                    return retInstance;
                }

                if (!params.password) {
                    throw newRxError('EN3', {
                        database: params.databaseName,
                        collection: params.collectionName,
                        schema: params.schema
                    });
                }
                const password = params.password;

                const schemaWithoutEncrypted: RxJsonSchema<RxDocumentData<RxDocType>> = clone(params.schema);
                delete schemaWithoutEncrypted.encrypted;
                if (schemaWithoutEncrypted.attachments) {
                    schemaWithoutEncrypted.attachments.encrypted = false;
                }

                /**
                 * Encrypted data is always stored as string
                 * so we have to replace the schema definition of
                 * encrypted fields with just {type: 'string'}.
                 * All type-specific keywords (properties, required,
                 * items, maxLength, enum etc.) must be removed because
                 * they do not apply to the encrypted ciphertext string.
                 */
                ensureNotFalsy(params.schema.encrypted).forEach(key => {
                    const pathParts = key.split('.');
                    if (pathParts.length === 1) {
                        (schemaWithoutEncrypted as any).properties[key] = { type: 'string' };
                    } else {
                        // Navigate nested schema structure: properties.a.properties.b.properties.c
                        let currentSchemaLevel: any = schemaWithoutEncrypted;
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            currentSchemaLevel = currentSchemaLevel.properties[pathParts[i]];
                        }
                        currentSchemaLevel.properties[pathParts[pathParts.length - 1]] = { type: 'string' };
                    }
                });

                const instance = await args.storage.createStorageInstance(
                    Object.assign(
                        {},
                        params,
                        {
                            schema: schemaWithoutEncrypted
                        }
                    )
                );

                async function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
                    docData = cloneWithoutAttachments(docData);
                    ensureNotFalsy(params.schema.encrypted)
                        .forEach(path => {
                            const value = getProperty(docData, path);
                            if (typeof value === 'undefined') {
                                return;
                            }

                            const stringValue = JSON.stringify(value);
                            const encrypted = encryptString(stringValue, password);
                            setProperty(docData, path, encrypted);
                        });

                    // handle attachments
                    if (
                        params.schema.attachments &&
                        params.schema.attachments.encrypted
                    ) {
                        const newAttachments: typeof docData._attachments = {};
                        await Promise.all(
                            Object.entries(docData._attachments).map(async ([id, attachment]) => {
                                const useAttachment: RxAttachmentWriteData = flatClone(attachment) as any;
                                if (useAttachment.data) {
                                    const ab = await useAttachment.data.arrayBuffer();
                                    const base64 = arrayBufferToBase64(ab);
                                    const encrypted = encryptString(base64, password);
                                    useAttachment.data = new Blob([encrypted], { type: useAttachment.type });
                                }
                                newAttachments[id] = useAttachment;
                            })
                        );
                        docData._attachments = newAttachments;
                    }
                    return docData;
                }
                function modifyFromStorage(docData: RxDocumentData<any>): Promise<RxDocumentData<RxDocType>> {
                    docData = cloneWithoutAttachments(docData);
                    ensureNotFalsy(params.schema.encrypted)
                        .forEach(path => {
                            const value = getProperty(docData, path);
                            if (typeof value === 'undefined') {
                                return;
                            }
                            const decrypted = decryptString(value, password);
                            const decryptedParsed = JSON.parse(decrypted);
                            setProperty(docData, path, decryptedParsed);
                        });
                    return docData;
                }

                async function modifyAttachmentFromStorage(attachmentData: Blob): Promise<Blob> {
                    if (
                        params.schema.attachments &&
                        params.schema.attachments.encrypted
                    ) {
                        const encryptedText = await attachmentData.text();
                        const decryptedBase64 = decryptString(encryptedText, password);
                        const ab = base64ToArrayBuffer(decryptedBase64);
                        return new Blob([ab], attachmentData.type ? { type: attachmentData.type } : undefined);
                    } else {
                        return attachmentData;
                    }
                }

                return wrapRxStorageInstance(
                    params.schema,
                    instance,
                    modifyToStorage,
                    modifyFromStorage,
                    modifyAttachmentFromStorage
                );
            }
        }
    );
}





function cloneWithoutAttachments<T>(data: RxDocumentWriteData<T>): RxDocumentData<T> {
    const attachments = data._attachments;
    data = flatClone(data);
    delete (data as any)._attachments;
    data = clone(data);
    data._attachments = attachments;
    return data as any;
}

function validatePassword(password: string) {
    if (typeof password !== 'string') {
        throw newRxTypeError('EN1', {
            passwordType: typeof password
        });
    }
    if (password.length < MINIMUM_PASSWORD_LENGTH) {
        throw newRxError('EN2', {
            minPassLength: MINIMUM_PASSWORD_LENGTH,
            passwordLength: password.length
        });
    }
}

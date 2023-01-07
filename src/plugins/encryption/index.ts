/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import { wrapRxStorageInstance } from '../../plugin-helpers';
import {
    INTERNAL_STORE_SCHEMA_TITLE
} from '../../rx-database-internal-store';
import { newRxError, newRxTypeError } from '../../rx-error';
import { hasEncryption } from '../../rx-storage-helper';
import type {
    InternalStoreDocType,
    RxAttachmentWriteData,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams
} from '../../types';
import {
    b64DecodeUnicode,
    b64EncodeUnicode,
    clone,
    ensureNotFalsy,
    flatClone,
    getProperty,
    setProperty
} from '../../plugins/utils';

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
    const ret = decrypted.toString(cryptoEnc);
    return ret;
}

export type InternalStorePasswordDocType = InternalStoreDocType<{
    hash: string;
}>;

export function wrappedKeyEncryptionStorage<Internals, InstanceCreationOptions>(
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
                if (!hasEncryption(params.schema)) {
                    const retInstance = await args.storage.createStorageInstance(params);
                    if (
                        params.schema.title === INTERNAL_STORE_SCHEMA_TITLE &&
                        params.password
                    ) {
                        try {
                            validatePassword(params.password);
                        } catch (err) {
                            /**
                             * Even if the checks fail,
                             * we have to clean up.
                             */
                            await retInstance.close();
                            throw err;
                        }
                    }
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

                const instance = await args.storage.createStorageInstance(
                    Object.assign(
                        {},
                        params,
                        {
                            schema: schemaWithoutEncrypted
                        }
                    )
                );

                function modifyToStorage(docData: RxDocumentWriteData<RxDocType>) {
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
                        Object.entries(docData._attachments).forEach(([id, attachment]) => {
                            const useAttachment: RxAttachmentWriteData = flatClone(attachment) as any;
                            if (useAttachment.data) {
                                const dataString = useAttachment.data;
                                useAttachment.data = b64EncodeUnicode(encryptString(dataString, password));
                            }
                            newAttachments[id] = useAttachment;
                        });
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

                function modifyAttachmentFromStorage(attachmentData: string): string {
                    if (
                        params.schema.attachments &&
                        params.schema.attachments.encrypted
                    ) {
                        const decrypted = decryptString(b64DecodeUnicode(attachmentData), password);
                        return decrypted;
                    } else {
                        return attachmentData;
                    }
                }

                return wrapRxStorageInstance(
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

function validatePassword(password: any) {
    if (password && typeof password !== 'string') {
        throw newRxTypeError('EN1', {
            password
        });
    }
    if (password && password.length < MINIMUM_PASSWORD_LENGTH) {
        throw newRxError('EN2', {
            minPassLength: MINIMUM_PASSWORD_LENGTH,
            password
        });
    }
}

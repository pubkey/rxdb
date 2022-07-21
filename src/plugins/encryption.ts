/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */
import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';
import objectPath from 'object-path';
import { wrapRxStorageInstance } from '../plugin-helpers';
import {
    getPrimaryKeyOfInternalDocument,
    INTERNAL_CONTEXT_ENCRYPTION,
    INTERNAL_STORE_SCHEMA_TITLE
} from '../rx-database-internal-store';
import { newRxError, newRxTypeError } from '../rx-error';
import { hasEncryption, writeSingle } from '../rx-storage-helper';
import type {
    InternalStoreDocType,
    RxAttachmentWriteData,
    RxDocumentData,
    RxDocumentWriteData,
    RxJsonSchema,
    RxStorage,
    RxStorageBulkWriteError,
    RxStorageInstance,
    RxStorageInstanceCreationParams
} from '../types';
import {
    clone,
    createRevision,
    ensureNotFalsy,
    flatClone,
    getDefaultRevision,
    fastUnsecureHash,
    now
} from '../util';

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
        storage: RxStorage<Internals, InstanceCreationOptions>
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
                            await storePasswordHashIntoInternalStore(
                                retInstance as any,
                                params.password
                            );
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

                function modifyToStorage(docData: RxDocumentData<RxDocType>) {
                    docData = cloneWithoutAttachments(docData);
                    ensureNotFalsy(params.schema.encrypted)
                        .forEach(path => {
                            const value = objectPath.get(docData, path);
                            if (typeof value === 'undefined') {
                                return;
                            }

                            const stringValue = JSON.stringify(value);
                            const encrypted = encryptString(stringValue, password);
                            objectPath.set(docData, path, encrypted);
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
                                useAttachment.data = encryptString(dataString, password);
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
                            const value = objectPath.get(docData, path);
                            if (typeof value === 'undefined') {
                                return;
                            }
                            const decrypted = decryptString(value, password);
                            console.log('modifyFromStorage() ' + docData.id);
                            console.dir(value);
                            console.log('decrypted: ' + decrypted);
                            console.log('------------------');
                            const decryptedParsed = JSON.parse(decrypted);
                            objectPath.set(docData, path, decryptedParsed);
                        });
                    return docData;
                }

                function modifyAttachmentFromStorage(attachmentData: string): string {
                    if (
                        params.schema.attachments &&
                        params.schema.attachments.encrypted
                    ) {
                        return decryptString(attachmentData, password);
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





function cloneWithoutAttachments<T>(data: RxDocumentData<T>): RxDocumentData<T> {
    const attachments = data._attachments;
    data = flatClone(data);
    delete (data as any)._attachments;
    data = clone(data);
    data._attachments = attachments;
    return data;
}


/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export async function storePasswordHashIntoInternalStore(
    internalStorageInstance: RxStorageInstance<InternalStoreDocType, any, any>,
    password: string
): Promise<boolean> {
    const pwHash = fastUnsecureHash(password, 1);
    const pwHashDocumentKey = 'pwHash';
    const pwHashDocumentId = getPrimaryKeyOfInternalDocument(
        pwHashDocumentKey,
        INTERNAL_CONTEXT_ENCRYPTION
    );

    const docData: RxDocumentWriteData<InternalStorePasswordDocType> = {
        id: pwHashDocumentId,
        key: pwHashDocumentKey,
        context: INTERNAL_CONTEXT_ENCRYPTION,
        data: {
            hash: pwHash
        },
        _deleted: false,
        _attachments: {},
        _meta: {
            lwt: now()
        },
        _rev: getDefaultRevision()
    };
    docData._rev = createRevision(docData);

    let pwHashDoc;
    try {
        pwHashDoc = await writeSingle(
            internalStorageInstance,
            {
                document: docData
            },
            'encryption-password-hash'
        );
    } catch (err) {
        if (
            (err as any).isError &&
            (err as RxStorageBulkWriteError<InternalStorePasswordDocType>).status === 409
        ) {
            pwHashDoc = ensureNotFalsy((err as RxStorageBulkWriteError<InternalStorePasswordDocType>).documentInDb);
        } else {
            throw err;
        }
    }

    if (pwHash !== pwHashDoc.data.hash) {
        // different hash was already set by other instance
        throw newRxError('DB1', {
            passwordHash: pwHash,
            existingPasswordHash: pwHashDoc.data.hash
        });
    } else {
        return true;
    }
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

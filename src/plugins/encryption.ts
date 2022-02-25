/**
 * this plugin adds the encryption-capabilities to rxdb
 * It's using crypto-js/aes for password-encryption
 * @link https://github.com/brix/crypto-js
 */

import AES from 'crypto-js/aes';
import * as cryptoEnc from 'crypto-js/enc-utf8';

import {
    newRxTypeError,
    newRxError
} from '../rx-error';

import objectPath from 'object-path';
import type {
    RxPlugin,
    RxDatabase,
    RxLocalDocumentData,
    RxDocumentData
} from '../types';
import {
    blobBufferUtil,
    clone,
    flatClone,
    getDefaultRxDocumentMeta,
    hash,
    PROMISE_RESOLVE_FALSE
} from '../util';
import { findLocalDocument } from '../rx-storage-helper';

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



export type PasswordHashDocument = RxLocalDocumentData<{
    value: string;
}>;

/**
 * validates and inserts the password hash into the internal collection
 * to ensure there is/was no other instance with a different password
 * which would cause strange side effects when both instances save into the same db
 */
export async function storePasswordHashIntoDatabase(
    rxDatabase: RxDatabase
): Promise<boolean> {
    if (!rxDatabase.password) {
        return PROMISE_RESOLVE_FALSE;
    }
    const pwHash = hash(rxDatabase.password);
    const pwHashDocumentId = 'pwHash';

    const pwHashDoc = await findLocalDocument<PasswordHashDocument>(
        rxDatabase.localDocumentsStore,
        pwHashDocumentId,
        false
    );
    if (!pwHashDoc) {
        const docData: PasswordHashDocument = {
            _id: pwHashDocumentId,
            value: pwHash,
            _attachments: {},
            _meta: getDefaultRxDocumentMeta(),
            _deleted: false
        };
        await rxDatabase.localDocumentsStore.bulkWrite([{
            document: docData
        }]);
        return true;
    } else if (pwHash !== pwHashDoc.value) {
        // different hash was already set by other instance
        await rxDatabase.destroy();
        throw newRxError('DB1', {
            passwordHash: hash(rxDatabase.password),
            existingPasswordHash: pwHashDoc.value
        });
    } else {
        return true;
    }
}


function cloneWithoutAttachments<T>(data: RxDocumentData<T>): RxDocumentData<T> {
    const attachments = data._attachments;
    data = flatClone(data);
    delete (data as any)._attachments;
    data = clone(data);
    data._attachments = attachments;
    return data;
}

export const RxDBEncryptionPlugin: RxPlugin = {
    name: 'encryption',
    rxdb: true,
    prototypes: {},
    overwritable: {
        validatePassword: function (password: any) {
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
    },
    hooks: {
        createRxDatabase: {
            after: (db: RxDatabase) => {
                return storePasswordHashIntoDatabase(db);
            }
        },
        preWriteToStorageInstance: {
            before: (args) => {
                const password = args.database.password;
                const schema = args.schema
                if (
                    !password ||
                    !schema.encrypted ||
                    schema.encrypted.length === 0
                ) {
                    return;
                }

                const docData = cloneWithoutAttachments(args.doc);
                schema.encrypted
                    .forEach(path => {
                        const value = objectPath.get(docData, path);
                        if (typeof value === 'undefined') {
                            return;
                        }

                        const stringValue = JSON.stringify(value);
                        const encrypted = encryptString(stringValue, password);
                        objectPath.set(docData, path, encrypted);
                    });
                args.doc = docData;
            }
        },
        postReadFromInstance: {
            after: (args) => {
                const password = args.database.password;
                const schema = args.schema
                if (
                    !password ||
                    !schema.encrypted ||
                    schema.encrypted.length === 0
                ) {
                    return;
                }
                const docData = cloneWithoutAttachments(args.doc);
                schema.encrypted
                    .forEach(path => {
                        const value = objectPath.get(docData, path);
                        if (typeof value === 'undefined') {
                            return;
                        }
                        const decrypted = decryptString(value, password);
                        const decryptedParsed = JSON.parse(decrypted);
                        objectPath.set(docData, path, decryptedParsed);
                    });
                args.doc = docData;
            }
        },
        preWriteAttachment: {
            after: async (args) => {
                const password = args.database.password;
                const schema = args.schema
                if (
                    password &&
                    schema.attachments &&
                    schema.attachments.encrypted
                ) {
                    const dataString = await blobBufferUtil.toString(args.attachmentData.data);
                    const encrypted = encryptString(dataString, password);
                    args.attachmentData.data = blobBufferUtil.createBlobBuffer(encrypted, 'text/plain');
                }
            }
        },
        postReadAttachment: {
            after: async (args) => {
                const password = args.database.password;
                const schema = args.schema
                if (
                    password &&
                    schema.attachments &&
                    schema.attachments.encrypted
                ) {
                    const dataString = await blobBufferUtil.toString(args.plainData);
                    const decrypted = decryptString(dataString, password);
                    args.plainData = blobBufferUtil.createBlobBuffer(
                        decrypted,
                        args.type
                    );
                }
            }
        }
    }
};

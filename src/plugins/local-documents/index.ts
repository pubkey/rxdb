import type {
    RxPlugin
} from '../../types/index.d.ts';
import {
    getLocal,
    getLocal$,
    insertLocal,
    upsertLocal
} from './local-documents.ts';
import {
    closeStateByParent,
    removeLocalDocumentsStorageInstance
} from './local-documents-helper.ts';
import { createLocalDocStateByParent } from './rx-local-document.ts';

export * from './local-documents-helper.ts';
export * from './local-documents.ts';
export * from './rx-local-document.ts';
export type {
    LocalDocumentParent,
    LocalDocumentState,
    RxLocalDocument,
    RxLocalDocumentData
} from '../../types/plugins/local-documents.d.ts';


export const RxDBLocalDocumentsPlugin: RxPlugin = {
    name: 'local-documents',
    rxdb: true,
    prototypes: {
        RxCollection: (proto: any) => {
            proto.insertLocal = insertLocal;
            proto.upsertLocal = upsertLocal;
            proto.getLocal = getLocal;
            proto.getLocal$ = getLocal$;
        },
        RxDatabase: (proto: any) => {
            proto.insertLocal = insertLocal;
            proto.upsertLocal = upsertLocal;
            proto.getLocal = getLocal;
            proto.getLocal$ = getLocal$;
        }
    },
    hooks: {
        createRxDatabase: {
            before: args => {
                if (args.creator.localDocuments) {
                    /**
                     * We do not have to await
                     * the creation to speed up initial page load.
                     */
                    /* await */ createLocalDocStateByParent(args.database);
                }
            }
        },
        createRxCollection: {
            before: args => {
                if (args.creator.localDocuments) {
                    /**
                     * We do not have to await
                     * the creation to speed up initial page load.
                     */
                    /* await */ createLocalDocStateByParent(args.collection);
                }
            }
        },
        preCloseRxDatabase: {
            after: db => {
                return closeStateByParent(db);
            }
        },
        postCloseRxCollection: {
            after: collection => closeStateByParent(collection)
        },
        postRemoveRxDatabase: {
            after: args => {
                return removeLocalDocumentsStorageInstance(
                    args.storage,
                    args.databaseName,
                    ''
                );
            }
        },
        postRemoveRxCollection: {
            after: args => {
                return removeLocalDocumentsStorageInstance(
                    args.storage,
                    args.databaseName,
                    args.collectionName
                );
            }
        }
    },
    overwritable: {}
};

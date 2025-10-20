import type { LocalDocumentParent, LocalDocumentState, RxDocumentData, RxJsonSchema, RxLocalDocumentData, RxStorage } from '../../types/index.d.ts';
export declare const LOCAL_DOC_STATE_BY_PARENT: WeakMap<LocalDocumentParent, Promise<LocalDocumentState>>;
export declare const LOCAL_DOC_STATE_BY_PARENT_RESOLVED: WeakMap<LocalDocumentParent, LocalDocumentState>;
export declare function getLocalDocStateByParent(parent: LocalDocumentParent): Promise<LocalDocumentState>;
export declare function createLocalDocumentStorageInstance(databaseInstanceToken: string, storage: RxStorage<any, any>, databaseName: string, collectionName: string, instanceCreationOptions: any, multiInstance: boolean): Promise<import("../../types/rx-storage.interface").RxStorageInstance<RxLocalDocumentData, any, any, any>>;
export declare function closeStateByParent(parent: LocalDocumentParent): Promise<void> | undefined;
export declare function removeLocalDocumentsStorageInstance(storage: RxStorage<any, any>, databaseName: string, collectionName: string): Promise<void>;
export declare function getCollectionLocalInstanceName(collectionName: string): string;
export declare const RX_LOCAL_DOCUMENT_SCHEMA: RxJsonSchema<RxDocumentData<RxLocalDocumentData>>;

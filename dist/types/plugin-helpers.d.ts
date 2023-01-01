import { WrappedRxStorageInstance } from './rx-storage-helper';
import type { RxDocumentData, RxDocumentWriteData, RxJsonSchema, RxStorage, RxStorageInstance, RxValidationError } from './types';
type WrappedStorageFunction = <Internals, InstanceCreationOptions>(args: {
    storage: RxStorage<Internals, InstanceCreationOptions>;
}) => RxStorage<Internals, InstanceCreationOptions>;
/**
 * Returns the validation errors.
 * If document is fully valid, returns an empty array.
 */
type ValidatorFunction = (docData: RxDocumentData<any>) => RxValidationError[];
/**
 * This factory is used in the validation plugins
 * so that we can reuse the basic storage wrapping code.
 */
export declare function wrappedValidateStorageFactory(
/**
 * Returns a method that can be used to validate
 * documents and throws when the document is not valid.
 */
getValidator: (schema: RxJsonSchema<any>) => ValidatorFunction, 
/**
 * A string to identify the validation library.
 */
validatorKey: string): WrappedStorageFunction;
/**
 * Used in plugins to easily modify all in- and outgoing
 * data of that storage instance.
 */
export declare function wrapRxStorageInstance<RxDocType>(instance: RxStorageInstance<RxDocType, any, any>, modifyToStorage: (docData: RxDocumentWriteData<RxDocType>) => Promise<RxDocumentData<any>> | RxDocumentData<any>, modifyFromStorage: (docData: RxDocumentData<any>) => Promise<RxDocumentData<RxDocType>> | RxDocumentData<RxDocType>, modifyAttachmentFromStorage?: (attachmentData: string) => Promise<string> | string): WrappedRxStorageInstance<RxDocType, any, any>;
export {};

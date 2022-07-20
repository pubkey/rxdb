import type {
    BulkWriteRow,
    RxDocumentData,
    RxJsonSchema,
    RxStorage,
    RxStorageInstanceCreationParams
} from './types';
import { fastUnsecureHash, getFromMapOrThrow, requestIdleCallbackIfAvailable } from './util';


type WrappedStorageFunction = <Internals, InstanceCreationOptions>(
    args: {
        storage: RxStorage<Internals, InstanceCreationOptions>
    }
) => RxStorage<Internals, InstanceCreationOptions>;

type ValidatorFunction = (docData: RxDocumentData<any>) => void;


/**
 * cache the validators by the schema-hash
 * so we can reuse them when multiple collections have the same schema
 */
const VALIDATOR_CACHE_BY_VALIDATOR_KEY: Map<string, Map<string, ValidatorFunction>> = new Map();


/**
 * This factory is used in the validation plugins
 * so that we can reuse the basic storage wrapping code.
 */
export function wrappedValidateStorageFactory(
    /**
     * Returns a method that can be used to validate
     * documents and throws when the document is not valid.
     */
    getValidator: (schema: RxJsonSchema<any>) => ValidatorFunction,
    /**
     * A string to identify the validation library.
     */
    validatorKey: string
): WrappedStorageFunction {
    if (!VALIDATOR_CACHE_BY_VALIDATOR_KEY.has(validatorKey)) {
        VALIDATOR_CACHE_BY_VALIDATOR_KEY.set(validatorKey, new Map());
    }
    const VALIDATOR_CACHE = getFromMapOrThrow(VALIDATOR_CACHE_BY_VALIDATOR_KEY, validatorKey);

    function initValidator(
        schema: RxJsonSchema<any>
    ): ValidatorFunction {
        const hash = fastUnsecureHash(schema, 3);
        if (!VALIDATOR_CACHE.has(hash)) {
            const validator = getValidator(schema);
            VALIDATOR_CACHE.set(hash, validator);
            return validator;
        }
        return getFromMapOrThrow(VALIDATOR_CACHE, hash);
    }

    return (args) => {
        return {
            name: args.storage.name,
            statics: args.storage.statics,
            async createStorageInstance<RxDocType>(
                params: RxStorageInstanceCreationParams<RxDocType, any>
            ) {
                const instance = await args.storage.createStorageInstance(params);
                /**
                 * Lazy initialize the validator
                 * to save initial page load performance.
                 * Some libraries take really long to initialize the validator
                 * from the schema.
                 */
                let validatorCached: ValidatorFunction;
                requestIdleCallbackIfAvailable(() => validatorCached = initValidator(params.schema));

                const oldBulkWrite = instance.bulkWrite.bind(instance);
                instance.bulkWrite = (
                    documentWrites: BulkWriteRow<RxDocType>[],
                    context: string
                ) => {
                    if (!validatorCached) {
                        validatorCached = initValidator(params.schema);
                    }
                    documentWrites.forEach(row => {
                        validatorCached(row.document);
                    });
                    return oldBulkWrite(documentWrites, context);
                }

                return instance;
            }
        }
    };

}

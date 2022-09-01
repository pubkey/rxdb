import { RxJsonSchema } from './rx-schema';

export type InternalStoreDocType<Data = any> = {
    id: string;
    key: string;
    context: string;
    data: Data;
}

/**
 * Stores information about the collections.
 * The collection.name is the 'key' value.
 */
export type InternalStoreStorageTokenDocType = InternalStoreDocType<{
    token: string;
    instanceToken: string;
    passwordHash?: string;
}>;

/**
 * Stores information about the collections.
 * The collection.name is the 'key' value.
 */
export type InternalStoreCollectionDocType = InternalStoreDocType<{
    /**
     * Plain name of the collection
     */
    name: string;
    schema: RxJsonSchema<any>;
    schemaHash: string;
    version: number;
}>;

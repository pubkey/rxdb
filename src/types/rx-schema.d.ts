import { AsTyped } from 'as-typed';
import type { CRDTSchemaOptions } from './plugins/crdt.d.ts';
import type { StringKeys } from './util.d.ts';

/**
 * @link https://github.com/types/lib-json-schema/blob/master/v4/index.d.ts
 */
export type JsonSchemaTypes = 'array' | 'boolean' | 'integer' | 'number' | 'null' | 'object' | 'string' | (string & {});

export type CompositePrimaryKey<RxDocType> = {
    /**
     * The top level field of the document that will be used
     * to store the composite key as string.
     */
    key: StringKeys<RxDocType>;

    /**
     * The fields of the composite key,
     * the fields must be required and final
     * and have the type number, int, or string.
     */
    fields: (StringKeys<RxDocType> | string)[] | readonly (StringKeys<RxDocType> | string)[];
    /**
     * The separator which is used to concat the
     * primary fields values.
     * Choose a character as separator that is known
     * to never appear inside of the primary fields values.
     * I recommend to use the pipe char '|'.
     */
    separator: string;
};

export type PrimaryKey<RxDocType> = StringKeys<RxDocType> | CompositePrimaryKey<RxDocType>;

export type JsonSchema<RxDocType = any> = {
    allOf?: JsonSchema[] | readonly JsonSchema[];
    anyOf?: JsonSchema[] | readonly JsonSchema[];
    oneOf?: JsonSchema[] | readonly JsonSchema[];
    additionalItems?: boolean | JsonSchema;
    additionalProperties?: boolean | JsonSchema;
    type?: JsonSchemaTypes | JsonSchemaTypes[] | readonly JsonSchemaTypes[];
    description?: string;
    dependencies?: {
        [key: string]: JsonSchema | string[] | readonly string[];
    };
    exclusiveMinimum?: boolean;
    exclusiveMaximum?: boolean;
    items?: JsonSchema | JsonSchema[] | readonly JsonSchema[];
    multipleOf?: number;
    maxProperties?: number;
    maximum?: number;
    minimum?: number;
    maxLength?: number;
    minLength?: number;
    maxItems?: number;
    minItems?: number;
    minProperties?: number;
    pattern?: string;
    patternProperties?: {
        [key: string]: JsonSchema;
    };
    properties?: {
        [key in StringKeys<RxDocType>]: JsonSchema;
    };
    required?: string[] | readonly string[];
    uniqueItems?: boolean;
    enum?: any[] | readonly any[];
    not?: JsonSchema;
    definitions?: {
        [key: string]: JsonSchema;
    };
    format?: 'date-time' | 'email' | 'hostname' | 'ipv4' | 'ipv6' | 'uri' | string;
    example?: any;

    // RxDB-specific
    ref?: string;
    final?: boolean;
};

export interface TopLevelProperty extends JsonSchema {
    default?: any;
}

/**
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
 */
export type CompressionMode = 'deflate' | 'gzip';

export type RxJsonSchema<
    /**
     * The doctype must be given, and '=any' cannot be used,
     * otherwise the keyof of primaryKey
     * would be optional when the type of the document is not known.
     */
    RxDocType
> = {
    title?: string;
    description?: string;
    version: number;

    /**
     * The primary key of the documents.
     * Must be in the top level of the properties of the schema
     * and that property must have the type 'string'
     */
    primaryKey: PrimaryKey<RxDocType>;

    /**
     * TODO this looks like a typescript-bug
     * we have to allows all string because the 'object'-literal is not recognized
     * retry this in later typescript-versions
     */
    type: 'object' | string;
    properties: { [key in StringKeys<RxDocType>]: TopLevelProperty };

    /**
     * On the top level the required-array must be set
     * because we always have to set the primary key to required.
     */
    required?: StringKeys<RxDocType>[] | readonly StringKeys<RxDocType>[];

    /**
     * Indexes that will be used for the queries.
     * RxDB will internally prepend the _deleted field to the index
     * because queries do NOT return documents with _deleted=true.
     */
    indexes?: (string | string[])[] | (string | readonly string[])[] | readonly (string | string[])[] | readonly (string | readonly string[])[];

    /**
     * Internally used indexes that do not get _deleted prepended
     * by RxDB. Use these to speed up queries that are run manually on the storage
     * or to speed up requests when you use the RxDB server.
     * These could also be utilised when you build a plugin that
     * has to query documents without respecting the _deleted value.
     */
    internalIndexes?: string[][] | readonly string[][];


    encrypted?: string[] | readonly string[];
    keyCompression?: boolean;
    /**
     * if not set, rxdb will set 'false' as default
     * Having additionalProperties: true is not allowed on the root level to ensure
     * that property names do not clash with properties of the RxDocument class
     * or ORM methods.
     */
    additionalProperties?: false;
    attachments?: {
        encrypted?: boolean;
        /**
         * @link https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
         */
        compression?: CompressionMode;
    };
    /**
     * Options for the sharding plugin of rxdb-premium.
     * We set these on the schema because changing the shard amount or mode
     * will require a migration.
     * @link https://rxdb.info/rx-storage-sharding.html
     */
    sharding?: {
        /**
         * Amount of shards.
         * This value cannot be changed after you have stored data,
         * if you change it anyway, you will loose the existing data.
         */
        shards: number;
        /**
         * Either shard by collection or by database.
         * For most use cases (IndexedDB based storages), sharding by collection is the way to go
         * because it has a faster initial load time.
         */
        mode: 'database' | 'collection';
    };
    crdt?: CRDTSchemaOptions<RxDocType>;
};

/**
 * Used to aggregate the document type from the schema.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export type ExtractDocumentTypeFromTypedRxJsonSchema<TypedRxJsonSchema> = AsTyped<TypedRxJsonSchema>;

import { AsTyped } from 'as-typed';
import { CRDTSchemaOptions } from './plugins/crdt';
import { StringKeys } from './util';

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
    fields: (StringKeys<RxDocType> | string)[];
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
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    additionalItems?: boolean | JsonSchema;
    additionalProperties?: boolean | JsonSchema;
    type?: JsonSchemaTypes | JsonSchemaTypes[];
    description?: string;
    dependencies?: {
        [key: string]: JsonSchema | string[];
    };
    exclusiveMinimum?: boolean;
    exclusiveMaximum?: boolean;
    items?: JsonSchema | JsonSchema[];
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
    required?: string[];
    uniqueItems?: boolean;
    enum?: any[];
    not?: JsonSchema;
    definitions?: {
        [key: string]: JsonSchema;
    };
    format?: 'date-time' | 'email' | 'hostname' | 'ipv4' | 'ipv6' | 'uri' | string;

    // RxDB-specific
    ref?: string;
    final?: boolean;
}

export interface TopLevelProperty extends JsonSchema {
    default?: any;
}

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
     * 
     * TODO required should be made non-optional on the top level
     */
    required?: StringKeys<RxDocType>[] | readonly StringKeys<RxDocType>[];


    indexes?: (string | string[])[] | (string | readonly string[])[] | readonly (string | string[])[] | readonly (string | readonly string[])[];
    encrypted?: string[];
    keyCompression?: boolean;
    /**
     * if not set, rxdb will set 'false' as default
     * Having additionalProperties: true is not allwed on the root level to ensure
     * that property names do not clash with properties of the RxDocument class
     * or ORM methods.
     */
    additionalProperties?: false;
    attachments?: {
        encrypted?: boolean;
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
    }
    crdt?: CRDTSchemaOptions<RxDocType>;
}

/**
 * Used to aggregate the document type from the schema.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export type ExtractDocumentTypeFromTypedRxJsonSchema<TypedRxJsonSchema> = AsTyped<TypedRxJsonSchema>;

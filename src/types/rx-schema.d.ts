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

/**
 * JSON Schema (draft-04 subset) for a single property of an RxDB document.
 * RxDB adds a few own fields like 'ref' and 'final' on top of plain JSON Schema.
 */
export type JsonSchema<RxDocType = any> = {
    allOf?: JsonSchema[] | readonly JsonSchema[];
    anyOf?: JsonSchema[] | readonly JsonSchema[];
    oneOf?: JsonSchema[] | readonly JsonSchema[];
    additionalItems?: boolean | JsonSchema;
    additionalProperties?: boolean | JsonSchema;
    /**
     * Type of the property.
     * Prefer one single fixed type per property. Avoid type arrays
     * like ['string', 'null']. Instead of allowing 'null', make the
     * field non-required and keep it undefined.
     */
    type?: JsonSchemaTypes | JsonSchemaTypes[] | readonly JsonSchemaTypes[];
    /**
     * Human- and machine-readable description of the field.
     * Not only for humans: plugins like webmcp pass the JSON schema
     * to LLMs and AI agents, so a good description helps agents
     * understand what the field contains and how to query it.
     */
    description?: string;
    dependencies?: {
        [key: string]: JsonSchema | string[] | readonly string[];
    };
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    /**
     * Sub-schema for array items.
     * Arrays should always declare an items sub-schema.
     */
    items?: JsonSchema | JsonSchema[] | readonly JsonSchema[];
    /**
     * Required (together with minimum and maximum) when a 'number' or 'integer'
     * field is used inside of an index or as part of a composite primary key.
     * Use multipleOf: 1 for integers.
     */
    multipleOf?: number;
    maxProperties?: number;
    /**
     * Required (together with minimum and multipleOf) when a 'number' or 'integer'
     * field is used inside of an index or as part of a composite primary key.
     */
    maximum?: number;
    /**
     * Required (together with maximum and multipleOf) when a 'number' or 'integer'
     * field is used inside of an index or as part of a composite primary key.
     */
    minimum?: number;
    /**
     * Required for 'string' fields that are used as primary key
     * or inside of an index.
     * Having a large maxLength for indexed fields and primary keys can negatively
     * impact performance on many storages. Therefore, you should only set it
     * as big as needed.
     */
    maxLength?: number;
    minLength?: number;
    maxItems?: number;
    minItems?: number;
    minProperties?: number;
    /**
     * Regex pattern the string value must match.
     * Only enforced when a schema validation plugin
     * (validate-ajv or validate-z-schema) is used.
     */
    pattern?: string;
    patternProperties?: {
        [key: string]: JsonSchema;
    };
    /**
     * Properties of a nested object.
     * Do not nest objects more than 3 levels deep.
     * Field names must not start with an underscore,
     * underscore-prefixed fields are reserved for RxDB internals
     * like _deleted, _rev, _meta and _attachments.
     */
    properties?: {
        [key in StringKeys<RxDocType>]: JsonSchema;
    };
    /**
     * Fields that must be defined on documents.
     * Fields that are used inside of an index must be required.
     */
    required?: string[] | readonly string[];
    uniqueItems?: boolean;
    enum?: any[] | readonly any[];
    not?: JsonSchema;
    definitions?: {
        [key: string]: JsonSchema;
    };
    /**
     * String format like 'date-time' or 'email'.
     * Only enforced when a schema validation plugin
     * (validate-ajv or validate-z-schema) is used.
     * Notice that JSON documents cannot store Date objects,
     * store dates as ISO 8601 'date-time' strings
     * or as unix timestamp numbers instead.
     */
    format?: 'date-time' | 'email' | 'hostname' | 'ipv4' | 'ipv6' | 'uri' | string;
    example?: any;

    // RxDB-specific
    /**
     * Marks the field as a reference to documents of another collection,
     * used by the population plugin. Set it to the name of the referenced collection.
     * @link https://rxdb.info/population.html
     * @example { type: 'string', ref: 'users' }
     */
    ref?: string;
    /**
     * Final fields can never be changed after the document was inserted.
     * Final fields are automatically required.
     * The primary key is always final.
     * @link https://rxdb.info/rx-schema.html
     */
    final?: boolean;
};

export interface TopLevelProperty extends JsonSchema {
    /**
     * Default value that is applied on insert when the field is not set.
     * Only allowed on top-level fields of the schema, not on nested fields.
     */
    default?: any;
}

/**
 * @link https://developer.mozilla.org/en-US/docs/Web/API/Compression_Streams_API
 */
export type CompressionMode = 'deflate' | 'gzip';

/**
 * Schema definition for an RxDB collection.
 *
 * ## AI Agent Guidance
 *
 * ### Golden Schema Template
 * Always define schemas as `as const` literals and use `toTypedRxJsonSchema`
 * to derive the TypeScript type. Never generate schemas dynamically.
 *
 * ```ts
 * import { toTypedRxJsonSchema, ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from 'rxdb';
 *
 * const todoSchemaLiteral = {
 *   title: 'todo schema',
 *   version: 0,
 *   primaryKey: 'id',
 *   type: 'object',
 *   properties: {
 *     id:        { type: 'string', maxLength: 100 },
 *     title:     { type: 'string' },
 *     completed: { type: 'boolean' },
 *     createdAt: { type: 'string', format: 'date-time' },
 *     updatedAt: { type: 'string', format: 'date-time' }
 *   },
 *   required: ['id', 'title', 'completed', 'createdAt', 'updatedAt'],
 *   indexes: ['updatedAt', ['completed', 'updatedAt']]
 * } as const;
 *
 * const schemaTyped = toTypedRxJsonSchema(todoSchemaLiteral);
 * export type TodoDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
 * export const todoSchema: RxJsonSchema<TodoDocType> = todoSchemaLiteral;
 * ```
 *
 * ### Recommended Schema Rules
 * - Collection names are plural (e.g. `todos`, `users`).
 * - Every document should include `createdAt` and `updatedAt`.
 * - Do not nest objects more than 3 levels deep.
 * - Arrays should always declare an `items` sub-schema.
 * - Do not use more then one type like `type: ["string", "number"]`, prefer to use one single fixed type per property.
 * - Do not use nullable fields, instead make them non-required (default) and leaf them undefined. Try to never store `null` inside of a JSON document.
 *
 */
export type RxJsonSchema<
    /**
     * The doctype must be given, and '=any' cannot be used,
     * otherwise the keyof of primaryKey
     * would be optional when the type of the document is not known.
     */
    RxDocType
> = {
    /**
     * Human- and machine-readable title of the schema.
     * Not used by RxDB core itself, but plugins like webmcp pass the
     * JSON schema to LLMs and AI agents, so a descriptive title helps
     * agents understand what the collection stores.
     */
    title?: string;
    /**
     * Human- and machine-readable description of the schema.
     * Not used by RxDB core itself, but plugins like webmcp pass the
     * JSON schema to LLMs and AI agents, so a good description helps
     * agents understand the purpose of the collection and its documents.
     */
    description?: string;
    /**
     * Version number of the schema, starts at 0.
     * When you change the schema of a collection that already stored data,
     * you have to increase the version and provide a migration strategy
     * for each version step in migrationStrategies.
     * @link https://rxdb.info/migration-schema.html
     */
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
     *
     * @example
     * // Single-field index
     * indexes: ['updatedAt']
     *
     * // Composite index for a query that filters by `completed` and sorts by `updatedAt`:
     * //   selector: { completed: false }, sort: [{ updatedAt: 'desc' }]
     * indexes: [['completed', 'updatedAt']]
     *
     * // Mixed: one single-field and one composite index
     * indexes: ['updatedAt', ['completed', 'updatedAt']]
     */
    indexes?: (string | string[])[] | (string | readonly string[])[] | readonly (string | string[])[] | readonly (string | readonly string[])[];

    /**
     * Internally used indexes that do not get _deleted prepended
     * by RxDB. Use these to speed up queries that are run manually on the storage
     * or to speed up requests when you use the RxDB server.
     * These could also be utilised when you build a plugin that
     * has to query documents without respecting the _deleted value.
     * @example [['firstName'], ['lastName', 'yearOfBirth']]
     */
    internalIndexes?: string[][] | readonly string[][];


    /**
     * Array of fields that should be encrypted.
     * @link https://rxdb.info/encryption.html
     * @example ['secret']
     */
    encrypted?: string[] | readonly string[];

    /**
     * Enables key compression for the collection to reduce storage size.
     * @link https://rxdb.info/key-compression.html
     * @example true
     */
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
        /**
         * Optional whitelist of MIME type patterns that should be compressed.
         * Supports '*' suffix for prefix matching (e.g., 'text/*').
         * If omitted, a built-in default list of compressible types is used.
         * Only relevant when 'compression' is set.
         */
        compressibleTypes?: string[];
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
    /**
     * Configuration for Conflict-free Replicated Data Types (CRDTs).
     * @link https://rxdb.info/crdt.html
     * @example { field: 'crdts' }
     */
    crdt?: CRDTSchemaOptions<RxDocType>;
};

/**
 * Used to aggregate the document type from the schema.
 * @link https://github.com/pubkey/rxdb/discussions/3467
 */
export type ExtractDocumentTypeFromTypedRxJsonSchema<TypedRxJsonSchema> = AsTyped<TypedRxJsonSchema>;

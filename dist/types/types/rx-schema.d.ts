/**
 * @link https://github.com/types/lib-json-schema/blob/master/v4/index.d.ts
 */
export type JsonSchemaTypes = 'array' | 'boolean' | 'integer' | 'number' | 'null' | 'object' | 'string' | string;
export interface JsonSchema {
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    additionalItems?: boolean | JsonSchema;
    additionalProperties?: boolean;
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
        [key: string]: JsonSchema;
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

export declare class RxJsonSchema<
    /**
     * The doctype must be given, and '=any' cannot be used,
     * otherwhise the keyof of primaryKey
     * would be optional when the type of the document is not known.
     */
    RxDocType
    > {
    title?: string;
    description?: string;
    version: number;

    /**
     * The primary key of the documents.
     * Must be in the top level of the properties of the schema
     * and that property must have the type 'string'
     */
    primaryKey: keyof RxDocType;

    /**
     * TODO this looks like a typescript-bug
     * we have to allows all string because the 'object'-literal is not recognized
     * retry this in later typescript-versions
     */
    type: 'object' | string;
    properties: { [key in keyof RxDocType]: TopLevelProperty };

    /**
     * TODO on the top level the required-array should be required
     * because we always have to set the primary key to required.
     */
    required?: (keyof RxDocType)[];


    indexes?: Array<string | string[]>;
    encrypted?: string[];
    keyCompression?: boolean;
    /**
     * if not set, rxdb will set 'false' as default
     * true is not allwed on the root level
     */
    additionalProperties?: false;
    attachments?: {
        encrypted?: boolean;
    };
}

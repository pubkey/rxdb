/**
 * @link https://github.com/types/lib-json-schema/blob/master/v4/index.d.ts
 */
export type JsonSchemaTypes = 'array' | 'boolean' | 'integer' | 'number' | 'null' | 'object' | 'string';
export interface JsonSchema {
    allOf?: JsonSchema[];
    anyOf?: JsonSchema[];
    oneOf?: JsonSchema[];
    additionalItems?: boolean | JsonSchema;
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
    required?: string[] | boolean;
    uniqueItems?: boolean;
    enum?: any[];
    not?: JsonSchema;
    definitions?: {
        [key: string]: JsonSchema;
    };
    format?: 'date-time' | 'email' | 'hostname' | 'ipv4' | 'ipv6' | 'uri' | string;

    // RxDB-specific
    ref?: string;
    index?: boolean;
    encrypted?: boolean;
    default?: any;
}

export interface RxJsonSchemaTopLevel extends JsonSchema {
    primary?: boolean;
    final?: boolean;
}

export declare class RxJsonSchema {
    title?: string;
    description?: string;
    version: number;
    type: 'object';
    properties: { [key: string]: RxJsonSchemaTopLevel };
    required?: Array<string>;
    compoundIndexes?: Array<string | Array<string>>;
    disableKeyCompression?: boolean;
    attachments?: {
            encrypted?: boolean
    };
}

export declare class RxSchema<T = any> {
    readonly jsonID: RxJsonSchema;
    getSchemaByObjectPath(path: keyof T): JsonSchema;
    readonly encryptedPaths: any;
    validate(obj: any, schemaObj: any): void;
    readonly hash: string;
    readonly topLevelFields: keyof T[];
    readonly previousVersions: any[];
    readonly defaultValues: { [P in keyof T]: T[P]; };

    static create(jsonSchema: RxJsonSchema): RxSchema;
}

import {
    toTypedRxJsonSchema,
    ExtractDocumentTypeFromTypedRxJsonSchema,
    RxJsonSchema
} from 'rxdb';


export const heroSchemaLiteral = {
    version: 0,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 100
        },
        color: {
            type: 'string',
            maxLength: 30
        },
        updatedAt: {
            type: 'number',
            minimum: 0,
            maximum: 1000000000000000,
            multipleOf: 1
        },
        replicationRevision: {
            type: 'string',
            minLength: 3
        }
    },
    indexes: ['color', 'updatedAt'],
    required: ['name', 'color', 'updatedAt', 'replicationRevision']
} as const;

const schemaTyped = toTypedRxJsonSchema(heroSchemaLiteral);
export type RxHeroDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;
export const heroSchema: RxJsonSchema<RxHeroDocumentType> = heroSchemaLiteral;

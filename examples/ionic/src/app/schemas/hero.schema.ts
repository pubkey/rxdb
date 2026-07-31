import {
    ExtractDocumentTypeFromTypedRxJsonSchema,
    RxJsonSchema,
    toTypedRxJsonSchema
} from 'rxdb';

export const HERO_SCHEMA_LITERAL = {
    title: 'hero schema',
    description: 'describes a simple hero',
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
            minLength: 3
        },
        hp: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            multipleOf: 1,
            default: 100
        }
    },
    required: [
        'name',
        'color',
        'hp'
    ]
} as const;

const schemaTyped = toTypedRxJsonSchema(HERO_SCHEMA_LITERAL);

export type RxHeroDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;

export const HERO_SCHEMA: RxJsonSchema<RxHeroDocumentType> = HERO_SCHEMA_LITERAL;

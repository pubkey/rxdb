import {
    RxJsonSchema,
    toTypedRxJsonSchema,
    ExtractDocumentTypeFromTypedRxJsonSchema
} from 'rxdb';
export const HERO_SCHEMA_LITERAL = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    keyCompression: false,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            default: '',
            maxLength: 100
        },
        color: {
            type: 'string',
            default: '',
            minLength: 3
        },
        maxHP: {
            type: 'number',
            minimum: 0,
            maximum: 1000
        },
        hp: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            default: 100
        },
        team: {
            description: 'color of the team this hero belongs to',
            type: 'string'
        },
        skills: {
            type: 'array',
            maxItems: 5,
            uniqueItems: true,
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    damage: {
                        type: 'number'
                    }
                }
            },
            default: []
        }
    },
    required: [
        'name',
        'color',
        'hp',
        'maxHP',
        'skills'
    ]
} as const;

const schemaTyped = toTypedRxJsonSchema(HERO_SCHEMA_LITERAL);
export type RxHeroDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof schemaTyped>;

export const HERO_SCHEMA: RxJsonSchema<RxHeroDocumentType> = HERO_SCHEMA_LITERAL;

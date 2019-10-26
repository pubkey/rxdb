import {
    RxJsonSchema
} from 'rxdb';
const schema: RxJsonSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    keyCompression: false,
    type: 'object',
    properties: {
        name: {
            type: 'string',
            primary: true,
            default: ''
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
    required: ['color', 'hp', 'maxHP', 'skills']
};

export default schema;

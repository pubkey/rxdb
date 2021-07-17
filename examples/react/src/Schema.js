export const heroSchema = {
    title: 'hero schema',
    description: 'describes a simple hero',
    version: 0,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string'
        },
        color: {
            type: 'string'
        }
    },
    required: [
        'name',
        'color'
    ]
};

const heroSchema = {
    version: 0,
    title: 'hero schema',
    description: 'describes a simple hero',
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
        },
        color: {
            type: 'string',
        },
    },
    required: ['color'],
};

export default heroSchema;

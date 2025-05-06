const heroSchema = {
    version: 0,
    title: 'hero schema',
    description: 'describes a simple hero',
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 128,
        },
        color: {
            type: 'string',
        },
    },
    attachments: {},
    required: ['color'],
};

export default heroSchema;

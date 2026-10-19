export const todoSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        title: {
            type: 'string'
        },
        done: {
            type: 'boolean'
        },
        createdAt: {
            type: 'number',
            minimum: 0,
            maximum: 1000000000000000,
            multipleOf: 1
        }
    },
    required: ['id', 'title', 'done', 'createdAt'],
    indexes: ['createdAt']
};

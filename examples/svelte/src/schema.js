const noteSchema = {
  title: 'note',
  description: 'an individual note',
  version: 0,
  type: 'object',
  indexes: [
    'createdAt',
    'updatedAt'
  ],
  primaryKey: 'name',
  properties: {
    name: {
      type: 'string',
      maxLength: 100,
    },
    body: {
      type: 'string'
    },
    createdAt: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999
    },
    updatedAt: {
      type: 'number',
      multipleOf: 1,
      minimum: 0,
      maximum: 9999999999999
    },
  },
  required: ['name', 'createdAt', 'updatedAt'],
};

export default noteSchema;

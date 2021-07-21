const noteSchema = {
  title: 'note',
  description: 'an individual note',
  version: 0,
  type: 'object',
  indexes: [
    'createdAt',
    'updatedAt'
  ],
  properties: {
    name: {
      type: 'string',
      // primary: true
    },
    body: {
      type: 'string'
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: ['name'],
};

export default noteSchema;

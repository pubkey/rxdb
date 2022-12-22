import {
    toTypedRxJsonSchema,
    type ExtractDocumentTypeFromTypedRxJsonSchema,
    type RxCollection,
    type RxDatabase,
    type RxJsonSchema
} from 'rxdb';

export const NotesSchemaLiteral = {
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
} as const;

export const SchemaTyped = toTypedRxJsonSchema(NotesSchemaLiteral);

// aggregate the document type from the schema
export type NoteDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof SchemaTyped>;

// create the typed RxJsonSchema from the literal typed object.
export const NoteSchema: RxJsonSchema<NoteDocType> = SchemaTyped;

type NoteCollection = RxCollection<NoteDocType>;

export type MyDatabaseCollections = {
notes: NoteCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

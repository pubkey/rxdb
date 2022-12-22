import {
    toTypedRxJsonSchema,
    type ExtractDocumentTypeFromTypedRxJsonSchema,
    type RxCollection,
    type RxDatabase,
    type RxJsonSchema
} from 'rxdb';

export const HeroSchemaLiteral = {
   title: 'hero',
  description: 'an individual hero',
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
    color: {
      type: 'string'
    },
    createdAt: {
      type: 'number',
    },
    updatedAt: {
      type: 'number',
    },
  },
  required: ['name', 'color','createdAt','updatedAt'],
} as const;

export const SchemaTyped = toTypedRxJsonSchema(HeroSchemaLiteral);

// aggregate the document type from the schema
export type HeroDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof SchemaTyped>;

// create the typed RxJsonSchema from the literal typed object.
export const HeroSchema: RxJsonSchema<HeroDocType> = SchemaTyped;

type HeroesCollection = RxCollection<HeroDocType>;

export type MyDatabaseCollections = {
heroes: HeroesCollection;
};

export type MyDatabase = RxDatabase<MyDatabaseCollections>;

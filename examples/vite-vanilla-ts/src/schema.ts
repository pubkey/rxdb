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
      maxLength: 100
    },
    color: {
      type: 'string'
    },
    createdAt: {
      type: 'number',
      minimum: 0,
      maximum: 9731970828058,
      multipleOf: 1
    },
    updatedAt: {
      type: 'number',
      minimum: 0,
      maximum: 9731970828058,
      multipleOf: 1
    },
  },
  required: ['name', 'color', 'createdAt', 'updatedAt'],
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

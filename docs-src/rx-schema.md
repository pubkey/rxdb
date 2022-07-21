# RxSchema

Schemas define the structure of the documents of a collection. Which field should be used as primary, which fields should be used as indexes and what should be encrypted. Every collection has its own schema. With RxDB, schemas are defined with the [jsonschema](http://json-schema.org/)-standard which you might know from other projects.

## Example

In this example-schema we define a hero-collection with the following settings:

- the version-number of the schema is 0
- the name-property is the **primaryKey**. This means its an unique, indexed, required `string` which can be used to definitely find a single document.
- the color-field is required for every document
- the healthpoints-field must be a number between 0 and 100
- the secret-field stores an encrypted value
- the birthyear-field is final which means it is required and cannot be changed
- the skills-attribute must be an array with objects which contain the name and the damage-attribute. There is a maximum of 5 skills per hero.
- Allows adding attachments and store them encrypted



```json
  {
    "title": "hero schema",
    "version": 0,
    "description": "describes a simple hero",
    "primaryKey": "name",
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "maxLength": 100 // <- the primary key must have set maxLength
        },
        "color": {
            "type": "string"
        },
        "healthpoints": {
            "type": "number",
            "minimum": 0,
            "maximum": 100
        },
        "secret": {
            "type": "string"
        },
        "birthyear": {
            "type": "number",
            "final": true,
            "minimum": 1900,
            "maximum": 2050
        },
        "skills": {
            "type": "array",
            "maxItems": 5,
            "uniqueItems": true,
            "items": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string"
                    },
                    "damage": {
                        "type": "number"
                    }
                }
            }
        }
    },
    "required": [
        "name",
        "color"
    ],
    "encrypted": ["secret"],
    "attachments": {
        "encrypted": true
    }
  }
```

## Create a collection with the schema

```javascript
await myDatabase.addCollections({
    heroes: {
        schema: myHeroSchema
    }
});
console.dir(myDatabase.heroes.name);
// heroes
```


## version
The `version` field is a number, starting with `0`.
When the version is greater than 0, you have to provide the migrationStrategies to create a collection with this schema.

## primaryKey

The `primaryKey` field contains the fieldname of the property that will be used as primary key for the whole collection.
The value of the primary key of the document must be a `string`, unique, final and is required.

### composite primary key

You can define a composite primary key which gets composed from multiple properties of the document data.

```javascript
const mySchema = {
  keyCompression: true, // set this to true, to enable the keyCompression
  version: 0,
  title: 'human schema with composite primary',
  primaryKey: {
      // where should the composed string be stored
      key: 'id',
      // fields that will be used to create the composed key
      fields: [
          'firstName',
          'lastName'
      ],
      // separator which is used to concat the fields values.
      separator: '|'
  }
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      firstName: {
          type: 'string'
      },
      lastName: {
          type: 'string'
      }
  },
  required: [
    'id', 
    'firstName',
    'lastName'
  ]
};
```

You can then find a document by using the relevant parts to create the composite primaryKey:

```ts

// inserting with composite primary
await myRxCollection.insert({
    // id, <- do not set the id, it will be filled by RxDB
    firstName: 'foo',
    lastName: 'bar'
});

// find by composite primary
const id = myRxCollection.schema.getPrimaryOfDocumentData({
    firstName: 'foo',
    lastName: 'bar'
});
const myRxDocument = myRxCollection.findOne(id).exec();

```


## keyCompression

If set to true (disabled by default), the documents will be stored in a compressed format which saves up to 40% disc space.
For compression the npm module [jsonschema-key-compression](https://github.com/pubkey/jsonschema-key-compression) is used.

`keyCompression` can only be set on the **top-level** of a schema.

**Notice:** When you use `keyCompression` together with the graphql replication or replication primitives, you must ensure that direct non-RxDB writes to the remote database must also write compressed documents. Therefore it is not recommended to enable `keyCompression` for that use case.


```javascript

// add the key-compression plugin
import { addRxPlugin } from 'rxdb';
import { RxDBKeyCompressionPlugin } from 'rxdb/plugins/key-compression';
addRxPlugin(RxDBKeyCompressionPlugin);

const mySchema = {
  keyCompression: true, // set this to true, to enable the keyCompression
  version: 0,
  title: 'human schema with compression',
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      firstName: {
          type: 'string'
      },
      lastName: {
          type: 'string'
      }
  },
  required: [
    'id', 
    'firstName',
    'lastName'
  ]
};
```


## Indexes
RxDB supports secondary indexes which are defined at the schema-level of the collection.

Index is only allowed on field types `string`, `integer` and `number`. Some RxStorages allow to use `boolean` fields as index.

Depending on the field type, you must have set some meta attributes like `maxLength` or `minimum`. This is required so that RxDB
is able to know the maximum string representation length of a field, which is needed to craft custom indexes on several `RxStorage` implementations.

**NOTICE:** RxDB will always append the `primaryKey` to all indexes to ensure a deterministic sort order of query results. You do not have to add the `primaryKey` to any index.

### Index-example

```javascript
const schemaWithIndexes = {
  version: 0,
  title: 'human schema with indexes',
  keyCompression: true,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      firstName: {
          type: 'string',
          maxLength: 100 // <- string-fields that are used as an index, must have set maxLength.
      },
      lastName: {
          type: 'string'
      },
      active: {
          type: 'boolean'
      }
      familyName: {
          type: 'string'
      },
      balance: {
          type: 'number',

          // number fields that are used in an index, must have set minium, maximum and multipleOf
          minimum: 0,
          maximum: 100000,
          multipleOf: '0.01'
      }
      creditCards: {
          type: 'array',
          items: {
              type: 'object',
              properties: {
                    cvc: {
                        type: 'number'
                    }
              }
          }       
      }
  },
  required: [
      'id',
      'active' // <- boolean fields that are used in an index, must be required. 
  ],
  indexes: [
    'firstName', // <- this will create a simple index for the `firstName` field
    ['active', 'firstName'], // <- this will create a compound-index for these two fields
    'active'
  ]
};
```

## attachments
To use attachments in the collection, you have to add the `attachments`-attribute to the schema. [See RxAttachment](./rx-attachment.md).

## default
Default values can only be defined for first-level fields.
Whenever you insert a document unset fields will be filled with default-values.

```javascript
const schemaWithDefaultAge = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      firstName: {
          type: 'string'
      },
      lastName: {
          type: 'string'
      },
      age: {
          type: 'integer',
          default: 20       // <- default will be used
      }
  },
  required: ['object']
};
```

## final
By setting a field to `final`, you make sure it cannot be modified later. Final fields are always required.
Final fields cannot be observed because they will not change.

Advantages:

- With final fields you can ensure that no-one accidentally modifies the data
- When you enable the `query-change-detection`, some performance-improvements are done

```javascript
const schemaWithFinalAge = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      firstName: {
          type: 'string'
      },
      lastName: {
          type: 'string'
      },
      age: {
          type: 'integer',
          final: true
      }
  },
  required: ['id']
};
```


## encryption

By adding a field to the `encrypted` list, it will be stored encrypted inside of the data-store. The encryption will run internally, so when you get the `RxDocument`, you can access the unencrypted value.
You can set all fields to be encrypted, even nested objects. You can not run queries over encrypted fields.
The password used for encryption is set during database creation. [See RxDatabase](./rx-database.md#password).

To use encryption, you first have to add the `encryption` plugin.

```javascript
import { addRxPlugin } from 'rxdb';
import { RxDBEncryptionPlugin } from 'rxdb/plugins/encryption';
addRxPlugin(RxDBEncryptionPlugin);
```

The encryption-module is using `crypto-js` and is only needed when you create your RxDB-Database with a [password](./rx-database.md#password-optional).


```javascript
const schemaWithDefaultAge = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
      id: {
          type: 'string',
          maxLength: 100 // <- the primary key must have set maxLength
      },
      secret: {
          type: 'string'
      },
  },
  required: ['id']
  encrypted: ['secret']
};
```


## NOTICE: Not everything within the jsonschema-spec is allowed
The schema is not only used to validate objects before they are written into the database, but also used to map getters to observe and populate single fieldnames, keycompression and other things. Therefore you can not use every schema which would be valid for the spec of [json-schema.org](http://json-schema.org/).
For example, fieldnames must match the regex `^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$` and `additionalProperties` is always set to `false`. But don't worry, RxDB will instantly throw an error when you pass a invalid schema into it.


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./schema-validation.md)

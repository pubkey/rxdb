---
title: Design Perfect Schemas in RxDB
slug: rx-schema.html
description: Learn how to define, secure, and validate your data in RxDB. Master primary keys, indexes, encryption, and more with the RxSchema approach.
image: /headers/rx-schema.jpg
---

# RxSchema

Schemas define the structure of the documents of a collection. Which field should be used as primary, which fields should be used as indexes and what should be encrypted. Every collection has its own schema. With RxDB, schemas are defined with the [jsonschema](https://json-schema.org/blog/posts/rxdb-case-study)-standard which you might know from other projects.

## Example

In this example-schema we define a hero-collection with the following settings:

- the version-number of the schema is 0
- the name-property is the **primaryKey**. This means its a unique, indexed, required `string` which can be used to definitely find a single document.
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
  },
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


## Indexes
RxDB supports secondary indexes which are defined at the schema-level of the collection.

Index is only allowed on field types `string`, `integer` and `number`. Some RxStorages allow to use `boolean` fields as index.

Depending on the field type, you must have set some meta attributes like `maxLength` or `minimum`. This is required so that RxDB
is able to know the maximum string representation length of a field, which is needed to craft custom indexes on several `RxStorage` implementations.

:::note
RxDB will always append the `primaryKey` to all indexes to ensure a deterministic sort order of query results. You do not have to add the `primaryKey` to any index.
:::

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
      },
      familyName: {
          type: 'string'
      },
      balance: {
          type: 'number',

          // number fields that are used in an index, must have set minimum, maximum and multipleOf
          minimum: 0,
          maximum: 100000,
          multipleOf: 0.01
      },
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


# internalIndexes

When you use RxDB on the server-side, you might want to use internalIndexes to speed up internal queries. [Read more](./rx-server.md#server-only-indexes)


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
  required: ['id']
};
```

## final
By setting a field to `final`, you make sure it cannot be modified later. Final fields are always required.
Final fields cannot be observed because they will not change.

Advantages:

- With final fields you can ensure that no-one accidentally modifies the data.
- When you enable the `eventReduce` algorithm, some performance-improvements are done.

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


## Non allowed properties

The schema is not only used to validate objects before they are written into the database, but also used to map getters to observe and populate single fieldnames, keycompression and other things. Therefore you can not use every schema which would be valid for the spec of [json-schema.org](http://json-schema.org/).
For example, fieldnames must match the regex `^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$` and `additionalProperties` is always set to `false`. But don't worry, RxDB will instantly throw an error when you pass an invalid schema into it.


Also the following class properties of `RxDocument` cannot be used as top level fields because they would clash when the RxDocument property is accessed:
```json
[
    "collection",
    "_data",
    "_propertyCache",
    "isInstanceOfRxDocument",
    "primaryPath",
    "primary",
    "revision",
    "deleted$",
    "deleted$$",
    "deleted",
    "getLatest",
    "$",
    "$$",
    "get$",
    "get$$",
    "populate",
    "get",
    "toJSON",
    "toMutableJSON",
    "update",
    "incrementalUpdate",
    "updateCRDT",
    "putAttachment",
    "putAttachmentBase64",
    "getAttachment",
    "allAttachments",
    "allAttachments$",
    "modify",
    "incrementalModify",
    "patch",
    "incrementalPatch",
    "_saveData",
    "remove",
    "incrementalRemove",
    "close",
    "deleted",
    "synced"
]
```


## FAQ

<details>
    <summary>How can I store a Date?</summary>
<div>
    With RxDB you can only store plain JSON data inside of a document. You cannot store a JavaScript `new Date()` instance directly. This is for performance reasons and because `Date()` is a mutable thing where changing it at any time might cause strange problem that are hard to debug.

    To store a date in RxDB, you have to define a string field with a `format` attribute:
    ```json
    {
       "type": "string",
       "format": "date-time"
    }
    ```

    When storing the data you have to first transform your `Date` object into a string `Date.toISOString()`.
    Because the `date-time` is sortable, you can do whatever query operations on that field and even use it as an index.


</div>
</details>

<details>
    <summary>How to store schemaless data?</summary>
<div>
    By design, RxDB requires that every collection has a schema. This means you cannot create a truly "schema-less" collection where top-level fields are unknown at schema creation time. RxDB must know about all fields of a document at the top level to perform validation, index creation, and other internal optimizations.
    However, there is a way to store data of arbitrary structure at sub-fields. To do this, define a property with `type: "object"` in your schema. For example:
    ```ts
    {
        "version": 0,
        "primaryKey": "id",
        "type": "object",
        "properties": {
            "id": {
                "type": "string",
                "maxLength": 100
            },
            "myDynamicData": {
                "type": "object"
                // Here you can store any JSON data
                // because it's an open object.
            }
        },
        "required": ["id"]
    }
    ```

</div>
</details>

<details>
    <summary>Why does RxDB automatically set `additionalProperties: false` at the top level</summary>
<div>
    RxDB automatically sets `additionalProperties: false` at the top level of a schema to ensure that all top-level fields are known in advance. This design choice offers several benefits:

- Prevents collisions with RxDocument class properties:
RxDB documents have built-in class methods (e.g., .toJSON, .save) at the top level. By forbidding unknown top-level properties, we avoid accidental naming collisions with these built-in methods.

- Avoids conflicts with user-defined ORM functions:
Developers can add custom [ORM methods](./orm.md) to RxDocuments. If top-level properties were unbounded, a property name could accidentally conflict with a method name, leading to unexpected behavior.

- Improves TypeScript typings:
If RxDB didn't know about all top-level fields, the document type would effectively become `any`. That means a simple typo like `myDocument.toJOSN()` would only be caught at runtime, not at build time. By disallowing unknown properties, TypeScript can provide strict typing and catch errors sooner.

</div>
</details>

<details>
    <summary>Can't change the schema of a collection</summary>
<div>
    When you make changes to the schema of a collection, you sometimes can get an error like
`Error: addCollections(): another instance created this collection with a different schema`.

This means you have created a collection before and added document-data to it.
When you now just change the schema, it is likely that the new schema does not match the saved documents inside of the collection.
This would cause strange bugs and would be hard to debug, so RxDB check's if your schema has changed and throws an error.

To change the schema in **production**-mode, do the following steps:

- Increase the `version` by 1
- Add the appropriate [migrationStrategies](https://pubkey.github.io/rxdb/migration-schema.html) so the saved data will be modified to match the new schema


In **development**-mode, the schema-change can be simplified by **one of these** strategies:

-   Use the memory-storage so your db resets on restart and your schema is not saved permanently
-   Call `removeRxDatabase('mydatabasename', RxStorage);` before creating a new RxDatabase-instance
-   Add a timestamp as suffix to the database-name to create a new one each run like `name: 'heroesDB' + new Date().getTime()`
</div>
</details>

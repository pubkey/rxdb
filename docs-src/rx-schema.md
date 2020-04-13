# RxSchema

Schemas define how your data looks. Which field should be used as primary, which fields should be used as indexes and what should be encrypted. The schema also validates that every inserted document of your collections conforms to the schema. Every collection has its own schema. With RxDB, schemas are defined with the [jsonschema](http://json-schema.org/)-standard which you might know from other projects.

## Example

In this example-schema we define a hero-collection with the following settings:

- the version-number of the schema is 0
- the name-property is the **primary**. This means its an unique, indexed, required string which can be used to definitely find a single document.
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
    "type": "object",
    "properties": {
        "name": {
            "type": "string",
            "primary": true
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
            "type": "string",
            "encrypted": true
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
    "required": ["color"],
    "attachments": {
        "encrypted": true
    }
  }
  ```

## Create a collection with the schema

```javascript
await myDatabase.collection({
  name: 'heroes',
  schema: myHeroSchema
});
console.dir(myDatabase.heroes.name);
// heroes
```


## version
The `version` field is a number, starting with `0`.
When the version is greater than 0, you have to provide the migrationStrategies to create a collection with this schema.

## keyCompression

Since version `8.0.0`, the keyCompression is disabled by default. If you have a huge amount of documents it makes sense to enable the keyCompression and save disk-space.
Notice that `keyCompression` can only be used on the **top-level** of a schema.

```javascript
const mySchema = {
  keyCompression: true, // set this to true, to enable the keyCompression
  version: 0,
  title: 'human schema no compression',
  type: 'object',
  properties: {
      firstName: {
          type: 'string'
      },
      lastName: {
          type: 'string'
      }
  },
  required: ['firstName', 'lastName']
};
```


## Indexes
RxDB supports secondary indexes which are defined at the schema-level of the collection.
To add a simple index, add `index: true` inside field options.
To add compound-indexes, add them in an array to a `compoundIndexes`-field at the top-level of the schema-definition.

Index is only allowed on field types `string`, `integer` and `number`

### Index-example

```js
const schemaWithIndexes = {
  version: 0,
  title: 'human schema no compression',
  keyCompression: true,
  type: 'object',
  properties: {
      firstName: {
          type: 'string',
          index: true       // <- an index for firstName will now be created
      },
      lastName: {
          type: 'string'
      },
      familyName: {
          type: 'string'
      }
  },
  compoundIndexes: [
      ['lastName', 'familyName']   // <- this will create a compound-index for these two fields
  ]
};
```

## attachments
To use attachments in the collection, you have to add the `attachments`-attribute to the schema. [See RxAttachment](./rx-attachment.md).

## default
Default values can only be defined for first-level fields.
Whenever you insert a document or create a temporary-document, unset fields will be filled with default-values.

```js
const schemaWithDefaultAge = {
  version: 0,
  type: 'object',
  properties: {
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
};
```

## final
By setting a field to `final`, you make sure it cannot be modified later. Final fields are always required.
Final fields cannot be observed because they anyway will not change.

Advantages:

- With final fields you can ensure that no other in your dev-team accidentally modifies the data
- When you enable the `query-change-detection`, some performance-improvements are done

```js
const schemaWithFinalAge = {
  version: 0,
  type: 'object',
  properties: {
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
};
```


## encryption

By setting a field to `encrypted: true` it will be stored encrypted inside of the data-store. The encryption will run internally, so when you get the `RxDocument`, you can access the unencrypted value.
You can set all fields to be encrypted, even nested objects. You can not run queries over encrypted fields.

```json
"mySecretField": {
    "type": "string",
    "encrypted": true
},
```


## NOTICE: Not everything within the jsonschema-spec is allowed
The schema is not only used to validate objects before they are written into the database, but also used to map getters to observe and populate single fieldnames, keycompression and other things. Therefore you can not use every schema which would be valid for the spec of [json-schema.org](http://json-schema.org/).
For example, fieldnames must match the regex `^[a-zA-Z][[a-zA-Z0-9_]*]?[a-zA-Z0-9]$` and `additionalProperties` is always set to `false`. But don't worry, RxDB will instantly throw an error when you pass a invalid schema into it.


--------------------------------------------------------------------------------

If you are new to RxDB, you should continue [here](./rx-collection.md)

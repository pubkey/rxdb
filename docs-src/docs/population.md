---
title: Populate and Link Docs in RxDB
slug: population.html
description: Learn how to reference and link documents across collections in RxDB. Discover easy population without joins and handle complex relationships.
image: /headers/population.jpg
---

# Population

There are no joins in RxDB but sometimes we still want references to documents in other collections. This is where population comes in. You can specify a relation from one [RxDocument](./rx-document.md) to another [RxDocument](./rx-document.md) in the same or another [RxCollection](./rx-collection.md) of the same database.
Then you can get the referenced document with the population getter.

This works exactly like population with [mongoose](http://mongoosejs.com/docs/populate.html).

## Schema with ref

The `ref` keyword in properties describes to which collection the field value belongs to (has a relationship). 

```javascript
export const refHuman = {
    title: 'human related to other human',
    version: 0,
    primaryKey: 'name',
    properties: {
        name: {
            type: 'string'
        },
        bestFriend: {
            ref: 'human',     // refers to collection human
            type: 'string'    // ref-values must always be string or ['string', 'null'] (primary of foreign RxDocument) 
        }
    }
};
```

You can also have a one-to-many reference by using a string array.

```js
export const schemaWithOneToManyReference = {
  version: 0,
  primaryKey: 'name',
  type: 'object',
  properties: {
    name: {
      type: 'string'
    },
    friends: {
      type: 'array',
      ref: 'human',
      items: {
        type: 'string'
      }
    }
  }
};
```

## populate()

### via method
To get the referred RxDocument, you can use the `populate()` method.
It takes the field path as attribute and returns a Promise which resolves to the foreign document or null if not found.

```javascript
await humansCollection.insert({
  name: 'Alice',
  bestFriend: 'Carol'
});
await humansCollection.insert({
  name: 'Bob',
  bestFriend: 'Alice'
});
const doc = await humansCollection.findOne('Bob').exec();
const bestFriend = await doc.populate('bestFriend');
console.dir(bestFriend); //> RxDocument[Alice]
```

### via getter
You can also get the populated RxDocument with the direct getter. To do this, you have to add an underscore suffix `_` to the field name.
This also works on nested values.

```javascript
await humansCollection.insert({
  name: 'Alice',
  bestFriend: 'Carol'
});
await humansCollection.insert({
  name: 'Bob',
  bestFriend: 'Alice'
});
const doc = await humansCollection.findOne('Bob').exec();
const bestFriend = await doc.bestFriend_; // notice the underscore `_`
console.dir(bestFriend); //> RxDocument[Alice]
```

## Example with nested reference

```javascript
const myCollection = await myDatabase.addCollections({
  human: {
    schema: {
      version: 0,
      type: 'object',
      properties: {
        name: {
          type: 'string'
        },
        family: {
          type: 'object',
          properties: {
            mother: {
              type: 'string',
              ref: 'human'
            }
          }
        }
      }
    }
  }
});

const mother = await myDocument.family.mother_;
console.dir(mother); //> RxDocument
```

## Example with array

```javascript
const myCollection = await myDatabase.addCollections({
  human: {
    schema: {
      version: 0,
      type: 'object',
      properties: {
        name: {
          type: 'string'
        },
        friends: {
          type: 'array',
          ref: 'human',
          items: {
              type: 'string'
          }
        }
      }
    }
  } 
});

//[insert other humans here]

await myCollection.insert({
  name: 'Alice',
  friends: [
    'Bob',
    'Carol',
    'Dave'
  ]
});

const doc = await humansCollection.findOne('Alice').exec();
const friends = await myDocument.friends_;
console.dir(friends); //> Array.<RxDocument>
```

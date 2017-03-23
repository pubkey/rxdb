# Population

There are no joins in RxDB but sometimes we still want references to documents in other collections. This is where population comes in. You can specify a relation to another RxDocument in the same or another RxCollection of the same database.

## Schema with ref

The `ref`-keyword describes which collection the field-value belongs to.

```javascript
export const refHuman = {
    title: 'human related to other human',
    version: 0,
    properties: {
        name: {
            primary: true,
            type: 'string'
        },
        bestFriend: {
            ref: 'human',     // refers to collection human
            type: 'string'    // ref-values must always be string (primary of foreign RxDocument)
        }
    }
};
```

## populate()

### via method
To get the refered RxDocument, you can use the populate()-method.
It takes the field-path as attribute and returns a Promise which resolves to the foreign document or null if not found.

```javascript
const doc = await humansCollection.findOne().exec();
const bestFriend = await doc.populate('bestFriend');
```

### via getter
You can also get the populated RxDocument with the direct getter. Therefore you have to add the underscore `_` to the fieldname.
This works also on nested values.

```javascript
const doc = await humansCollection.findOne().exec();
const bestFriend = await doc.bestFriend_; // added underscore_
```

## Example with nested reference

```javascript
const myCollection = await myDatabase.collection({
  name: 'human',
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
});

const mother = await myDocument.family.mother_;
console.dir(mother); //> RxDocument
```

## Example with array

```javascript
const myCollection = await myDatabase.collection({
  name: 'human',
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
});

const friends = await myDocument.friends_;
console.dir(friends); //> Array.<RxDocument>
```

---------
If you are new to RxDB, you should continue [here](./DataMigration.md)

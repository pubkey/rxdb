# Populate and Link Docs in RxDB

> Learn how to reference and link documents across collections in RxDB. Discover easy population without joins and handle complex relationships.

import {DocsAnimation} from '@site/src/components/docs-animation';
import {Population} from '@site/src/components/animations/population';

# Population

There are no joins in RxDB but sometimes we still want references to documents in other collections. This is where population comes in. You can specify a relation from one [RxDocument](./rx-document.md) to another [RxDocument](./rx-document.md) in the same or another [RxCollection](./rx-collection.md) of the same database.
Then you can get the referenced document with the population getter.

This works exactly like population with [mongoose](http://mongoosejs.com/docs/populate.html).

<DocsAnimation subtitle="Populating referenced documents from another collection">
<Population />
</DocsAnimation>

## Schema with ref

The `ref` keyword in properties describes to which collection the field value belongs to (has a relationship). 

```javascript
export const todoSchemaWithParent = {
    title: 'todo related to a parent todo',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        parent: {
            ref: 'todos',     // refers to collection todos
            // ref-values must always be string
            // or ['string', 'null']
            // (primary of foreign RxDocument)
            type: 'string'
        }
    },
    required: ['id', 'name']
};
```

You can also have a one-to-many reference by using a string array. The `subtasks` field of the [example schema](./rx-schema.md#example-schema) works this way.

```js
export const todoSchemaWithSubtasks = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100
    },
    name: {
      type: 'string'
    },
    subtasks: {
      type: 'array',
      ref: 'todos',
      items: {
        type: 'string'
      }
    }
  },
  required: ['id', 'name']
};
```

## populate()

### via method
To get the referred RxDocument, you can use the `populate()` method.
It takes the field path as attribute and returns a Promise which resolves to the foreign document or null if not found.
For an array field like `subtasks`, it resolves to an array of documents.

```javascript
await myDatabase.todos.bulkInsert([
  {
    id: 'todo1',
    name: 'Learn RxDB',
    done: false,
    dueAt: '2026-01-01T10:00:00.000Z',
    priority: 8,
    tags: ['learning', 'rxdb'],
    subtasks: ['todo3']
  },
  {
    id: 'todo3',
    name: 'Set up replication',
    dueAt: '2026-01-03T14:15:00.000Z',
    priority: 10,
    tags: ['rxdb', 'backend']
  }
]);
const doc = await myDatabase.todos.findOne('todo1').exec();
const subtasks = await doc.populate('subtasks');
console.dir(subtasks); //> [RxDocument[todo3]]
```

### via getter
You can also get the populated RxDocument with the direct getter. To do this, you have to add an underscore suffix `_` to the field name.
This also works on nested values.

```javascript
const doc = await myDatabase.todos.findOne('todo1').exec();
const subtasks = await doc.subtasks_; // notice the underscore `_`
console.dir(subtasks); //> [RxDocument[todo3]]
```

## Example with nested reference

```javascript
await myDatabase.addCollections({
  todos: {
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          maxLength: 100
        },
        name: {
          type: 'string'
        },
        relations: {
          type: 'object',
          properties: {
            parent: {
              type: 'string',
              ref: 'todos'
            }
          }
        }
      },
      required: ['id', 'name']
    }
  }
});

/**
 * We assume myDocument is a document from the collection
 */
const parent = await myDocument.relations.parent_;
console.dir(parent); //> RxDocument
```

## Example with array

```javascript
await myDatabase.addCollections({
  todos: {
    schema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {
          type: 'string',
          maxLength: 100
        },
        name: {
          type: 'string'
        },
        subtasks: {
          type: 'array',
          ref: 'todos',
          items: {
              type: 'string'
          }
        }
      },
      required: ['id', 'name']
    }
  } 
});

//[insert the subtasks todo2, todo3 and todo4 here]

await myDatabase.todos.insert({
  id: 'todo1',
  name: 'Learn RxDB',
  subtasks: [
    'todo2',
    'todo3',
    'todo4'
  ]
});

const doc = await myDatabase.todos.findOne('todo1').exec();
const subtasks = await doc.subtasks_;
console.dir(subtasks); //> Array.<RxDocument>
```

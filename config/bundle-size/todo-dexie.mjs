/**
 * A todo app with the Dexie.js storage
 * that inserts, queries, updates and removes documents.
 */
import { createRxDatabase } from '../../plugins/core/index.mjs';
import { getRxStorageDexie } from '../../plugins/storage-dexie/index.mjs';
import { todoSchema } from './todo-schema.mjs';

const db = await createRxDatabase({
    name: 'todos',
    storage: getRxStorageDexie()
});
await db.addCollections({
    todos: {
        schema: todoSchema
    }
});
db.todos.find({ sort: [{ createdAt: 'asc' }] }).$.subscribe(docs => console.log(docs.length));
const doc = await db.todos.insert({
    id: 'todo-1',
    title: 'buy milk',
    done: false,
    createdAt: Date.now()
});
await doc.patch({ done: true });
await doc.remove();

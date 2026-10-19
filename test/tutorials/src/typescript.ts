/**
 * this is the test for the typescript-tutorial
 * IMPORTANT: whenever you change something here,
 * ensure it is also changed in /docs-src/tutorials/typescript.md
 */

// import types
import {
    RxDatabase,
    RxCollection,
    RxJsonSchema,
    RxDocument,
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageMemory
} from 'rxdb/plugins/storage-memory';

/**
 * declare types
 */

type TodoDocType = {
    id: string;
    name: string;
    done: boolean;
    dueAt: string;
    priority: number;
    note?: string; // optional
};

type TodoDocMethods = {
    describe: (prefix: string) => string;
};

type TodoDocument = RxDocument<TodoDocType, TodoDocMethods>;

type TodoCollectionMethods = {
    countAllDocuments: () => Promise<number>;
}

type TodoCollection = RxCollection<TodoDocType, TodoDocMethods, TodoCollectionMethods>;

type MyDatabaseCollections = {
    todos: TodoCollection
};

type MyDatabase = RxDatabase<MyDatabaseCollections>;

async function run() {
    /**
     * create database and collections
     */
    const myDatabase: MyDatabase = await createRxDatabase<MyDatabaseCollections>({
        name: 'mydb',
        storage: getRxStorageMemory()
    });

    const todoSchema: RxJsonSchema<TodoDocType> = {
        title: 'todo schema',
        description: 'describes a single todo item',
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
            done: {
                type: 'boolean',
                default: false
            },
            dueAt: {
                type: 'string',
                format: 'date-time',
                maxLength: 30
            },
            priority: {
                type: 'integer',
                minimum: 0,
                maximum: 10,
                multipleOf: 1
            },
            note: {
                type: 'string'
            }
        },
        required: ['id', 'name', 'done', 'dueAt', 'priority'],
        indexes: ['dueAt']
    };

    const todoDocMethods: TodoDocMethods = {
        describe: function (this: TodoDocument, prefix: string) {
            return prefix + ': ' + this.name + ' (priority ' + this.priority + ')';
        }
    };

    const todoCollectionMethods: TodoCollectionMethods = {
        countAllDocuments: async function (this: TodoCollection) {
            const allDocs = await this.find().exec();
            return allDocs.length;
        }
    };

    await myDatabase.addCollections({
        todos: {
            schema: todoSchema,
            methods: todoDocMethods,
            statics: todoCollectionMethods
        }
    });

    // add a postInsert-hook
    myDatabase.todos.postInsert(
        function myPostInsertHook(
            this: TodoCollection, // own collection is bound to the scope
            docData: TodoDocType, // documents data
            doc: TodoDocument // RxDocument
        ) {
            console.log('insert to ' + this.name + '-collection: ' + doc.name);
        },
        false // not async
    );


    /**
     * use the database
     */

    // insert a document
    const todo: TodoDocument = await myDatabase.todos.insert({
        id: 'todo1',
        name: 'Learn RxDB',
        done: false,
        dueAt: '2026-01-01T10:00:00.000Z',
        priority: 8
    });

    // access a property
    console.log(todo.name);

    // use a orm method
    console.log(todo.describe('Next'));

    // use a static orm method from the collection
    const amount: number = await myDatabase.todos.countAllDocuments();
    console.log(amount);


    /**
     * clean up
     */
    myDatabase.close();
}

run();

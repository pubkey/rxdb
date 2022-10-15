import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageMemory
} from 'rxdb/plugins/memory';

export function test() {
    return 'test-success';
}




async function run() {
    const db = await createRxDatabase({
        name: 'flutter-test-db',
        storage: getRxStorageMemory(),
        multiInstance: false
    });

    await db.addCollections({
        heroes: {
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
                        type: 'string',
                        maxLength: 100
                    },
                    color: {
                        type: 'string',
                        maxLength: 30
                    }
                },
                indexes: ['name', 'color'],
                required: ['id', 'color']
            }
        }
    });

    const collection = db.heroes;

    const doc = await collection.insert({
        id: 'foobar',
        name: 'barfoo',
        color: 'red'
    });


    return doc.color;
};


(() => {
    process = {
        run,
        test
    }
})();

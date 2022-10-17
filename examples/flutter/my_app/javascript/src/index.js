import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageMemory
} from 'rxdb/plugins/memory';
import {
    getRxStorageLoki
} from 'rxdb/plugins/lokijs';
import {
    setFlutterRxDatabaseCreator,
    lokijsAdapterFlutter
} from './rxdb-flutter';

export function test() {
    return 'test-success';
}

async function createDB() {
    const db = await createRxDatabase({
        name: 'flutter-test-db',
        storage: getRxStorageLoki({
            adapter: lokijsAdapterFlutter
        }),
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
    return db;
}

setFlutterRxDatabaseCreator(
    createDB
);

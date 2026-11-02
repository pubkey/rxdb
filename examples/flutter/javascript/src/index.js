import {
    createRxDatabase,
    addRxPlugin
} from 'rxdb';
import {
    getRxStorageLoki
} from 'rxdb/plugins/storage-lokijs';
import {
    setFlutterRxDatabaseConnector,
    getLokijsAdapterFlutter
} from 'rxdb/plugins/flutter';
import { RxDBCleanupPlugin } from 'rxdb/plugins/cleanup';

addRxPlugin(RxDBCleanupPlugin);

async function createDB(databaseName) {
    const db = await createRxDatabase({
        name: databaseName,
        storage: getRxStorageLoki({
            adapter: getLokijsAdapterFlutter()
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

setFlutterRxDatabaseConnector(
    createDB
);

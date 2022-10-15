import {
    createRxDatabase
} from 'rxdb';
import {
    getRxStorageMemory
} from 'rxdb/plugins/memory';
import {
    getRxStorageLoki
} from 'rxdb/plugins/lokijs';

export function test() {
    return 'test-success';
}



/**
 * create a simple lokijs adapter so that we can persist string via flutter
 * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#creating-your-own-basic-persistence-adapter
 */
const lokijsAdapterFlutter = {
    async loadDatabase(dbname, callback) {
        // using dbname, load the database from wherever your adapter expects it
        const serializedDb = await readKeyValue(dbname);

        var success = true; // make your own determinations

        if (success) {
            callback(serializedDb);
        }
        else {
            callback(new Error('There was a problem loading the database'));
        }
    },
    async saveDatabase(dbname, dbstring, callback) {
        await persistKeyValue(dbname, dbstring);
      
        var success = true;  // make your own determinations
        if (success) {
          callback(null);
        }
        else {
          callback(new Error('An error was encountered loading " + dbname + " database.'));
        }
      }
};


async function run() {
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

    const collection = db.heroes;

    const doc = await collection.insert({
        id: 'foobar',
        name: 'barfoo',
        color: 'blue'
    });


    return doc.color;
}


(() => {
    process = {
        run,
        test
    }
})();

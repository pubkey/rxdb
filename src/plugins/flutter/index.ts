import type {
    RxDatabase
} from '../../types/index.d.ts';

export type CreateRxDatabaseFunctionType = (databaseName: string) => Promise<RxDatabase>;

export function setFlutterRxDatabaseConnector(
    createDB: CreateRxDatabaseFunctionType
) {
    (process as any).init = async (databaseName: string) => {
        const db = await createDB(databaseName);
        db.eventBulks$.subscribe(eventBulk => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            sendRxDBEvent(JSON.stringify(eventBulk));
        });
        (process as any).db = db;
        const collections: { name: string; primaryKey: string; }[] = [];
        Object.entries(db.collections).forEach(([collectionName, collection]) => {
            collections.push({
                name: collectionName,
                primaryKey: collection.schema.primaryPath
            });
        });
        return {
            databaseName,
            collections
        };
    };
}

/**
 * Create a simple lokijs adapter so that we can persist string via flutter
 * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#creating-your-own-basic-persistence-adapter
 */
export function getLokijsAdapterFlutter() {
    const ret = {
        async loadDatabase(databaseName: string, callback: (v: string | Error) => {}) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const serializedDb: string = await readKeyValue(databaseName);

            const success = true;
            if (success) {
                callback(serializedDb);
            } else {
                callback(new Error('There was a problem loading the database'));
            }
        },
        async saveDatabase(databaseName: string, dbstring: string, callback: (v: string | Error | null) => {}) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await persistKeyValue(databaseName, dbstring);

            const success = true;  // make your own determinations
            if (success) {
                callback(null);
            } else {
                callback(new Error('An error was encountered loading " + dbname + " database.'));
            }
        }
    };
    return ret;
}

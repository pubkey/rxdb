export function setFlutterRxDatabaseCreator(
    createDB
) {
    process.init = async () => {
        const db = await createDB();
        process.db = db;
        const databaseName = db.name;
        const collectionNames = Object.keys(db.collections);
        return {
            databaseName,
            collectionNames
        };
    };
}




/**
 * create a simple lokijs adapter so that we can persist string via flutter
 * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#creating-your-own-basic-persistence-adapter
 */
export const lokijsAdapterFlutter = {
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

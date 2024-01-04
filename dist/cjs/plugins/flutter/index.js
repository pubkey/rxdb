"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getLokijsAdapterFlutter = getLokijsAdapterFlutter;
exports.setFlutterRxDatabaseConnector = setFlutterRxDatabaseConnector;
function setFlutterRxDatabaseConnector(createDB) {
  process.init = async databaseName => {
    var db = await createDB(databaseName);
    db.eventBulks$.subscribe(eventBulk => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      sendRxDBEvent(JSON.stringify(eventBulk));
    });
    process.db = db;
    var collections = [];
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
function getLokijsAdapterFlutter() {
  var ret = {
    async loadDatabase(databaseName, callback) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      var serializedDb = await readKeyValue(databaseName);
      var success = true;
      if (success) {
        callback(serializedDb);
      } else {
        callback(new Error('There was a problem loading the database'));
      }
    },
    async saveDatabase(databaseName, dbstring, callback) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await persistKeyValue(databaseName, dbstring);
      var success = true; // make your own determinations
      if (success) {
        callback(null);
      } else {
        callback(new Error('An error was encountered loading " + dbname + " database.'));
      }
    }
  };
  return ret;
}
//# sourceMappingURL=index.js.map
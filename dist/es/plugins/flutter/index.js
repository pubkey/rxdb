export function setFlutterRxDatabaseConnector(createDB) {
  process.init = function (databaseName) {
    try {
      return Promise.resolve(createDB(databaseName)).then(function (db) {
        db.eventBulks$.subscribe(function (eventBulk) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          sendRxDBEvent(JSON.stringify(eventBulk));
        });
        process.db = db;
        var collections = [];
        Object.entries(db.collections).forEach(function (_ref) {
          var collectionName = _ref[0],
            collection = _ref[1];
          collections.push({
            name: collectionName,
            primaryKey: collection.schema.primaryPath
          });
        });
        return {
          databaseName: databaseName,
          collections: collections
        };
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
}

/**
 * Create a simple lokijs adapter so that we can persist string via flutter
 * @link https://github.com/techfort/LokiJS/blob/master/tutorials/Persistence%20Adapters.md#creating-your-own-basic-persistence-adapter
 */
export function getLokijsAdapterFlutter() {
  var ret = {
    loadDatabase: function loadDatabase(databaseName, callback) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return Promise.resolve(readKeyValue(databaseName)).then(function (serializedDb) {
          var success = true;
          if (success) {
            callback(serializedDb);
          } else {
            callback(new Error('There was a problem loading the database'));
          }
        });
      } catch (e) {
        return Promise.reject(e);
      }
    },
    saveDatabase: function saveDatabase(databaseName, dbstring, callback) {
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return Promise.resolve(persistKeyValue(databaseName, dbstring)).then(function () {
          var success = true; // make your own determinations
          if (success) {
            callback(null);
          } else {
            callback(new Error('An error was encountered loading " + dbname + " database.'));
          }
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }
  };
  return ret;
}
//# sourceMappingURL=index.js.map
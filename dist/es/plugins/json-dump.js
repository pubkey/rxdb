/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import { createRxQuery, queryCollection, _getDefaultQuery } from '../rx-query';
import { newRxError } from '../rx-error';
import { flatClone } from '../util';

function dumpRxDatabase(collections) {
  var _this = this;

  var json = {
    name: this.name,
    instanceToken: this.token,
    collections: []
  };
  var useCollections = Object.keys(this.collections).filter(function (colName) {
    return !collections || collections.includes(colName);
  }).filter(function (colName) {
    return colName.charAt(0) !== '_';
  }).map(function (colName) {
    return _this.collections[colName];
  });
  return Promise.all(useCollections.map(function (col) {
    return col.exportJSON();
  })).then(function (cols) {
    json.collections = cols;
    return json;
  });
}

var importDumpRxDatabase = function importDumpRxDatabase(dump) {
  var _this2 = this;

  /**
   * collections must be created before the import
   * because we do not know about the other collection-settings here
   */
  var missingCollections = dump.collections.filter(function (col) {
    return !_this2.collections[col.name];
  }).map(function (col) {
    return col.name;
  });

  if (missingCollections.length > 0) {
    throw newRxError('JD1', {
      missingCollections: missingCollections
    });
  }

  return Promise.all(dump.collections.map(function (colDump) {
    return _this2.collections[colDump.name].importJSON(colDump);
  }));
};

var dumpRxCollection = function dumpRxCollection() {
  var json = {
    name: this.name,
    schemaHash: this.schema.hash,
    docs: []
  };
  var query = createRxQuery('find', _getDefaultQuery(), this);
  return queryCollection(query).then(function (docs) {
    json.docs = docs.map(function (docData) {
      docData = flatClone(docData);
      delete docData._rev;
      delete docData._attachments;
      return docData;
    });
    return json;
  });
};

function importDumpRxCollection(exportedJSON) {
  var _this3 = this;

  // check schemaHash
  if (exportedJSON.schemaHash !== this.schema.hash) {
    throw newRxError('JD2', {
      schemaHash: exportedJSON.schemaHash,
      own: this.schema.hash
    });
  }

  var docs = exportedJSON.docs // validate schema
  .map(function (doc) {
    return _this3.schema.validate(doc);
  });
  return this.storageInstance.bulkWrite(docs.map(function (document) {
    return {
      document: document
    };
  }), 'json-dump-import');
}

export var RxDBJsonDumpPlugin = {
  name: 'json-dump',
  rxdb: true,
  prototypes: {
    RxDatabase: function RxDatabase(proto) {
      proto.exportJSON = dumpRxDatabase;
      proto.importJSON = importDumpRxDatabase;
    },
    RxCollection: function RxCollection(proto) {
      proto.exportJSON = dumpRxCollection;
      proto.importJSON = importDumpRxCollection;
    }
  },
  overwritable: {}
};
//# sourceMappingURL=json-dump.js.map
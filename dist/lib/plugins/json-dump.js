"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBJsonDumpPlugin = void 0;

var _rxQuery = require("../rx-query");

var _rxError = require("../rx-error");

var _util = require("../util");

/**
 * this plugin adds the json export/import capabilities to RxDB
 */
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
    throw (0, _rxError.newRxError)('JD1', {
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
  var query = (0, _rxQuery.createRxQuery)('find', (0, _rxQuery._getDefaultQuery)(), this);
  return (0, _rxQuery.queryCollection)(query).then(function (docs) {
    json.docs = docs.map(function (docData) {
      docData = (0, _util.flatClone)(docData);
      delete docData._rev;
      delete docData._attachments;
      return docData;
    });
    return json;
  });
};

function importDumpRxCollection(exportedJSON) {
  // check schemaHash
  if (exportedJSON.schemaHash !== this.schema.hash) {
    throw (0, _rxError.newRxError)('JD2', {
      schemaHash: exportedJSON.schemaHash,
      own: this.schema.hash
    });
  }

  var docs = exportedJSON.docs;
  return this.storageInstance.bulkWrite(docs.map(function (docData) {
    var document = Object.assign({}, docData, {
      _meta: {
        lwt: (0, _util.now)()
      },
      _rev: (0, _util.getDefaultRevision)(),
      _attachments: {},
      _deleted: false
    });
    return {
      document: document
    };
  }), 'json-dump-import');
}

var RxDBJsonDumpPlugin = {
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
exports.RxDBJsonDumpPlugin = RxDBJsonDumpPlugin;
//# sourceMappingURL=json-dump.js.map
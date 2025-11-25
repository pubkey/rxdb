"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBJsonDumpPlugin = void 0;
var _rxQuery = require("../../rx-query.js");
var _rxError = require("../../rx-error.js");
var _index = require("../../plugins/utils/index.js");
/**
 * this plugin adds the json export/import capabilities to RxDB
 */

function dumpRxDatabase(collections) {
  var json = {
    name: this.name,
    instanceToken: this.token,
    collections: []
  };
  var useCollections = Object.keys(this.collections).filter(colName => !collections || collections.includes(colName)).filter(colName => colName.charAt(0) !== '_').map(colName => this.collections[colName]);
  return Promise.all(useCollections.map(col => col.exportJSON())).then(cols => {
    json.collections = cols;
    return json;
  });
}
var importDumpRxDatabase = function (dump) {
  /**
   * collections must be created before the import
   * because we do not know about the other collection-settings here
   */
  var missingCollections = dump.collections.filter(col => !this.collections[col.name]).map(col => col.name);
  if (missingCollections.length > 0) {
    throw (0, _rxError.newRxError)('JD1', {
      missingCollections
    });
  }
  return Promise.all(dump.collections.map(colDump => this.collections[colDump.name].importJSON(colDump)));
};
var dumpRxCollection = async function () {
  var json = {
    name: this.name,
    schemaHash: await this.schema.hash,
    docs: []
  };
  var query = (0, _rxQuery.createRxQuery)('find', (0, _rxQuery._getDefaultQuery)(), this);
  return (0, _rxQuery.queryCollection)(query).then(result => {
    json.docs = result.docs.map(docData => {
      docData = (0, _index.flatClone)(docData);
      delete docData._rev;
      delete docData._attachments;
      return docData;
    });
    return json;
  });
};
async function importDumpRxCollection(exportedJSON) {
  // check schemaHash
  if (exportedJSON.schemaHash !== (await this.schema.hash)) {
    throw (0, _rxError.newRxError)('JD2', {
      schemaHash: exportedJSON.schemaHash,
      own: this.schema.hash
    });
  }
  var docs = exportedJSON.docs;
  return this.storageInstance.bulkWrite(docs.map(docData => {
    var document = Object.assign({}, docData, {
      _meta: {
        lwt: (0, _index.now)()
      },
      _rev: (0, _index.getDefaultRevision)(),
      _attachments: {},
      _deleted: false
    });
    return {
      document
    };
  }), 'json-dump-import');
}
var RxDBJsonDumpPlugin = exports.RxDBJsonDumpPlugin = {
  name: 'json-dump',
  rxdb: true,
  prototypes: {
    RxDatabase: proto => {
      proto.exportJSON = dumpRxDatabase;
      proto.importJSON = importDumpRxDatabase;
    },
    RxCollection: proto => {
      proto.exportJSON = dumpRxCollection;
      proto.importJSON = importDumpRxCollection;
    }
  },
  overwritable: {}
};
//# sourceMappingURL=index.js.map
/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import { createRxQuery, queryCollection, _getDefaultQuery } from "../../rx-query.js";
import { newRxError } from "../../rx-error.js";
import { flatClone, getDefaultRevision, now } from "../../plugins/utils/index.js";
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
    throw newRxError('JD1', {
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
  var query = createRxQuery('find', _getDefaultQuery(), this);
  return queryCollection(query).then(result => {
    json.docs = result.docs.map(docData => {
      docData = flatClone(docData);
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
    throw newRxError('JD2', {
      schemaHash: exportedJSON.schemaHash,
      own: this.schema.hash
    });
  }
  var docs = exportedJSON.docs;
  return this.storageInstance.bulkWrite(docs.map(docData => {
    var document = Object.assign({}, docData, {
      _meta: {
        lwt: now()
      },
      _rev: getDefaultRevision(),
      _attachments: {},
      _deleted: false
    });
    return {
      document
    };
  }), 'json-dump-import');
}
export var RxDBJsonDumpPlugin = {
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
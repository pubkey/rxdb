"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.RxDBJsonDumpPlugin = exports.overwritable = exports.prototypes = exports.rxdb = void 0;

var _util = require("../util");

var _rxQuery = require("../rx-query");

var _rxError = require("../rx-error");

var _rxChangeEvent = require("../rx-change-event");

/**
 * this plugin adds the json export/import capabilities to RxDB
 */
function dumpRxDatabase() {
  var _this = this;

  var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  var collections = arguments.length > 1 ? arguments[1] : undefined;
  var json = {
    name: this.name,
    instanceToken: this.token,
    encrypted: false,
    passwordHash: null,
    collections: []
  };

  if (this.password) {
    json.passwordHash = (0, _util.hash)(this.password);
    if (decrypted) json.encrypted = false;else json.encrypted = true;
  }

  var useCollections = Object.keys(this.collections).filter(function (colName) {
    return !collections || collections.includes(colName);
  }).filter(function (colName) {
    return colName.charAt(0) !== '_';
  }).map(function (colName) {
    return _this.collections[colName];
  });
  return Promise.all(useCollections.map(function (col) {
    return col.dump(decrypted);
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
    return _this2.collections[colDump.name].importDump(colDump);
  }));
};

var dumpRxCollection = function dumpRxCollection() {
  var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  var encrypted = !decrypted;
  var json = {
    name: this.name,
    schemaHash: this.schema.hash,
    encrypted: false,
    passwordHash: null,
    docs: []
  };

  if (this.database.password && encrypted) {
    json.passwordHash = (0, _util.hash)(this.database.password);
    json.encrypted = true;
  }

  var query = (0, _rxQuery.createRxQuery)('find', (0, _rxQuery._getDefaultQuery)(this), this);
  return this._pouchFind(query, undefined, encrypted).then(function (docs) {
    json.docs = docs.map(function (docData) {
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
    throw (0, _rxError.newRxError)('JD2', {
      schemaHash: exportedJSON.schemaHash,
      own: this.schema.hash
    });
  } // check if passwordHash matches own


  if (exportedJSON.encrypted && exportedJSON.passwordHash !== (0, _util.hash)(this.database.password)) {
    throw (0, _rxError.newRxError)('JD3', {
      passwordHash: exportedJSON.passwordHash,
      own: (0, _util.hash)(this.database.password)
    });
  }

  var docs = exportedJSON.docs // decrypt
  .map(function (doc) {
    return _this3._crypter.decrypt(doc);
  }) // validate schema
  .map(function (doc) {
    return _this3.schema.validate(doc);
  }) // transform
  .map(function (doc) {
    return _this3._handleToPouch(doc);
  });
  var startTime;
  return this.database.lockedRun( // write to disc
  function () {
    startTime = (0, _util.now)();
    return _this3.pouch.bulkDocs(docs);
  }).then(function () {
    var endTime = (0, _util.now)();
    docs.forEach(function (doc) {
      // emit change events
      var emitEvent = (0, _rxChangeEvent.createInsertEvent)(_this3, doc, startTime, endTime);

      _this3.$emit(emitEvent);
    });
  });
}

var rxdb = true;
exports.rxdb = rxdb;
var prototypes = {
  RxDatabase: function RxDatabase(proto) {
    proto.dump = dumpRxDatabase;
    proto.importDump = importDumpRxDatabase;
  },
  RxCollection: function RxCollection(proto) {
    proto.dump = dumpRxCollection;
    proto.importDump = importDumpRxCollection;
  }
};
exports.prototypes = prototypes;
var overwritable = {};
exports.overwritable = overwritable;
var RxDBJsonDumpPlugin = {
  name: 'json-dump',
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
exports.RxDBJsonDumpPlugin = RxDBJsonDumpPlugin;

//# sourceMappingURL=json-dump.js.map
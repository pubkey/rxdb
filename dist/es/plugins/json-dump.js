/**
 * this plugin adds the json export/import capabilities to RxDB
 */
import { hash } from '../util';
import RxQuery from '../rx-query';
import RxError from '../rx-error';
import RxChangeEvent from '../rx-change-event';
/**
 * @return {Promise}
 */

var dumpRxDatabase = function dumpRxDatabase() {
  var _this = this;

  var decrypted = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
  var collections = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  var json = {
    name: this.name,
    instanceToken: this.token,
    encrypted: false,
    passwordHash: null,
    collections: []
  };

  if (this.password) {
    json.passwordHash = hash(this.password);
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
};

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
    throw RxError.newRxError('JD1', {
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
    json.passwordHash = hash(this.database.password);
    json.encrypted = true;
  }

  var query = RxQuery.create('find', {}, this);
  return this._pouchFind(query, null, encrypted).then(function (docs) {
    json.docs = docs.map(function (docData) {
      delete docData._rev;
      return docData;
    });
    return json;
  });
};
/**
 * @return {Promise}
 */


var importDumpRxCollection = function importDumpRxCollection(exportedJSON) {
  var _this3 = this;

  // check schemaHash
  if (exportedJSON.schemaHash !== this.schema.hash) {
    throw RxError.newRxError('JD2', {
      schemaHash: exportedJSON.schemaHash,
      own: this.schema.hash
    });
  } // check if passwordHash matches own


  if (exportedJSON.encrypted && exportedJSON.passwordHash !== hash(this.database.password)) {
    throw RxError.newRxError('JD3', {
      passwordHash: exportedJSON.passwordHash,
      own: hash(this.database.password)
    });
  }

  var importFns = exportedJSON.docs // decrypt
  .map(function (doc) {
    return _this3._crypter.decrypt(doc);
  }) // validate schema
  .map(function (doc) {
    return _this3.schema.validate(doc);
  }) // import
  .map(function (doc) {
    return _this3._pouchPut(doc).then(function () {
      var primary = doc[_this3.schema.primaryPath]; // emit changeEvents

      var emitEvent = RxChangeEvent.create('INSERT', _this3.database, _this3, null, doc);
      emitEvent.data.doc = primary;

      _this3.$emit(emitEvent);
    });
  });
  return Promise.all(importFns);
};

export var rxdb = true;
export var prototypes = {
  RxDatabase: function RxDatabase(proto) {
    proto.dump = dumpRxDatabase;
    proto.importDump = importDumpRxDatabase;
  },
  RxCollection: function RxCollection(proto) {
    proto.dump = dumpRxCollection;
    proto.importDump = importDumpRxCollection;
  }
};
export var overwritable = {};
export default {
  rxdb: rxdb,
  prototypes: prototypes,
  overwritable: overwritable
};
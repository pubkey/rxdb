"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _pouch = require("./pouch");
Object.keys(_pouch).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _pouch[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _pouch[key];
    }
  });
});
var _rxAttachment = require("./rx-attachment");
Object.keys(_rxAttachment).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxAttachment[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxAttachment[key];
    }
  });
});
var _rxCollection = require("./rx-collection");
Object.keys(_rxCollection).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxCollection[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxCollection[key];
    }
  });
});
var _rxDatabase = require("./rx-database");
Object.keys(_rxDatabase).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDatabase[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDatabase[key];
    }
  });
});
var _rxDatabaseInternalStore = require("./rx-database-internal-store");
Object.keys(_rxDatabaseInternalStore).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDatabaseInternalStore[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDatabaseInternalStore[key];
    }
  });
});
var _rxDocument = require("./rx-document");
Object.keys(_rxDocument).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxDocument[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxDocument[key];
    }
  });
});
var _rxError = require("./rx-error");
Object.keys(_rxError).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxError[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxError[key];
    }
  });
});
var _rxPlugin = require("./rx-plugin");
Object.keys(_rxPlugin).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxPlugin[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxPlugin[key];
    }
  });
});
var _rxQuery = require("./rx-query");
Object.keys(_rxQuery).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxQuery[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxQuery[key];
    }
  });
});
var _rxSchema = require("./rx-schema");
Object.keys(_rxSchema).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxSchema[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxSchema[key];
    }
  });
});
var _rxStorage = require("./rx-storage");
Object.keys(_rxStorage).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorage[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorage[key];
    }
  });
});
var _rxStorage2 = require("./rx-storage.interface");
Object.keys(_rxStorage2).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxStorage2[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxStorage2[key];
    }
  });
});
var _replicationProtocol = require("./replication-protocol");
Object.keys(_replicationProtocol).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _replicationProtocol[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _replicationProtocol[key];
    }
  });
});
var _conflictHandling = require("./conflict-handling");
Object.keys(_conflictHandling).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _conflictHandling[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _conflictHandling[key];
    }
  });
});
var _rxChangeEvent = require("./rx-change-event");
Object.keys(_rxChangeEvent).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _rxChangeEvent[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _rxChangeEvent[key];
    }
  });
});
var _queryPlanner = require("./query-planner");
Object.keys(_queryPlanner).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _queryPlanner[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _queryPlanner[key];
    }
  });
});
var _util = require("./util");
Object.keys(_util).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _util[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _util[key];
    }
  });
});
var _replication = require("./plugins/replication");
Object.keys(_replication).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _replication[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _replication[key];
    }
  });
});
var _replicationGraphql = require("./plugins/replication-graphql");
Object.keys(_replicationGraphql).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _replicationGraphql[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _replicationGraphql[key];
    }
  });
});
var _localDocuments = require("./plugins/local-documents");
Object.keys(_localDocuments).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _localDocuments[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _localDocuments[key];
    }
  });
});
var _migration = require("./plugins/migration");
Object.keys(_migration).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _migration[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _migration[key];
    }
  });
});
var _backup = require("./plugins/backup");
Object.keys(_backup).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _backup[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _backup[key];
    }
  });
});
var _cleanup = require("./plugins/cleanup");
Object.keys(_cleanup).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _cleanup[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _cleanup[key];
    }
  });
});
var _lokijs = require("./plugins/lokijs");
Object.keys(_lokijs).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _lokijs[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _lokijs[key];
    }
  });
});
var _dexie = require("./plugins/dexie");
Object.keys(_dexie).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _dexie[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _dexie[key];
    }
  });
});
var _update = require("./plugins/update");
Object.keys(_update).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _update[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _update[key];
    }
  });
});
var _crdt = require("./plugins/crdt");
Object.keys(_crdt).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (key in exports && exports[key] === _crdt[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _crdt[key];
    }
  });
});
//# sourceMappingURL=index.d.js.map
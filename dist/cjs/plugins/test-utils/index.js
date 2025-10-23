"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
var _exportNames = {
  humansCollection: true,
  schemas: true,
  schemaObjects: true
};
exports.schemas = exports.schemaObjects = exports.humansCollection = void 0;
var _config = require("./config.js");
Object.keys(_config).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _config[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _config[key];
    }
  });
});
var humansCollectionConst = _interopRequireWildcard(require("./humans-collection.js"));
Object.keys(humansCollectionConst).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === humansCollectionConst[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return humansCollectionConst[key];
    }
  });
});
var _portManager = require("./port-manager.js");
Object.keys(_portManager).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _portManager[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _portManager[key];
    }
  });
});
var _revisions = require("./revisions.js");
Object.keys(_revisions).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _revisions[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _revisions[key];
    }
  });
});
var _testUtil = require("./test-util.js");
Object.keys(_testUtil).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _testUtil[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _testUtil[key];
    }
  });
});
var schemaObjectsConst = _interopRequireWildcard(require("./schema-objects.js"));
Object.keys(schemaObjectsConst).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === schemaObjectsConst[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return schemaObjectsConst[key];
    }
  });
});
var schemasConst = _interopRequireWildcard(require("./schemas.js"));
Object.keys(schemasConst).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === schemasConst[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return schemasConst[key];
    }
  });
});
var _replication = require("./replication.js");
Object.keys(_replication).forEach(function (key) {
  if (key === "default" || key === "__esModule") return;
  if (Object.prototype.hasOwnProperty.call(_exportNames, key)) return;
  if (key in exports && exports[key] === _replication[key]) return;
  Object.defineProperty(exports, key, {
    enumerable: true,
    get: function () {
      return _replication[key];
    }
  });
});
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
/**
 * This plugins contains thing that are needed for testing
 * in RxDB related context. Mostly used in the unit tests and
 * also in the tests for the premium and the server repository.
 */

var humansCollection = exports.humansCollection = humansCollectionConst;
var schemas = exports.schemas = schemasConst;
var schemaObjects = exports.schemaObjects = schemaObjectsConst;
//# sourceMappingURL=index.js.map
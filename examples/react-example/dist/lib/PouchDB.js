'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _pouchdbCore = require('pouchdb-core');

var _pouchdbCore2 = _interopRequireDefault(_pouchdbCore);

var _pouchdbFind = require('pouchdb-find');

var PouchDBFind = _interopRequireWildcard(_pouchdbFind);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * this handles the pouchdb-instance
 * to easy add modules and manipulate things
 * Adapters can be found here:
 * @link https://github.com/pouchdb/pouchdb/tree/master/packages/node_modules
 */
_pouchdbCore2.default.plugin(PouchDBFind);

// pouchdb-find
exports.default = _pouchdbCore2.default;
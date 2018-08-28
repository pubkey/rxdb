"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

require("@babel/polyfill");

var _index = _interopRequireDefault(require("./index.js"));

/**
 * this is the index for a browserify-build
 * which produces a single file that can be embeded into the html
 * and used via window.RxDB
 */
_index["default"].plugin(require('pouchdb-adapter-idb'));

_index["default"].plugin(require('pouchdb-adapter-http'));

window['RxDB'] = _index["default"];

"use strict";

var _interopRequireWildcard = require("@babel/runtime/helpers/interopRequireWildcard");

require("@babel/polyfill");

var RxDB = _interopRequireWildcard(require("./index.js"));

/**
 * this is the index for a browserify-build
 * which produces a single file that can be embeded into the html
 * and used via window.RxDB
 */
RxDB.addRxPlugin(require('pouchdb-adapter-idb'));
RxDB.addRxPlugin(require('pouchdb-adapter-http'));
window['RxDB'] = RxDB;

//# sourceMappingURL=browserify.index.js.map
'use strict';

require('babel-polyfill');

var _index = require('./index.js');

var _index2 = _interopRequireDefault(_index);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * this is the index for a browserify-build
 * which produces a single file that can be embeded into the html
 * and used via window.RxDB
 */

_index2['default'].plugin(require('pouchdb-adapter-idb'));
_index2['default'].plugin(require('pouchdb-adapter-http'));

window['RxDB'] = _index2['default'];

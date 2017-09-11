/**
 * this is the index for a browserify-build
 * which produces a single file that can be embeded into the html
 * and used via window.RxDB
 */

import 'babel-polyfill';
import RxDB from './index.js';

RxDB.plugin(require('pouchdb-adapter-idb'));
RxDB.plugin(require('pouchdb-adapter-http'));

window['RxDB'] = RxDB;

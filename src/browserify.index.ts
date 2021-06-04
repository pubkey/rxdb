/**
 * this is the index for a browserify-build
 * which produces a single file that can be embeded into the html
 * and used via window.RxDB
 */

import '@babel/polyfill';
import * as RxDB from './index.js';

RxDB.addPouchPlugin(require('pouchdb-adapter-idb'));
RxDB.addPouchPlugin(require('pouchdb-adapter-http'));

(window as any)['RxDB'] = RxDB;

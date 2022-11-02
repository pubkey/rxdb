/**
 * this is the index for a browserify-build
 * which produces a single file that can be embedded into the html
 * and used via window.RxDB
 */

import '@babel/polyfill';
import * as RxDB from './index.js';
import * as RxDbPouchPlugin from './plugins/pouchdb/index.js';
RxDbPouchPlugin.addPouchPlugin(require('pouchdb-adapter-idb'));
RxDbPouchPlugin.addPouchPlugin(require('pouchdb-adapter-http'));
window['RxDB'] = RxDB;
//# sourceMappingURL=browserify.index.js.map
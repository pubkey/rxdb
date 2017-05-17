import 'babel-polyfill';
import * as RxDB from './index.js';

RxDB.plugin(require('pouchdb-adapter-idb'));
RxDB.plugin(require('pouchdb-adapter-http'));
RxDB.plugin(require('pouchdb-replication'));

window['RxDB'] = RxDB;
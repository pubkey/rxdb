/**
 * this is the index for a browserify-build
 * which produces a single file that can be embedded into the html
 * and used via window.RxDB
 */

import '@babel/polyfill';
import * as RxDB from './index.js';

(window as any)['RxDB'] = RxDB;

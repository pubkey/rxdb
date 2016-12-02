'use strict';

require('es5-shim');

var tape   = require('tape');
var localstorage = require('../');
var testCommon = require('./testCommon');
var testBuffer = new Buffer('hello');

require('abstract-leveldown/abstract/leveldown-test').args(localstorage, tape);
require('abstract-leveldown/abstract/open-test').args(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/del-test').all(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/put-test').all(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/get-test').all(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/put-get-del-test').all(
  localstorage, tape, testCommon, testBuffer);
require('abstract-leveldown/abstract/close-test').close(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/iterator-test').all(localstorage, tape, testCommon);

require('abstract-leveldown/abstract/chained-batch-test').all(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/approximate-size-test').setUp(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/approximate-size-test').args(localstorage, tape, testCommon);

require('abstract-leveldown/abstract/ranges-test').all(localstorage, tape, testCommon);
require('abstract-leveldown/abstract/batch-test').all(localstorage, tape, testCommon);

require('./custom-tests.js').all(localstorage, tape, testCommon);


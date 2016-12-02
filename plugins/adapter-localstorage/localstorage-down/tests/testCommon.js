'use strict';

var storage = require('humble-localstorage');

var dbidx = 0;
var theLocation = function () {
  return '_leveldown_test_db_' + dbidx++;
};

var lastLocation = function () {
  return '_leveldown_test_db_' + dbidx;
};

var cleanup = function (callback) {
  storage.clear();

  return callback();
};

var setUp = function (t) {
  cleanup(function (err) {
    t.notOk(err, 'cleanup returned an error');
    t.end();
  });
};

var tearDown = function (t) {
  setUp(t); // same cleanup!
};

var collectEntries = function (iterator, callback) {
  var data = [];
  var next = function () {
    iterator.next(function (err, key, value) {
      if (err) {
        return callback(err);
      }
      if ((!arguments.length) || (key === undefined) || (key === null)) {
        return iterator.end(function (err) {
          callback(err, data);
        });
      }

      data.push({ key: key, value: value });
      process.nextTick(next);
    });
  };
  next();
};

var makeExistingDbTest = function (name, test, leveldown, testFn) {
  test(name, function (t) {
    cleanup(function () {
      var loc = location();
      var db = leveldown(loc);
      var done = function (close) {
        if (close === false) {
          return cleanup(t.end.bind(t));
        }
        db.close(function (err) {
          t.notOk(err, 'no error from close()');
          cleanup(t.end.bind(t));
        });
      };
      db.open(function (err) {
        t.notOk(err, 'no error from open()');
        db.batch([
          { type: 'put', key: 'one', value: '1' },
          { type: 'put', key: 'two', value: '2' },
          { type: 'put', key: 'three', value: '3' }
        ], function (err) {
          t.notOk(err, 'no error from batch()');
          testFn(db, t, done, loc);
        });
      });
    });
  });
};

module.exports = {
  location: theLocation,
  cleanup: cleanup,
  lastLocation: lastLocation,
  setUp: setUp,
  tearDown: tearDown,
  collectEntries: collectEntries,
  makeExistingDbTest: makeExistingDbTest
};

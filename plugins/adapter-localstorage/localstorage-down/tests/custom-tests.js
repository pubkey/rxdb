'use strict';

var levelup = require('levelup');
  
module.exports.setUp = function (leveldown, test, testCommon) {
  test('setUp common', testCommon.setUp);
  test('setUp db', function (t) {
    var db = leveldown(testCommon.location());
    db.open(t.end.bind(t));
  });
};

module.exports.all = function (leveldown, tape, testCommon) {

  module.exports.setUp(leveldown, tape, testCommon);

  tape('test .destroy', function (t) {
    var db = levelup('destroy-test', {db: leveldown});
    var db2 = levelup('other-db', {db: leveldown});
    db2.put('key2', 'value2', function (err) {
      t.notOk(err, 'no error' );
      db.put('key', 'value', function (err) {
        t.notOk(err, 'no error');
        db.get('key', function (err, value) {
          t.notOk(err, 'no error');
          t.equal(value, 'value', 'should have value');
          db.close(function (err) {
            t.notOk(err, 'no error');
            leveldown.destroy('destroy-test', function (err) {
              t.notOk(err, 'no error');
              var db3 = levelup('destroy-test', {db: leveldown});
              db3.get('key', function (err, value) {
                t.ok(err, 'key is not there');
                db2.get('key2', function (err, value) {
                  t.notOk(err, 'no error');
                  t.equal(value, 'value2', 'should have value2');
                  t.end();
                });
              });
            });
          });
        });
      });
    });
  });

  tape('test .destroy with multiple dbs', function (t) {
    var db = levelup('a', {db: leveldown});
    var db2 = levelup('b', {db: leveldown});
    var db3 = levelup('c', {db: leveldown});
    db.put('1', '1', function (err) {
      t.notOk(err, 'no error');
      db2.put('1', '1', function (err) {
        t.notOk(err, 'no error');
        db3.put('1', '1', function (err) {
          t.notOk(err, 'no error');
          db2.put('2', '2', function (err) {
            t.notOk(err, 'no error');
            db2.put('3', '3', function (err) {
              t.notOk(err, 'no error');
              leveldown.destroy('b', function (err) {
                t.notOk(err, 'no error');
                db3.get('1', function (err, res) {
                  t.notOk(err, 'no error');
                  t.equal(res, '1');
                  db2 = levelup('b', {db: leveldown});
                  db2.get('3', function (err) {
                    t.ok(err);
                    t.end();
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  tape('test escaped db name', function (t) {
    var db = levelup('bang!', {db: leveldown});
    var db2 = levelup('bang!!', {db: leveldown});
    db.put('!db1', '!db1', function (err) {
      t.notOk(err, 'no error');
      db2.put('db2', 'db2', function (err) {
        t.notOk(err, 'no error');
        db.close(function (err) {
          t.notOk(err, 'no error');
          db2.close(function (err) {
            t.notOk(err, 'no error');
            db = levelup('bang!', {db: leveldown});
            db.get('!db2', function (err, key, value) {
              t.ok(err, 'got error');
              t.equal(key, undefined, 'key should be null');
              t.equal(value, undefined, 'value should be null');
              t.end();
            });
          });
        });
      });
    });
  });

  tape('delete while iterating', function (t) {
    var db = leveldown(testCommon.location());
    var noerr = function (err) {
      t.error(err, 'opens crrectly');
    };
    var noop = function () {};
    var iterator;
    db.open(noerr);
    db.put('a', 'A', noop);
    db.put('b', 'B', noop);
    db.put('c', 'C', noop);
    iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: 'a' });
    iterator.next(function (err, key, value) {
      t.equal(key, 'a');
      t.equal(value, 'A');
      db.del('b', function (err) {
        t.notOk(err, 'no error');
        iterator.next(function (err, key, value) {
          t.notOk(err, 'no error');
          t.ok(key, 'key exists');
          t.ok(value, 'value exists');
          t.end();
        });
      });
    });
  });

  tape('add many while iterating', function (t) {
    var db = leveldown(testCommon.location());
    var noerr = function (err) {
      t.error(err, 'opens crrectly');
    };
    var noop = function () {};
    var iterator;
    db.open(noerr);
    db.put('c', 'C', noop);
    db.put('d', 'D', noop);
    db.put('e', 'E', noop);
    iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: 'c' });
    iterator.next(function (err, key, value) {
      t.equal(key, 'c');
      t.equal(value, 'C');
      db.del('c', function (err) {
        t.notOk(err, 'no error');
        db.put('a', 'A', function (err) {
          t.notOk(err, 'no error');
          db.put('b', 'B', function (err) {
            t.notOk(err, 'no error');
            iterator.next(function (err, key, value) {
              t.notOk(err, 'no error');
              t.ok(key, 'key exists');
              t.ok(value, 'value exists');
              t.ok(key >= 'c', 'key "' + key + '" should be greater than c');
              t.end();
            });
          });
        });
      });
    });
  });

  tape('concurrent batch delete while iterating', function (t) {
    var db = leveldown(testCommon.location());
    var noerr = function (err) {
      t.error(err, 'opens crrectly');
    };
    var noop = function () {};
    var iterator;
    db.open(noerr);
    db.put('a', 'A', noop);
    db.put('b', 'B', noop);
    db.put('c', 'C', noop);
    iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: 'a' });
    iterator.next(function (err, key, value) {
      t.equal(key, 'a');
      t.equal(value, 'A');
      db.batch([{
        type: 'del',
        key: 'b'
      }], noerr);
      iterator.next(function (err, key, value) {
        t.notOk(err, 'no error');
        // on backends that support snapshots, it will be 'b'.
        // else it will be 'c'
        t.ok(key, 'key should exist');
        t.ok(value, 'value should exist');
        t.end();
      });
    });
  });

  tape('iterate past end of db', function (t) {
    var db = leveldown('aaaaaa');
    var db2 = leveldown('bbbbbb');
    var noerr = function (err) {
      t.error(err, 'opens crrectly');
    };
    var noop = function () {};
    var iterator;
    db.open(noerr);
    db2.open(noerr);
    db.put('1', '1', noop);
    db.put('2', '2', noop);
    db2.put('3', '3', noop);
    iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: '1' });
    iterator.next(function (err, key, value) {
      t.equal(key, '1');
      t.equal(value, '1');
      t.notOk(err, 'no error');
      iterator.next(function (err, key, value) {
        t.notOk(err, 'no error');
        t.equals(key, '2');
        t.equal(value, '2');
        iterator.next(function (err, key, value) {
          t.notOk(key, 'should not actually have a key');
          t.end();
        });
      });
    });
  });

  tape('next() callback is dezalgofied', function (t) {
    var db = leveldown('aaaaaa');
    var noerr = function (err) {
      t.error(err, 'opens crrectly');
    };
    var noop = function () {};
    var iterator;
    db.open(noerr);
    db.put('1', '1', noop);
    db.put('2', '2', noop);
    iterator = db.iterator({ keyAsBuffer: false, valueAsBuffer: false, start: '1' });

    var zalgoReleased = false;
    iterator.next(function (err, key, value) {
      zalgoReleased = true;
      t.notOk(err, 'no error');
      var zalgoReleased2 = false;
      iterator.next(function (err, key, value) {
        zalgoReleased2 = true;
        t.notOk(err, 'no error');
        var zalgoReleased3 = false;
        iterator.next(function (err, key, value) {
          zalgoReleased3 = true;
          t.notOk(err, 'no error');
          t.end();
        });
        t.ok(!zalgoReleased3, 'zalgo not released (3)');
      });
      t.ok(!zalgoReleased2, 'zalgo not released (2)');
    });
    t.ok(!zalgoReleased, 'zalgo not released (1)');
  });
};

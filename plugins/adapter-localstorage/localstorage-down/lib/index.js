'use strict';

var inherits = require('inherits');
var AbstractLevelDOWN = require('abstract-leveldown').AbstractLevelDOWN;
var AbstractIterator = require('abstract-leveldown').AbstractIterator;

var LocalStorage = require('./localstorage').LocalStorage;
var LocalStorageCore = require('./localstorage-core');
var utils = require('./utils');

// see http://stackoverflow.com/a/15349865/680742
var nextTick = global.setImmediate || process.nextTick;

function LDIterator(db, options) {

  AbstractIterator.call(this, db);

  this._reverse = !!options.reverse;
  this._endkey     = options.end;
  this._startkey   = options.start;
  this._gt      = options.gt;
  this._gte     = options.gte;
  this._lt      = options.lt;
  this._lte     = options.lte;
  this._exclusiveStart = options.exclusiveStart;
  this._limit = options.limit;
  this._count = 0;

  this.onInitCompleteListeners = [];
}

inherits(LDIterator, AbstractIterator);

LDIterator.prototype._init = function (callback) {
  nextTick(function () {
    callback();
  });
};

LDIterator.prototype._next = function (callback) {
  var self = this;

  function onInitComplete() {
    if (self._pos === self._keys.length || self._pos < 0) { // done reading
      return callback();
    }

    var key = self._keys[self._pos];

    if (!!self._endkey && (self._reverse ? key < self._endkey : key > self._endkey)) {
      return callback();
    }

    if (!!self._limit && self._limit > 0 && self._count++ >= self._limit) {
      return callback();
    }

    if ((self._lt  && key >= self._lt) ||
      (self._lte && key > self._lte) ||
      (self._gt  && key <= self._gt) ||
      (self._gte && key < self._gte)) {
      return callback();
    }

    self._pos += self._reverse ? -1 : 1;
    self.db.container.getItem(key, function (err, value) {
      if (err) {
        if (err.message === 'NotFound') {
          return nextTick(function () {
            self._next(callback);
          });
        }
        return callback(err);
      }
      callback(null, key, value);
    });
  }
  if (!self.initStarted) {
    process.nextTick(function () {
      self.initStarted = true;
      self._init(function (err) {
        if (err) {
          return callback(err);
        }
        self.db.container.keys(function (err, keys) {
          if (err) {
            return callback(err);
          }
          self._keys = keys;
          if (self._startkey) {
            var index = utils.sortedIndexOf(self._keys, self._startkey);
            var startkey = (index >= self._keys.length || index < 0) ?
              undefined : self._keys[index];
            self._pos = index;
            if (self._reverse) {
              if (self._exclusiveStart || startkey !== self._startkey) {
                self._pos--;
              }
            } else if (self._exclusiveStart && startkey === self._startkey) {
              self._pos++;
            }
          } else {
            self._pos = self._reverse ? self._keys.length - 1 : 0;
          }
          onInitComplete();

          self.initCompleted = true;
          var i = -1;
          while (++i < self.onInitCompleteListeners.length) {
            nextTick(self.onInitCompleteListeners[i]);
          }
        });
      });
    });
  } else if (!self.initCompleted) {
    self.onInitCompleteListeners.push(onInitComplete);
  } else {
    process.nextTick(onInitComplete);
  }
};

function LD(location) {
  if (!(this instanceof LD)) {
    return new LD(location);
  }
  AbstractLevelDOWN.call(this, location);
  this.container = new LocalStorage(location);
}

inherits(LD, AbstractLevelDOWN);

LD.prototype._open = function (options, callback) {
  this.container.init(callback);
};

LD.prototype._put = function (key, value, options, callback) {

  var err = checkKeyValue(key, 'key');

  if (err) {
    return nextTick(function () {
      callback(err);
    });
  }

  err = checkKeyValue(value, 'value');

  if (err) {
    return nextTick(function () {
      callback(err);
    });
  }

  if (typeof value === 'object' && !Buffer.isBuffer(value) && value.buffer === undefined) {
    var obj = {};
    obj.storetype = "json";
    obj.data = value;
    value = JSON.stringify(obj);
  }

  this.container.setItem(key, value, callback);
};

LD.prototype._get = function (key, options, callback) {

  var err = checkKeyValue(key, 'key');

  if (err) {
    return nextTick(function () {
      callback(err);
    });
  }

  if (!Buffer.isBuffer(key)) {
    key = String(key);
  }
  this.container.getItem(key, function (err, value) {

    if (err) {
      return callback(err);
    }

    if (options.asBuffer !== false && !Buffer.isBuffer(value)) {
      value = new Buffer(value);
    }


    if (options.asBuffer === false) {
      if (value.indexOf("{\"storetype\":\"json\",\"data\"") > -1) {
        var res = JSON.parse(value);
        value = res.data;
      }
    }
    callback(null, value);
  });
};

LD.prototype._del = function (key, options, callback) {

  var err = checkKeyValue(key, 'key');

  if (err) {
    return nextTick(function () {
      callback(err);
    });
  }
  if (!Buffer.isBuffer(key)) {
    key = String(key);
  }

  this.container.removeItem(key, callback);
};

LD.prototype._batch = function (array, options, callback) {
  var self = this;
  nextTick(function () {
    var err;
    var key;
    var value;

    var numDone = 0;
    var overallErr;
    function checkDone() {
      if (++numDone === array.length) {
        callback(overallErr);
      }
    }

    if (Array.isArray(array) && array.length) {
      for (var i = 0; i < array.length; i++) {
        var task = array[i];
        if (task) {
          key = Buffer.isBuffer(task.key) ? task.key : String(task.key);
          err = checkKeyValue(key, 'key');
          if (err) {
            overallErr = err;
            checkDone();
          } else if (task.type === 'del') {
            self._del(task.key, options, checkDone);
          } else if (task.type === 'put') {
            value = Buffer.isBuffer(task.value) ? task.value : String(task.value);
            err = checkKeyValue(value, 'value');
            if (err) {
              overallErr = err;
              checkDone();
            } else {
              self._put(key, value, options, checkDone);
            }
          }
        } else {
          checkDone();
        }
      }
    } else {
      callback();
    }
  });
};

LD.prototype._iterator = function (options) {
  return new LDIterator(this, options);
};

LD.destroy = function (name, callback) {
  LocalStorageCore.destroy(name, callback);
};

function checkKeyValue(obj, type) {
  if (obj === null || obj === undefined) {
    return new Error(type + ' cannot be `null` or `undefined`');
  }
  if (obj === null || obj === undefined) {
    return new Error(type + ' cannot be `null` or `undefined`');
  }

  if (type === 'key') {

    if (obj instanceof Boolean) {
      return new Error(type + ' cannot be `null` or `undefined`');
    }
    if (obj === '') {
      return new Error(type + ' cannot be empty');
    }
  }
  if (obj.toString().indexOf("[object ArrayBuffer]") === 0) {
    if (obj.byteLength === 0 || obj.byteLength === undefined) {
      return new Error(type + ' cannot be an empty Buffer');
    }
  }

  if (Buffer.isBuffer(obj)) {
    if (obj.length === 0) {
      return new Error(type + ' cannot be an empty Buffer');
    }
  } else if (String(obj) === '') {
    return new Error(type + ' cannot be an empty String');
  }
}

module.exports = LD;

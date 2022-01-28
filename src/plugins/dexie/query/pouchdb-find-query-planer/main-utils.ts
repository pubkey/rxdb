import {
    getFieldFromDoc,
    setFieldInDoc,
    parseField
} from 'pouchdb-selector-core';

import { nextTick } from 'pouchdb-utils';

function once(fun) {
    var called = false;
    return getArguments(function (args) {
        if (called) {
            console.trace();
            throw new Error('once called  more than once');
        } else {
            called = true;
            fun.apply(this, args);
        }
    });
}
function getArguments(fun) {
    return function () {
        var len = arguments.length;
        var args = new Array(len);
        var i = -1;
        while (++i < len) {
            args[i] = arguments[i];
        }
        return fun.call(this, args);
    };
}
function toPromise(func) {
    //create the function we will be returning
    return getArguments(function (args) {
        var self = this;
        var tempCB = (typeof args[args.length - 1] === 'function') ? args.pop() : false;
        // if the last argument is a function, assume its a callback
        var usedCB;
        if (tempCB) {
            // if it was a callback, create a new callback which calls it,
            // but do so async so we don't trap any errors
            usedCB = function (err, resp) {
                nextTick(function () {
                    tempCB(err, resp);
                });
            };
        }
        var promise = new Promise(function (fulfill, reject) {
            try {
                var callback = once(function (err, mesg) {
                    if (err) {
                        reject(err);
                    } else {
                        fulfill(mesg);
                    }
                });
                // create a callback for this invocation
                // apply the function in the orig context
                args.push(callback);
                func.apply(self, args);
            } catch (e) {
                reject(e);
            }
        });
        // if there is a callback, call it back
        if (usedCB) {
            promise.then(function (result) {
                usedCB(null, result);
            }, usedCB);
        }
        promise.cancel = function () {
            return this;
        };
        return promise;
    });
}

function callbackify(fun) {
    return getArguments(function (args) {
        var cb = args.pop();
        var promise = fun.apply(this, args);
        promisedCallback(promise, cb);
        return promise;
    });
}

function promisedCallback(promise, callback) {
    promise.then(function (res) {
        nextTick(function () {
            callback(null, res);
        });
    }, function (reason) {
        nextTick(function () {
            callback(reason);
        });
    });
    return promise;
}

export const flatten = getArguments(function (args) {
    var res = [];
    for (var i = 0, len = args.length; i < len; i++) {
        var subArr = args[i];
        if (Array.isArray(subArr)) {
            res = res.concat(flatten.apply(null, subArr));
        } else {
            res.push(subArr);
        }
    }
    return res;
});

export function mergeObjects(arr) {
    var res = {};
    for (var i = 0, len = arr.length; i < len; i++) {
        res = Object.assign(res, arr[i]);
    }
    return res;
}

// Selects a list of fields defined in dot notation from one doc
// and copies them to a new doc. Like underscore _.pick but supports nesting.
function pick(obj, arr) {
    var res = {};
    for (var i = 0, len = arr.length; i < len; i++) {
        var parsedField = parseField(arr[i]);
        var value = getFieldFromDoc(obj, parsedField);
        if (typeof value !== 'undefined') {
            setFieldInDoc(res, parsedField, value);
        }
    }
    return res;
}

// e.g. ['a'], ['a', 'b'] is true, but ['b'], ['a', 'b'] is false
export function oneArrayIsSubArrayOfOther(left, right) {

    for (var i = 0, len = Math.min(left.length, right.length); i < len; i++) {
        if (left[i] !== right[i]) {
            return false;
        }
    }
    return true;
}

// e.g.['a', 'b', 'c'], ['a', 'b'] is false
export function oneArrayIsStrictSubArrayOfOther(left, right) {

    if (left.length > right.length) {
        return false;
    }

    return oneArrayIsSubArrayOfOther(left, right);
}

// same as above, but treat the left array as an unordered set
// e.g. ['b', 'a'], ['a', 'b', 'c'] is true, but ['c'], ['a', 'b', 'c'] is false
export function oneSetIsSubArrayOfOther(left, right) {
    left = left.slice();
    for (var i = 0, len = right.length; i < len; i++) {
        var field = right[i];
        if (!left.length) {
            break;
        }
        var leftIdx = left.indexOf(field);
        if (leftIdx === -1) {
            return false;
        } else {
            left.splice(leftIdx, 1);
        }
    }
    return true;
}

export function arrayToObject(arr) {
    var res = {};
    for (var i = 0, len = arr.length; i < len; i++) {
        res[arr[i]] = true;
    }
    return res;
}

export function max(arr, fun) {
    var max = null;
    var maxScore = -1;
    for (var i = 0, len = arr.length; i < len; i++) {
        var element = arr[i];
        var score = fun(element);
        if (score > maxScore) {
            maxScore = score;
            max = element;
        }
    }
    return max;
}

export function arrayEquals(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (var i = 0, len = arr1.length; i < len; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}

export function uniq(arr) {
    var obj = {};
    for (var i = 0; i < arr.length; i++) {
        obj['$' + arr[i]] = true;
    }
    return Object.keys(obj).map(function (key) {
        return key.substring(1);
    });
}

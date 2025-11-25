"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.NoIndexHuman = NoIndexHuman;
exports.TEST_DATA_CHARSET_LAST_SORTED = exports.TEST_DATA_CHARSET = void 0;
exports.averageSchemaData = averageSchemaData;
exports.bigHumanDocumentType = bigHumanDocumentType;
exports.compoundIndexData = compoundIndexData;
exports.compoundIndexNoStringData = compoundIndexNoStringData;
exports.deepNestedHumanData = deepNestedHumanData;
exports.encryptedDeepHumanDocumentType = encryptedDeepHumanDocumentType;
exports.encryptedHumanData = encryptedHumanData;
exports.encryptedObjectHumanData = encryptedObjectHumanData;
exports.heroArrayData = heroArrayData;
exports.humanData = humanData;
exports.humanWithCompositePrimary = humanWithCompositePrimary;
exports.humanWithIdAndAgeIndexDocumentType = humanWithIdAndAgeIndexDocumentType;
exports.humanWithOwnershipData = humanWithOwnershipData;
exports.humanWithSubOther = humanWithSubOther;
exports.humanWithTimestampData = humanWithTimestampData;
exports.nestedHumanData = nestedHumanData;
exports.nostringIndex = nostringIndex;
exports.pointData = pointData;
exports.randomStringWithSpecialChars = randomStringWithSpecialChars;
exports.refHumanData = refHumanData;
exports.refHumanNestedData = refHumanNestedData;
exports.simpleHeroArray = simpleHeroArray;
exports.simpleHumanAge = simpleHumanAge;
exports.simpleHumanData = simpleHumanData;
exports.simpleHumanV3Data = simpleHumanV3Data;
var schemas = _interopRequireWildcard(require("./schemas.js"));
var _index = require("../utils/index.js");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (var _t in e) "default" !== _t && {}.hasOwnProperty.call(e, _t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, _t)) && (i.get || i.set) ? o(f, _t, i) : f[_t] = e[_t]); return f; })(e, t); }
/**
 * this file contains objects which match the schemas in schemas.js
 */

/**
 * Some storages had problems with umlauts and other special chars.
 * So we add these to all test strings.
 */
var TEST_DATA_CHARSET = exports.TEST_DATA_CHARSET = '0987654321ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÖÄßÜ[]{}\'';
var TEST_DATA_CHARSET_LAST_SORTED = exports.TEST_DATA_CHARSET_LAST_SORTED = (0, _index.ensureNotFalsy)((0, _index.lastOfArray)(TEST_DATA_CHARSET.split('').sort()));
var someEmojisArr = ['😊', '💩', '👵', '🍌', '🏳️‍🌈', '😃'];
var baseChars = TEST_DATA_CHARSET.split('');
var allChars = baseChars.slice(0);
(0, _index.appendToArray)(allChars, someEmojisArr);
function randomStringWithSpecialChars(minLength,
/**
 * It has shown that alternating string lengths
 * can reproduce various problems. So by having variable
 * lengths we ensure that this fully works.
 */
maxLength) {
  var text = '';
  if (!minLength || !maxLength || minLength > maxLength) {
    throw new Error('invalid length given ' + minLength + ' ' + maxLength);
  }
  var length = (0, _index.randomNumber)(minLength, maxLength);
  while (text.length < length) {
    if (text.length === 0) {
      /**
       * TODO foundationdb does not work correctly when an index string starts
       * with an emoji. This can likely be fixed by upgrading foundationdb to the
       * latest version.
       */
      text += baseChars[Math.floor(Math.random() * baseChars.length)];
    } else {
      text += allChars[Math.floor(Math.random() * allChars.length)];
    }
  }

  /**
   * Because emojis can have a string.length of 2,
   * we can sometimes end up with strings that are longer
   * than the provided length. In that cases we have to rerun.
   */
  if (text.length > length) {
    return randomStringWithSpecialChars(minLength, maxLength);
  }
  return text;
}
function humanData(passportId = randomStringWithSpecialChars(8, 12), age = (0, _index.randomNumber)(10, 50), firstName = randomStringWithSpecialChars(8, 12)) {
  return {
    passportId: passportId,
    firstName,
    lastName: randomStringWithSpecialChars(8, 12),
    age
  };
}
function simpleHumanData() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    lastName: randomStringWithSpecialChars(8, 12)
  };
}
function simpleHumanV3Data(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(8, 12),
    age: (0, _index.randomNumber)(10, 50)
  };
  return Object.assign(defaultObj, partial);
}
function simpleHumanAge(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(8, 12),
    age: (0, _index.randomNumber)(10, 50) + ''
  };
  return Object.assign(defaultObj, partial);
}
function humanWithSubOther() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    other: {
      age: (0, _index.randomNumber)(10, 50)
    }
  };
}
function NoIndexHuman() {
  return {
    firstName: randomStringWithSpecialChars(8, 12),
    lastName: randomStringWithSpecialChars(8, 12)
  };
}
function nestedHumanData(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    mainSkill: {
      name: randomStringWithSpecialChars(4, 6),
      level: 5
    }
  };
  return Object.assign(defaultObj, partial);
}
function deepNestedHumanData() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    mainSkill: {
      name: randomStringWithSpecialChars(4, 6),
      attack: {
        good: false,
        count: 5
      }
    }
  };
}
function bigHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    dnaHash: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    lastName: randomStringWithSpecialChars(8, 12),
    age: (0, _index.randomNumber)(10, 50)
  };
}
function heroArrayData() {
  return {
    name: randomStringWithSpecialChars(6, 8),
    skills: new Array(3).fill(0).map(() => {
      return {
        name: randomStringWithSpecialChars(4, 6),
        damage: (0, _index.randomNumber)(10, 50)
      };
    })
  };
}
function simpleHeroArray(partial = {}) {
  var defaultObj = {
    name: randomStringWithSpecialChars(6, 8),
    skills: new Array(3).fill(0).map(() => randomStringWithSpecialChars(3, 6))
  };
  return Object.assign(defaultObj, partial);
}
function encryptedHumanData(secret = randomStringWithSpecialChars(8, 12)) {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    secret
  };
}
function encryptedObjectHumanData() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    secret: {
      name: randomStringWithSpecialChars(8, 12),
      subname: randomStringWithSpecialChars(8, 12)
    }
  };
}
function encryptedDeepHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    firstLevelPassword: randomStringWithSpecialChars(8, 12),
    secretData: {
      pw: randomStringWithSpecialChars(8, 12)
    },
    deepSecret: {
      darkhole: {
        pw: randomStringWithSpecialChars(8, 12)
      }
    },
    nestedSecret: {
      darkhole: {
        pw: randomStringWithSpecialChars(8, 12)
      }
    }
  };
}
function compoundIndexData() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    passportCountry: randomStringWithSpecialChars(8, 12),
    age: (0, _index.randomNumber)(10, 50)
  };
}
function compoundIndexNoStringData() {
  return {
    passportId: randomStringWithSpecialChars(8, 12),
    passportCountry: {
      [randomStringWithSpecialChars(8, 12)]: randomStringWithSpecialChars(8, 12)
    },
    age: (0, _index.randomNumber)(10, 50)
  };
}
function nostringIndex() {
  return {
    passportId: {},
    firstName: randomStringWithSpecialChars(8, 12)
  };
}
function refHumanData(bestFriend) {
  return {
    name: randomStringWithSpecialChars(8, 12),
    bestFriend
  };
}
function refHumanNestedData(bestFriend) {
  return {
    name: randomStringWithSpecialChars(8, 12),
    foo: {
      bestFriend
    }
  };
}
function humanWithTimestampData(givenData = {}) {
  var ret = {
    id: randomStringWithSpecialChars(8, 12),
    name: randomStringWithSpecialChars(8, 12),
    age: (0, _index.randomNumber)(1, 100),
    // use some time in the past week
    updatedAt: Date.now()
  };
  ret = Object.assign({}, ret, givenData);
  return ret;
}
var averageSchemaForFieldLength = schemas.averageSchema();
function averageSchemaData(partial = {}) {
  return Object.assign({}, {
    id: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.id.maxLength - 1), (0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.id.maxLength)),
    var1: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.var1.maxLength) - 3, (0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.var1.maxLength)),
    var2: (0, _index.randomNumber)(100, (0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.var2.maximum)),
    deep: {
      deep1: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.deep.properties.deep1.maxLength) - 3, (0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.deep.properties.deep1.maxLength)),
      deep2: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.deep.properties.deep2.maxLength) - 3, (0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.deep.properties.deep2.maxLength)),
      deeper: {
        deepNr: (0, _index.randomNumber)(0, 10)
      }
    },
    list: new Array(5).fill(0).map(() => ({
      deep1: randomStringWithSpecialChars(2, 5),
      deep2: randomStringWithSpecialChars(5, 8)
    }))
  }, partial);
}
function pointData() {
  return {
    id: randomStringWithSpecialChars(8, 12),
    x: (0, _index.randomNumber)(1, 100),
    y: (0, _index.randomNumber)(1, 100)
  };
}
function humanWithIdAndAgeIndexDocumentType(age = (0, _index.randomNumber)(1, 100)) {
  return {
    id: randomStringWithSpecialChars(8, 12),
    name: randomStringWithSpecialChars(8, 12),
    age
  };
}
function humanWithCompositePrimary(partial = {}) {
  var defaultObj = {
    firstName: randomStringWithSpecialChars(8, 12),
    lastName: randomStringWithSpecialChars(8, 12),
    info: {
      age: (0, _index.randomNumber)(10, 50)
    }
  };
  return Object.assign(defaultObj, partial);
}
function humanWithOwnershipData(partial = {}, owner) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(8, 12),
    firstName: randomStringWithSpecialChars(8, 12),
    lastName: randomStringWithSpecialChars(8, 12),
    age: (0, _index.randomNumber)(10, 50),
    owner
  };
  return Object.assign(defaultObj, partial);
}
//# sourceMappingURL=schema-objects.js.map
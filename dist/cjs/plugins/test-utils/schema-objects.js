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
var _faker = require("@faker-js/faker");
var _asyncTestUtil = require("async-test-util");
var schemas = _interopRequireWildcard(require("./schemas.js"));
var _index = require("../utils/index.js");
function _getRequireWildcardCache(e) { if ("function" != typeof WeakMap) return null; var r = new WeakMap(), t = new WeakMap(); return (_getRequireWildcardCache = function (e) { return e ? t : r; })(e); }
function _interopRequireWildcard(e, r) { if (!r && e && e.__esModule) return e; if (null === e || "object" != typeof e && "function" != typeof e) return { default: e }; var t = _getRequireWildcardCache(r); if (t && t.has(e)) return t.get(e); var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) { var i = a ? Object.getOwnPropertyDescriptor(e, u) : null; i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u]; } return n.default = e, t && t.set(e, n), n; }
/**
 * this file contains objects which match the schemas in schemas.js
 */

/**
 * Some storages had problems with umlauts and other special chars.
 * So we add these to all test strings.
 * TODO add emojis
 */
var TEST_DATA_CHARSET = exports.TEST_DATA_CHARSET = '0987654321ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÖÄßÜ[]{}\'';
var TEST_DATA_CHARSET_LAST_SORTED = exports.TEST_DATA_CHARSET_LAST_SORTED = (0, _index.ensureNotFalsy)((0, _index.lastOfArray)(TEST_DATA_CHARSET.split('').sort()));
// const someEmojis = '😊💩👵🍌';
function randomStringWithSpecialChars(length) {
  return (0, _asyncTestUtil.randomString)(length, TEST_DATA_CHARSET);
}
function humanData(passportId = randomStringWithSpecialChars(12), age = (0, _asyncTestUtil.randomNumber)(10, 50), firstName = _faker.faker.person.firstName()) {
  return {
    passportId: passportId,
    firstName,
    lastName: _faker.faker.person.lastName(),
    age
  };
}
function simpleHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: _faker.faker.person.firstName(),
    lastName: _faker.faker.person.lastName()
  };
}
function simpleHumanV3Data(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    age: (0, _asyncTestUtil.randomNumber)(10, 50)
  };
  return Object.assign(defaultObj, partial);
}
function simpleHumanAge(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    age: (0, _asyncTestUtil.randomNumber)(10, 50) + ''
  };
  return Object.assign(defaultObj, partial);
}
function humanWithSubOther() {
  return {
    passportId: randomStringWithSpecialChars(12),
    other: {
      age: (0, _asyncTestUtil.randomNumber)(10, 50)
    }
  };
}
function NoIndexHuman() {
  return {
    firstName: _faker.faker.person.firstName(),
    lastName: _faker.faker.person.lastName()
  };
}
function nestedHumanData(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    firstName: _faker.faker.person.firstName(),
    mainSkill: {
      name: randomStringWithSpecialChars(6),
      level: 5
    }
  };
  return Object.assign(defaultObj, partial);
}
function deepNestedHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    mainSkill: {
      name: randomStringWithSpecialChars(6),
      attack: {
        good: false,
        count: 5
      }
    }
  };
}
function bigHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(12),
    dnaHash: randomStringWithSpecialChars(12),
    firstName: _faker.faker.person.firstName(),
    lastName: _faker.faker.person.lastName(),
    age: (0, _asyncTestUtil.randomNumber)(10, 50)
  };
}
function heroArrayData() {
  return {
    name: randomStringWithSpecialChars(6),
    skills: new Array(3).fill(0).map(() => {
      return {
        name: randomStringWithSpecialChars(6),
        damage: (0, _asyncTestUtil.randomNumber)(10, 50)
      };
    })
  };
}
function simpleHeroArray(partial = {}) {
  var defaultObj = {
    name: randomStringWithSpecialChars(6),
    skills: new Array(3).fill(0).map(() => randomStringWithSpecialChars(6))
  };
  return Object.assign(defaultObj, partial);
}
function encryptedHumanData(secret = randomStringWithSpecialChars(12)) {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: _faker.faker.person.firstName(),
    secret
  };
}
function encryptedObjectHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: _faker.faker.person.firstName(),
    secret: {
      name: randomStringWithSpecialChars(12),
      subname: randomStringWithSpecialChars(12)
    }
  };
}
function encryptedDeepHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: _faker.faker.person.firstName(),
    firstLevelPassword: randomStringWithSpecialChars(12),
    secretData: {
      pw: randomStringWithSpecialChars(12)
    },
    deepSecret: {
      darkhole: {
        pw: randomStringWithSpecialChars(12)
      }
    },
    nestedSecret: {
      darkhole: {
        pw: randomStringWithSpecialChars(12)
      }
    }
  };
}
function compoundIndexData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    passportCountry: randomStringWithSpecialChars(12),
    age: (0, _asyncTestUtil.randomNumber)(10, 50)
  };
}
function compoundIndexNoStringData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    passportCountry: {
      [randomStringWithSpecialChars(12)]: randomStringWithSpecialChars(12)
    },
    age: (0, _asyncTestUtil.randomNumber)(10, 50)
  };
}
function nostringIndex() {
  return {
    passportId: {},
    firstName: _faker.faker.person.firstName()
  };
}
function refHumanData(bestFriend) {
  return {
    name: randomStringWithSpecialChars(12),
    bestFriend
  };
}
function refHumanNestedData(bestFriend) {
  return {
    name: randomStringWithSpecialChars(12),
    foo: {
      bestFriend
    }
  };
}
function humanWithTimestampData(givenData = {}) {
  var ret = {
    id: randomStringWithSpecialChars(12),
    name: _faker.faker.person.firstName(),
    age: (0, _asyncTestUtil.randomNumber)(1, 100),
    // use some time in the past week
    updatedAt: Date.now()
  };
  ret = Object.assign({}, ret, givenData);
  return ret;
}
var averageSchemaForFieldLength = schemas.averageSchema();
function averageSchemaData(partial = {}) {
  return Object.assign({}, {
    id: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.id.maxLength)),
    var1: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.var1.maxLength)),
    var2: (0, _asyncTestUtil.randomNumber)(100, (0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.var2.maximum)),
    deep: {
      deep1: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.deep.properties.deep1.maxLength)),
      deep2: randomStringWithSpecialChars((0, _index.ensureNotFalsy)(averageSchemaForFieldLength.properties.deep.properties.deep2.maxLength)),
      deeper: {
        deepNr: (0, _asyncTestUtil.randomNumber)(0, 10)
      }
    },
    list: new Array(5).fill(0).map(() => ({
      deep1: randomStringWithSpecialChars(5),
      deep2: randomStringWithSpecialChars(8)
    }))
  }, partial);
}
function pointData() {
  return {
    id: randomStringWithSpecialChars(12),
    x: _faker.faker.number.int(),
    y: _faker.faker.number.int()
  };
}
function humanWithIdAndAgeIndexDocumentType(age = (0, _asyncTestUtil.randomNumber)(1, 100)) {
  return {
    id: randomStringWithSpecialChars(12),
    name: _faker.faker.person.firstName(),
    age
  };
}
function humanWithCompositePrimary(partial = {}) {
  var defaultObj = {
    firstName: _faker.faker.person.firstName(),
    lastName: _faker.faker.person.lastName(),
    info: {
      age: (0, _asyncTestUtil.randomNumber)(10, 50)
    }
  };
  return Object.assign(defaultObj, partial);
}
//# sourceMappingURL=schema-objects.js.map
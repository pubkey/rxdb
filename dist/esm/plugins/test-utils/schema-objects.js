/**
 * this file contains objects which match the schemas in schemas.js
 */

import { randomNumber } from 'async-test-util';
import * as schemas from "./schemas.js";
import { appendToArray, ensureNotFalsy, lastOfArray } from "../utils/index.js";

/**
 * Some storages had problems with umlauts and other special chars.
 * So we add these to all test strings.
 */
export var TEST_DATA_CHARSET = '0987654321ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÖÄßÜ[]{}\'';
export var TEST_DATA_CHARSET_LAST_SORTED = ensureNotFalsy(lastOfArray(TEST_DATA_CHARSET.split('').sort()));
var someEmojisArr = ['😊', '💩', '👵', '🍌', '🏳️‍🌈', '😃'];
var baseChars = TEST_DATA_CHARSET.split('');
var allChars = baseChars.slice(0);
appendToArray(allChars, someEmojisArr);
export function randomStringWithSpecialChars(length) {
  var text = '';
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
    return randomStringWithSpecialChars(length);
  }
  return text;
}
export function humanData(passportId = randomStringWithSpecialChars(12), age = randomNumber(10, 50), firstName = randomStringWithSpecialChars(12)) {
  return {
    passportId: passportId,
    firstName,
    lastName: randomStringWithSpecialChars(12),
    age
  };
}
export function simpleHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: randomStringWithSpecialChars(12),
    lastName: randomStringWithSpecialChars(12)
  };
}
export function simpleHumanV3Data(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    age: randomNumber(10, 50)
  };
  return Object.assign(defaultObj, partial);
}
export function simpleHumanAge(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    age: randomNumber(10, 50) + ''
  };
  return Object.assign(defaultObj, partial);
}
export function humanWithSubOther() {
  return {
    passportId: randomStringWithSpecialChars(12),
    other: {
      age: randomNumber(10, 50)
    }
  };
}
export function NoIndexHuman() {
  return {
    firstName: randomStringWithSpecialChars(12),
    lastName: randomStringWithSpecialChars(12)
  };
}
export function nestedHumanData(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    firstName: randomStringWithSpecialChars(12),
    mainSkill: {
      name: randomStringWithSpecialChars(6),
      level: 5
    }
  };
  return Object.assign(defaultObj, partial);
}
export function deepNestedHumanData() {
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
export function bigHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(12),
    dnaHash: randomStringWithSpecialChars(12),
    firstName: randomStringWithSpecialChars(12),
    lastName: randomStringWithSpecialChars(12),
    age: randomNumber(10, 50)
  };
}
export function heroArrayData() {
  return {
    name: randomStringWithSpecialChars(6),
    skills: new Array(3).fill(0).map(() => {
      return {
        name: randomStringWithSpecialChars(6),
        damage: randomNumber(10, 50)
      };
    })
  };
}
export function simpleHeroArray(partial = {}) {
  var defaultObj = {
    name: randomStringWithSpecialChars(6),
    skills: new Array(3).fill(0).map(() => randomStringWithSpecialChars(6))
  };
  return Object.assign(defaultObj, partial);
}
export function encryptedHumanData(secret = randomStringWithSpecialChars(12)) {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: randomStringWithSpecialChars(12),
    secret
  };
}
export function encryptedObjectHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: randomStringWithSpecialChars(12),
    secret: {
      name: randomStringWithSpecialChars(12),
      subname: randomStringWithSpecialChars(12)
    }
  };
}
export function encryptedDeepHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: randomStringWithSpecialChars(12),
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
export function compoundIndexData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    passportCountry: randomStringWithSpecialChars(12),
    age: randomNumber(10, 50)
  };
}
export function compoundIndexNoStringData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    passportCountry: {
      [randomStringWithSpecialChars(12)]: randomStringWithSpecialChars(12)
    },
    age: randomNumber(10, 50)
  };
}
export function nostringIndex() {
  return {
    passportId: {},
    firstName: randomStringWithSpecialChars(12)
  };
}
export function refHumanData(bestFriend) {
  return {
    name: randomStringWithSpecialChars(12),
    bestFriend
  };
}
export function refHumanNestedData(bestFriend) {
  return {
    name: randomStringWithSpecialChars(12),
    foo: {
      bestFriend
    }
  };
}
export function humanWithTimestampData(givenData = {}) {
  var ret = {
    id: randomStringWithSpecialChars(12),
    name: randomStringWithSpecialChars(12),
    age: randomNumber(1, 100),
    // use some time in the past week
    updatedAt: Date.now()
  };
  ret = Object.assign({}, ret, givenData);
  return ret;
}
var averageSchemaForFieldLength = schemas.averageSchema();
export function averageSchemaData(partial = {}) {
  return Object.assign({}, {
    id: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.id.maxLength)),
    var1: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.var1.maxLength)),
    var2: randomNumber(100, ensureNotFalsy(averageSchemaForFieldLength.properties.var2.maximum)),
    deep: {
      deep1: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.deep.properties.deep1.maxLength)),
      deep2: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.deep.properties.deep2.maxLength)),
      deeper: {
        deepNr: randomNumber(0, 10)
      }
    },
    list: new Array(5).fill(0).map(() => ({
      deep1: randomStringWithSpecialChars(5),
      deep2: randomStringWithSpecialChars(8)
    }))
  }, partial);
}
export function pointData() {
  return {
    id: randomStringWithSpecialChars(12),
    x: randomNumber(1, 100),
    y: randomNumber(1, 100)
  };
}
export function humanWithIdAndAgeIndexDocumentType(age = randomNumber(1, 100)) {
  return {
    id: randomStringWithSpecialChars(12),
    name: randomStringWithSpecialChars(12),
    age
  };
}
export function humanWithCompositePrimary(partial = {}) {
  var defaultObj = {
    firstName: randomStringWithSpecialChars(12),
    lastName: randomStringWithSpecialChars(12),
    info: {
      age: randomNumber(10, 50)
    }
  };
  return Object.assign(defaultObj, partial);
}
//# sourceMappingURL=schema-objects.js.map
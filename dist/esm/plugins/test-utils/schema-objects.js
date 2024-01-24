/**
 * this file contains objects which match the schemas in schemas.js
 */

import { faker } from '@faker-js/faker';
import { randomNumber, randomString } from 'async-test-util';
import * as schemas from "./schemas.js";
import { ensureNotFalsy, lastOfArray } from "../utils/index.js";

/**
 * Some storages had problems with umlauts and other special chars.
 * So we add these to all test strings.
 * TODO add emojis
 */
export var TEST_DATA_CHARSET = '0987654321ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÖÄßÜ[]{}\'';
export var TEST_DATA_CHARSET_LAST_SORTED = ensureNotFalsy(lastOfArray(TEST_DATA_CHARSET.split('').sort()));
// const someEmojis = '😊💩👵🍌';
export function randomStringWithSpecialChars(length) {
  return randomString(length, TEST_DATA_CHARSET);
}
export function humanData(passportId = randomStringWithSpecialChars(12), age = randomNumber(10, 50), firstName = faker.person.firstName()) {
  return {
    passportId: passportId,
    firstName,
    lastName: faker.person.lastName(),
    age
  };
}
export function simpleHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName()
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
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName()
  };
}
export function nestedHumanData(partial = {}) {
  var defaultObj = {
    passportId: randomStringWithSpecialChars(12),
    firstName: faker.person.firstName(),
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
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
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
    firstName: faker.person.firstName(),
    secret
  };
}
export function encryptedObjectHumanData() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: faker.person.firstName(),
    secret: {
      name: randomStringWithSpecialChars(12),
      subname: randomStringWithSpecialChars(12)
    }
  };
}
export function encryptedDeepHumanDocumentType() {
  return {
    passportId: randomStringWithSpecialChars(12),
    firstName: faker.person.firstName(),
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
    firstName: faker.person.firstName()
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
    name: faker.person.firstName(),
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
    x: faker.number.int(),
    y: faker.number.int()
  };
}
export function humanWithIdAndAgeIndexDocumentType(age = randomNumber(1, 100)) {
  return {
    id: randomStringWithSpecialChars(12),
    name: faker.person.firstName(),
    age
  };
}
export function humanWithCompositePrimary(partial = {}) {
  var defaultObj = {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    info: {
      age: randomNumber(10, 50)
    }
  };
  return Object.assign(defaultObj, partial);
}
//# sourceMappingURL=schema-objects.js.map
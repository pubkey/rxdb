/**
 * this file contains objects which match the schemas in schemas.js
 */

import faker from 'faker';
import randomToken from 'random-token';
import randomInt from 'random-int';

export function human(passportId) {
    if (!passportId) passportId = randomToken(12);
    return {
        passportId: passportId,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: randomInt(10, 50)
    };
}

export function simpleHuman() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    };
}

export function simpleHumanAge() {
    return {
        passportId: randomToken(12),
        age: randomInt(10, 50) + ''
    };
}

export function nestedHuman() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        mainSkill: {
            name: randomToken(6),
            level: 5
        }
    };
}

export function deepNestedHuman() {
    return {
        passportId: randomToken(12),
        mainSkill: {
            name: randomToken(6),
            attack: {
                good: false,
                count: 5
            }
        }
    };
}

export function heroArray() {
    return {
        name: randomToken(6),
        skills: new Array(3).fill(0).map(() => {
            return {
                name: randomToken(6),
                damage: randomInt(10, 50)
            };
        })
    };
}

export function encryptedHuman() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        secret: randomToken(12)
    };
}

export function encryptedObjectHuman() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        secret: {
            name: randomToken(12),
            subname: randomToken(12)
        }
    };
}

export function refHuman(bestFriend) {
    return {
        name: randomToken(12),
        bestFriend
    };
}

export function refHumanNested(bestFriend) {
    return {
        name: randomToken(12),
        foo: {
            bestFriend
        }
    };
}

export function averageSchema() {
    return {
        id: randomToken(12),
        var1: randomToken(12),
        var2: randomInt(100, 50000),
        deep: {
            deep1: randomToken(5),
            deep2: randomToken(8)
        },
        list: new Array(5).fill(0).map(() => ({
            deep1: randomToken(5),
            deep2: randomToken(8)
        }))
    };
}

export function point() {
    return {
        x: faker.random.number(),
        y: faker.random.number()
    };
}

export function _idPrimary() {
    return {
        _id: randomToken(12),
        firstName: faker.name.firstName()
    };
}

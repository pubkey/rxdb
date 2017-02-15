/**
 * this file contains objects which metch the schemas in schema.js
 */

import * as faker from 'faker';
import {
    default as randomToken
} from 'random-token';
import {
    default as randomInt
} from 'random-int';

export function human() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: randomInt(10, 50)
    };
};

export function simpleHuman() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    };
};

export function simpleHumanAge() {
    return {
        passportId: randomToken(12),
        age: randomInt(10, 50) + ''
    };
};


export function nestedHuman() {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        mainSkill: {
            name: randomToken(6),
            level: 5
        }
    };
};

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
};

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
};


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

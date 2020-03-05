/**
 * this file contains objects which match the schemas in schemas.js
 */

import faker from 'faker';

// TODO replace these 2 with methods of async-test-util
import randomToken from 'random-token';
import randomInt from 'random-int';

import {
    randomNumber
} from 'async-test-util';


export interface SimpleHumanDocumentType {
    passportId: string;
    firstName: string;
    lastName: string;
}
export interface AgeHumanDocumentType {
    age: number;
}
export interface HumanDocumentType extends SimpleHumanDocumentType, AgeHumanDocumentType { }
export function human(
    passportId: string = randomToken(12)
): HumanDocumentType {
    return {
        passportId: passportId,
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: randomInt(10, 50)
    };
}

export function simpleHuman(): SimpleHumanDocumentType {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    };
}

export interface SimpleHumanV3DocumentType {
    passportId: string;
    age: number;
}
export function simpleHumanV3(): SimpleHumanV3DocumentType {
    return {
        passportId: randomToken(12),
        age: randomInt(10, 50)
    };
}

export interface SimpleHumanAgeDocumentType {
    passportId: string;
    age: string;
}
export function simpleHumanAge(): SimpleHumanAgeDocumentType {
    return {
        passportId: randomToken(12),
        age: randomInt(10, 50) + ''
    };
}

export interface HumanWithSubOtherDocumentType {
    passportId: string;
    other: {
        age: number;
    };
}
export function humanWithSubOther(): HumanWithSubOtherDocumentType {
    return {
        passportId: randomToken(12),
        other: {
            age: randomInt(10, 50)
        }
    };
}

export interface NoIndexHumanDocumentType {
    firstName: string;
    lastName: string;
}
export function NoIndexHuman(): NoIndexHumanDocumentType {
    return {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    };
}

export interface NestedHumanDocumentType {
    passportId: string;
    firstName: string;
    mainSkill: {
        name: string;
        level: number;
    };
}
export function nestedHuman(): NestedHumanDocumentType {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        mainSkill: {
            name: randomToken(6),
            level: 5
        }
    };
}

export interface DeepNestedHumanDocumentType {
    passportId: string;
    mainSkill: {
        name: string;
        attack: {
            good: boolean;
            count: number;
        };
    };
}
export function deepNestedHuman(): DeepNestedHumanDocumentType {
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

export interface BigHumanDocumentType {
    passportId: string;
    dnaHash: string;
    firstName: string;
    lastName: string;
    age: number;
}
export function bigHumanDocumentType(): BigHumanDocumentType {
    return {
        passportId: randomToken(12),
        dnaHash: randomToken(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: randomInt(10, 50)
    };
}

export interface HeroArrayDocumentType {
    name: string;
    skills: {
        name: string;
        damage: number;
    }[];
}
export function heroArray(): HeroArrayDocumentType {
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

export interface SimpleHeroArrayDocumentType {
    name: string;
    skills: string[];
}
export function simpleHeroArray(): SimpleHeroArrayDocumentType {
    return {
        name: randomToken(6),
        skills: new Array(3).fill(0).map(() => randomToken(6))
    };
}

export interface EncryptedHumanDocumentType {
    passportId: string;
    firstName: string;
    secret: string;
}
export function encryptedHuman(): EncryptedHumanDocumentType {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        secret: randomToken(12)
    };
}

export interface EncryptedObjectHumanDocumentType {
    passportId: string;
    firstName: string;
    secret: {
        name: string;
        subname: string;
    };
}
export function encryptedObjectHuman(): EncryptedObjectHumanDocumentType {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        secret: {
            name: randomToken(12),
            subname: randomToken(12)
        }
    };
}

export interface EncryptedDeepHumanDocumentType {
    passportId: string;
    firstName: string;
    firstLevelPassword: string;
    secretData: {
        pw: string;
    };
    deepSecret: {
        darkhole: {
            pw: string
        }
    };
    nestedSecret: {
        darkhole: {
            pw: string;
        }
    };
}
export function encryptedDeepHumanDocumentType(): EncryptedDeepHumanDocumentType {
    return {
        passportId: randomToken(12),
        firstName: faker.name.firstName(),
        firstLevelPassword: randomToken(12),
        secretData: {
            pw: randomToken(12)
        },
        deepSecret: {
            darkhole: {
                pw: randomToken(12)
            }
        },
        nestedSecret: {
            darkhole: {
                pw: randomToken(12)
            }
        }
    };
}

export interface CompoundIndexDocumentType {
    passportId: string;
    passportCountry: string;
    age: number;
}
export function compoundIndex(): CompoundIndexDocumentType {
    return {
        passportId: randomToken(12),
        passportCountry: randomToken(12),
        age: randomInt(10, 50)
    };
}

export interface CompoundIndexNoStringDocumentType {
    passportId: string;
    passportCountry: { [prop: string]: string };
    age: number;
}
export function compoundIndexNoString(): CompoundIndexNoStringDocumentType {
    return {
        passportId: randomToken(12),
        passportCountry: { [randomToken(12)]: randomToken(12) },
        age: randomInt(10, 50)
    };
}

export interface NostringIndexDocumentType {
    passportId: {};
    firstName: string;
}
export function nostringIndex(): NostringIndexDocumentType {
    return {
        passportId: {},
        firstName: faker.name.firstName()
    };
}

export interface RefHumanDocumentType {
    name: string;
    bestFriend: string;
}
export function refHuman(bestFriend?: string): RefHumanDocumentType {
    return {
        name: randomToken(12),
        bestFriend
    } as any;
}

export interface RefHumanNestedDocumentType {
    name: string;
    foo: {
        bestFriend: string;
    };
}
export function refHumanNested(bestFriend?: string): RefHumanNestedDocumentType {
    return {
        name: randomToken(12),
        foo: {
            bestFriend
        } as any
    };
}

export interface HumanWithTimestampDocumentType {
    id: string;
    name: string;
    age: number;
    updatedAt: number;
}
export function humanWithTimestamp(): HumanWithTimestampDocumentType {
    const now = new Date().getTime() / 1000;
    return {
        id: randomToken(12),
        name: faker.name.firstName(),
        age: randomNumber(1, 100),
        updatedAt: Math.round(randomNumber(now - 60 * 60 * 24 * 7, now))
    };
}

export interface AverageSchemaDocumentType {
    id: string;
    var1: string;
    var2: number;
    deep: {
        deep1: string;
        deep2: string;
    };
    list: {
        deep1: string;
        deep2: string;
    }[];
}
export function averageSchema(): AverageSchemaDocumentType {
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

export interface PointDocumentType {
    x: number;
    y: number;
}
export function point(): PointDocumentType {
    return {
        x: faker.random.number(),
        y: faker.random.number()
    };
}

export interface IdPrimaryDocumentType {
    _id: string;
    firstName: string;
}
export function _idPrimary(): IdPrimaryDocumentType {
    return {
        _id: randomToken(12),
        firstName: faker.name.firstName()
    };
}

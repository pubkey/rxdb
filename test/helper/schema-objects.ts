/**
 * this file contains objects which match the schemas in schemas.js
 */

import { faker } from '@faker-js/faker';

import {
    randomNumber,
    randomString
} from 'async-test-util';
import { HumanDocumentType } from './schemas';


export interface SimpleHumanDocumentType {
    passportId: string;
    firstName: string;
    lastName: string;
}

export function human(
    passportId: string = randomString(12),
    age: number = randomNumber(10, 50),
    firstName: string = faker.name.firstName()
): HumanDocumentType {
    return {
        passportId: passportId,
        firstName,
        lastName: faker.name.lastName(),
        age
    };
}

export function simpleHuman(): SimpleHumanDocumentType {
    return {
        passportId: randomString(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName()
    };
}

export interface SimpleHumanV3DocumentType {
    passportId: string;
    age: number;
    oneOptional?: string;
}
export function simpleHumanV3(passportId = randomString(12)): SimpleHumanV3DocumentType {
    return {
        passportId,
        age: randomNumber(10, 50)
    };
}

export interface SimpleHumanAgeDocumentType {
    passportId: string;
    age: string;
}
export function simpleHumanAge(): SimpleHumanAgeDocumentType {
    return {
        passportId: randomString(12),
        age: randomNumber(10, 50) + ''
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
        passportId: randomString(12),
        other: {
            age: randomNumber(10, 50)
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
export function nestedHuman(partial: Partial<NestedHumanDocumentType> = {}): NestedHumanDocumentType {
    const defaultObj = {
        passportId: randomString(12),
        firstName: faker.name.firstName(),
        mainSkill: {
            name: randomString(6),
            level: 5
        }
    };
    return Object.assign(
        defaultObj,
        partial
    );
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
        passportId: randomString(12),
        mainSkill: {
            name: randomString(6),
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
        passportId: randomString(12),
        dnaHash: randomString(12),
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        age: randomNumber(10, 50)
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
        name: randomString(6),
        skills: new Array(3).fill(0).map(() => {
            return {
                name: randomString(6),
                damage: randomNumber(10, 50)
            };
        })
    };
}

export interface SimpleHeroArrayDocumentType {
    name: string;
    skills: string[];
}
export function simpleHeroArray(partial: Partial<SimpleHeroArrayDocumentType> = {}): SimpleHeroArrayDocumentType {
    const defaultObj = {
        name: randomString(6),
        skills: new Array(3).fill(0).map(() => randomString(6))
    };
    return Object.assign(
        defaultObj,
        partial
    );
}

export interface EncryptedHumanDocumentType {
    passportId: string;
    firstName: string;
    secret: string;
}
export function encryptedHuman(): EncryptedHumanDocumentType {
    return {
        passportId: randomString(12),
        firstName: faker.name.firstName(),
        secret: randomString(12)
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
        passportId: randomString(12),
        firstName: faker.name.firstName(),
        secret: {
            name: randomString(12),
            subname: randomString(12)
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
            pw: string;
        };
    };
    nestedSecret: {
        darkhole: {
            pw: string;
        };
    };
}
export function encryptedDeepHumanDocumentType(): EncryptedDeepHumanDocumentType {
    return {
        passportId: randomString(12),
        firstName: faker.name.firstName(),
        firstLevelPassword: randomString(12),
        secretData: {
            pw: randomString(12)
        },
        deepSecret: {
            darkhole: {
                pw: randomString(12)
            }
        },
        nestedSecret: {
            darkhole: {
                pw: randomString(12)
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
        passportId: randomString(12),
        passportCountry: randomString(12),
        age: randomNumber(10, 50)
    };
}

export interface CompoundIndexNoStringDocumentType {
    passportId: string;
    passportCountry: { [prop: string]: string; };
    age: number;
}
export function compoundIndexNoString(): CompoundIndexNoStringDocumentType {
    return {
        passportId: randomString(12),
        passportCountry: { [randomString(12)]: randomString(12) },
        age: randomNumber(10, 50)
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
        name: randomString(12),
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
        name: randomString(12),
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
    deletedAt?: number;
}
export function humanWithTimestamp(givenData: Partial<HumanWithTimestampDocumentType> = {}): HumanWithTimestampDocumentType {
    let ret = {
        id: randomString(12),
        name: faker.name.firstName(),
        age: randomNumber(1, 100),
        // use some time in the past week
        updatedAt: new Date().getTime()
    };
    ret = Object.assign({}, ret, givenData);
    return ret;
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
export function averageSchema(
    partial: Partial<AverageSchemaDocumentType> = {}
): AverageSchemaDocumentType {
    return Object.assign(
        {},
        {
            id: randomString(12),
            var1: randomString(12),
            var2: randomNumber(100, 50000),
            deep: {
                deep1: randomString(5),
                deep2: randomString(8)
            },
            list: new Array(5).fill(0).map(() => ({
                deep1: randomString(5),
                deep2: randomString(8)
            }))
        },
        partial
    );
}

export interface PointDocumentType {
    id: string;
    x: number;
    y: number;
}
export function point(): PointDocumentType {
    return {
        id: randomString(12),
        x: faker.datatype.number(),
        y: faker.datatype.number()
    };
}

export interface HumanWithIdAndAgeIndexDocumentType {
    id: string;
    name: string;
    age: number;
}
export function humanWithIdAndAgeIndexDocumentType(
    age: number = randomNumber(1, 100)
): HumanWithIdAndAgeIndexDocumentType {
    return {
        id: randomString(12),
        name: faker.name.firstName(),
        age
    };
}

export type HumanWithCompositePrimary = {
    // optional because it might be created by RxDB and not known before
    id?: string;
    firstName: string;
    lastName: string;
    info: {
        age: number;
    };
};
export function humanWithCompositePrimary(partial: Partial<HumanWithCompositePrimary> = {}): HumanWithCompositePrimary {
    const defaultObj = {
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        info: {
            age: randomNumber(10, 50)
        }
    };
    return Object.assign(
        defaultObj,
        partial
    );
}

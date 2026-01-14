/**
 * this file contains objects which match the schemas in schemas.js
 */
import { HumanDocumentType } from './schemas.ts';
import * as schemas from './schemas.ts';
import {
    ensureNotFalsy,
    lastOfArray,
    randomNumber
} from '../utils/index.ts';


/**
 * Some storages had problems with umlauts and other special chars.
 * So we add these to all test strings.
 */
export const TEST_DATA_CHARSET = '0987654321ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzäöüÖÄßÜ[]{}\'';
export const TEST_DATA_CHARSET_LAST_SORTED = ensureNotFalsy(lastOfArray(TEST_DATA_CHARSET.split('').sort()));
const someEmojisArr = ['😊', '💩', '👵', '🍌', '🏳️‍🌈', '😃'];

const baseChars = TEST_DATA_CHARSET.split('');
let allChars = baseChars.slice(0);
allChars = allChars.concat(someEmojisArr);

export function randomStringWithSpecialChars(
    minLength: number,
    /**
     * It has shown that alternating string lengths
     * can reproduce various problems. So by having variable
     * lengths we ensure that this fully works.
     */
    maxLength: number
) {
    let text = '';

    if (!minLength || !maxLength || minLength > maxLength) {
        throw new Error('invalid length given ' + minLength + ' ' + maxLength);
    }

    const length = randomNumber(minLength, maxLength);

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

export interface SimpleHumanDocumentType {
    passportId: string;
    firstName: string;
    lastName: string;
}

export function humanData(
    passportId: string = randomStringWithSpecialChars(8, 12),
    age: number = randomNumber(10, 50),
    firstName: string = randomStringWithSpecialChars(8, 12)
): HumanDocumentType {
    return {
        passportId: passportId,
        firstName,
        lastName: randomStringWithSpecialChars(8, 12),
        age
    };
}

export function simpleHumanData(): SimpleHumanDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
        firstName: randomStringWithSpecialChars(8, 12),
        lastName: randomStringWithSpecialChars(8, 12)
    };
}

export interface SimpleHumanV3DocumentType {
    passportId: string;
    age: number;
    oneOptional?: string;
}
export function simpleHumanV3Data(partial: Partial<SimpleHumanV3DocumentType> = {}): SimpleHumanV3DocumentType {
    const defaultObj = {
        passportId: randomStringWithSpecialChars(8, 12),
        age: randomNumber(10, 50)
    };
    return Object.assign(
        defaultObj,
        partial
    );
}

export interface SimpleHumanAgeDocumentType {
    passportId: string;
    age: string;
}
export function simpleHumanAge(partial: Partial<SimpleHumanAgeDocumentType> = {}): SimpleHumanAgeDocumentType {
    const defaultObj = {
        passportId: randomStringWithSpecialChars(8, 12),
        age: randomNumber(10, 50) + ''
    };
    return Object.assign(
        defaultObj,
        partial
    );
}

export interface HumanWithSubOtherDocumentType {
    passportId: string;
    other: {
        age: number;
    };
}
export function humanWithSubOther(): HumanWithSubOtherDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
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
        firstName: randomStringWithSpecialChars(8, 12),
        lastName: randomStringWithSpecialChars(8, 12)
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
export function nestedHumanData(partial: Partial<NestedHumanDocumentType> = {}): NestedHumanDocumentType {
    const defaultObj = {
        passportId: randomStringWithSpecialChars(8, 12),
        firstName: randomStringWithSpecialChars(8, 12),
        mainSkill: {
            name: randomStringWithSpecialChars(4, 6),
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
export function deepNestedHumanData(): DeepNestedHumanDocumentType {
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

export interface BigHumanDocumentType {
    passportId: string;
    dnaHash: string;
    firstName: string;
    lastName: string;
    age: number;
}
export function bigHumanDocumentType(): BigHumanDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
        dnaHash: randomStringWithSpecialChars(8, 12),
        firstName: randomStringWithSpecialChars(8, 12),
        lastName: randomStringWithSpecialChars(8, 12),
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
export function heroArrayData(): HeroArrayDocumentType {
    return {
        name: randomStringWithSpecialChars(6, 8),
        skills: new Array(3).fill(0).map(() => {
            return {
                name: randomStringWithSpecialChars(4, 6),
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
        name: randomStringWithSpecialChars(6, 8),
        skills: new Array(3).fill(0).map(() => randomStringWithSpecialChars(3, 6))
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
export function encryptedHumanData(secret = randomStringWithSpecialChars(8, 12)): EncryptedHumanDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
        firstName: randomStringWithSpecialChars(8, 12),
        secret
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
export function encryptedObjectHumanData(): EncryptedObjectHumanDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
        firstName: randomStringWithSpecialChars(8, 12),
        secret: {
            name: randomStringWithSpecialChars(8, 12),
            subname: randomStringWithSpecialChars(8, 12)
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

export interface CompoundIndexDocumentType {
    passportId: string;
    passportCountry: string;
    age: number;
}
export function compoundIndexData(): CompoundIndexDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
        passportCountry: randomStringWithSpecialChars(8, 12),
        age: randomNumber(10, 50)
    };
}

export interface CompoundIndexNoStringDocumentType {
    passportId: string;
    passportCountry: { [prop: string]: string; };
    age: number;
}
export function compoundIndexNoStringData(): CompoundIndexNoStringDocumentType {
    return {
        passportId: randomStringWithSpecialChars(8, 12),
        passportCountry: { [randomStringWithSpecialChars(8, 12)]: randomStringWithSpecialChars(8, 12) },
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
        firstName: randomStringWithSpecialChars(8, 12)
    };
}

export interface RefHumanDocumentType {
    name: string;
    bestFriend: string;
}
export function refHumanData(bestFriend?: string): RefHumanDocumentType {
    return {
        name: randomStringWithSpecialChars(8, 12),
        bestFriend
    } as any;
}

export interface RefHumanNestedDocumentType {
    name: string;
    foo: {
        bestFriend: string;
    };
}
export function refHumanNestedData(bestFriend?: string): RefHumanNestedDocumentType {
    return {
        name: randomStringWithSpecialChars(8, 12),
        foo: {
            bestFriend
        } as any
    };
}
export interface HumanWithTimestampNestedDocumentType extends HumanWithTimestampDocumentType {
    address?: {
        street: string;
        suite: string;
        city: string;
        zipcode: string;
        geo: {
            lat: string;
            lng: string;
        };
    }
}

export interface HumanWithTimestampDocumentType {
    id: string;
    name: string;
    age: number;
    updatedAt: number;
    deletedAt?: number;
}
export function humanWithTimestampData(givenData: Partial<HumanWithTimestampDocumentType> = {}): HumanWithTimestampDocumentType {
    let ret = {
        id: randomStringWithSpecialChars(8, 12),
        name: randomStringWithSpecialChars(8, 12),
        age: randomNumber(1, 100),
        // use some time in the past week
        updatedAt: Date.now()
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
        deeper: {
            deepNr: number;
        };
    };
    list: {
        deep1: string;
        deep2: string;
    }[];
}


const averageSchemaForFieldLength = schemas.averageSchema() as any;
export function averageSchemaData(
    partial: Partial<AverageSchemaDocumentType> = {}
): AverageSchemaDocumentType {
    return Object.assign(
        {},
        {
            id: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.id.maxLength - 1), ensureNotFalsy(averageSchemaForFieldLength.properties.id.maxLength)),
            var1: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.var1.maxLength) - 3, ensureNotFalsy(averageSchemaForFieldLength.properties.var1.maxLength)),
            var2: randomNumber(100, ensureNotFalsy(averageSchemaForFieldLength.properties.var2.maximum)),
            deep: {
                deep1: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.deep.properties.deep1.maxLength) - 3, ensureNotFalsy(averageSchemaForFieldLength.properties.deep.properties.deep1.maxLength)),
                deep2: randomStringWithSpecialChars(ensureNotFalsy(averageSchemaForFieldLength.properties.deep.properties.deep2.maxLength) - 3, ensureNotFalsy(averageSchemaForFieldLength.properties.deep.properties.deep2.maxLength)),
                deeper: {
                    deepNr: randomNumber(0, 10)
                }
            },
            list: new Array(5).fill(0).map(() => ({
                deep1: randomStringWithSpecialChars(2, 5),
                deep2: randomStringWithSpecialChars(5, 8)
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
export function pointData(): PointDocumentType {
    return {
        id: randomStringWithSpecialChars(8, 12),
        x: randomNumber(1, 100),
        y: randomNumber(1, 100)
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
        id: randomStringWithSpecialChars(8, 12),
        name: randomStringWithSpecialChars(8, 12),
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
        firstName: randomStringWithSpecialChars(8, 12),
        lastName: randomStringWithSpecialChars(8, 12),
        info: {
            age: randomNumber(10, 50)
        }
    };
    return Object.assign(
        defaultObj,
        partial
    );
}

export type HumanWithOwnershipDocumentType = {
    passportId: string;
    firstName: string;
    lastName: string;
    age: number;
    owner?: string;
};
export function humanWithOwnershipData(partial: Partial<HumanWithOwnershipDocumentType> = {}, owner: string): HumanWithOwnershipDocumentType {
    const defaultObj = {
        passportId: randomStringWithSpecialChars(8, 12),
        firstName: randomStringWithSpecialChars(8, 12),
        lastName: randomStringWithSpecialChars(8, 12),
        age: randomNumber(10, 50),
        owner
    };
    return Object.assign(
        defaultObj,
        partial
    );
}

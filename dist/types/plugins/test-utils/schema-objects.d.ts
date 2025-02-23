/**
 * this file contains objects which match the schemas in schemas.js
 */
import { HumanDocumentType } from './schemas.ts';
/**
 * Some storages had problems with umlauts and other special chars.
 * So we add these to all test strings.
 */
export declare const TEST_DATA_CHARSET = "0987654321ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\u00E4\u00F6\u00FC\u00D6\u00C4\u00DF\u00DC[]{}'";
export declare const TEST_DATA_CHARSET_LAST_SORTED: string;
export declare function randomStringWithSpecialChars(minLength: number, 
/**
 * It has shown that alternating string lengths
 * can reproduce various problems. So by having variable
 * lengths we ensure that this fully works.
 */
maxLength: number): string;
export interface SimpleHumanDocumentType {
    passportId: string;
    firstName: string;
    lastName: string;
}
export declare function humanData(passportId?: string, age?: number, firstName?: string): HumanDocumentType;
export declare function simpleHumanData(): SimpleHumanDocumentType;
export interface SimpleHumanV3DocumentType {
    passportId: string;
    age: number;
    oneOptional?: string;
}
export declare function simpleHumanV3Data(partial?: Partial<SimpleHumanV3DocumentType>): SimpleHumanV3DocumentType;
export interface SimpleHumanAgeDocumentType {
    passportId: string;
    age: string;
}
export declare function simpleHumanAge(partial?: Partial<SimpleHumanAgeDocumentType>): SimpleHumanAgeDocumentType;
export interface HumanWithSubOtherDocumentType {
    passportId: string;
    other: {
        age: number;
    };
}
export declare function humanWithSubOther(): HumanWithSubOtherDocumentType;
export interface NoIndexHumanDocumentType {
    firstName: string;
    lastName: string;
}
export declare function NoIndexHuman(): NoIndexHumanDocumentType;
export interface NestedHumanDocumentType {
    passportId: string;
    firstName: string;
    mainSkill: {
        name: string;
        level: number;
    };
}
export declare function nestedHumanData(partial?: Partial<NestedHumanDocumentType>): NestedHumanDocumentType;
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
export declare function deepNestedHumanData(): DeepNestedHumanDocumentType;
export interface BigHumanDocumentType {
    passportId: string;
    dnaHash: string;
    firstName: string;
    lastName: string;
    age: number;
}
export declare function bigHumanDocumentType(): BigHumanDocumentType;
export interface HeroArrayDocumentType {
    name: string;
    skills: {
        name: string;
        damage: number;
    }[];
}
export declare function heroArrayData(): HeroArrayDocumentType;
export interface SimpleHeroArrayDocumentType {
    name: string;
    skills: string[];
}
export declare function simpleHeroArray(partial?: Partial<SimpleHeroArrayDocumentType>): SimpleHeroArrayDocumentType;
export interface EncryptedHumanDocumentType {
    passportId: string;
    firstName: string;
    secret: string;
}
export declare function encryptedHumanData(secret?: string): EncryptedHumanDocumentType;
export interface EncryptedObjectHumanDocumentType {
    passportId: string;
    firstName: string;
    secret: {
        name: string;
        subname: string;
    };
}
export declare function encryptedObjectHumanData(): EncryptedObjectHumanDocumentType;
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
export declare function encryptedDeepHumanDocumentType(): EncryptedDeepHumanDocumentType;
export interface CompoundIndexDocumentType {
    passportId: string;
    passportCountry: string;
    age: number;
}
export declare function compoundIndexData(): CompoundIndexDocumentType;
export interface CompoundIndexNoStringDocumentType {
    passportId: string;
    passportCountry: {
        [prop: string]: string;
    };
    age: number;
}
export declare function compoundIndexNoStringData(): CompoundIndexNoStringDocumentType;
export interface NostringIndexDocumentType {
    passportId: {};
    firstName: string;
}
export declare function nostringIndex(): NostringIndexDocumentType;
export interface RefHumanDocumentType {
    name: string;
    bestFriend: string;
}
export declare function refHumanData(bestFriend?: string): RefHumanDocumentType;
export interface RefHumanNestedDocumentType {
    name: string;
    foo: {
        bestFriend: string;
    };
}
export declare function refHumanNestedData(bestFriend?: string): RefHumanNestedDocumentType;
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
    };
}
export interface HumanWithTimestampDocumentType {
    id: string;
    name: string;
    age: number;
    updatedAt: number;
    deletedAt?: number;
}
export declare function humanWithTimestampData(givenData?: Partial<HumanWithTimestampDocumentType>): HumanWithTimestampDocumentType;
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
export declare function averageSchemaData(partial?: Partial<AverageSchemaDocumentType>): AverageSchemaDocumentType;
export interface PointDocumentType {
    id: string;
    x: number;
    y: number;
}
export declare function pointData(): PointDocumentType;
export interface HumanWithIdAndAgeIndexDocumentType {
    id: string;
    name: string;
    age: number;
}
export declare function humanWithIdAndAgeIndexDocumentType(age?: number): HumanWithIdAndAgeIndexDocumentType;
export type HumanWithCompositePrimary = {
    id?: string;
    firstName: string;
    lastName: string;
    info: {
        age: number;
    };
};
export declare function humanWithCompositePrimary(partial?: Partial<HumanWithCompositePrimary>): HumanWithCompositePrimary;
export type HumanWithOwnershipDocumentType = {
    passportId: string;
    firstName: string;
    lastName: string;
    age: number;
    owner?: string;
};
export declare function humanWithOwnershipData(partial: Partial<HumanWithOwnershipDocumentType> | undefined, owner: string): HumanWithOwnershipDocumentType;

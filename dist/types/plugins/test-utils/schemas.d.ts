import { SimpleHumanV3DocumentType, HumanWithSubOtherDocumentType, NestedHumanDocumentType, DeepNestedHumanDocumentType, EncryptedHumanDocumentType, EncryptedObjectHumanDocumentType, EncryptedDeepHumanDocumentType, CompoundIndexDocumentType, CompoundIndexNoStringDocumentType, HeroArrayDocumentType, SimpleHeroArrayDocumentType, RefHumanDocumentType, RefHumanNestedDocumentType, AverageSchemaDocumentType, PointDocumentType, HumanWithTimestampDocumentType, BigHumanDocumentType, NostringIndexDocumentType, NoIndexHumanDocumentType, HumanWithCompositePrimary, HumanWithTimestampNestedDocumentType } from './schema-objects.ts';
import type { ExtractDocumentTypeFromTypedRxJsonSchema, RxJsonSchema } from '../../types/rx-schema';
export declare const humanSchemaLiteral: import("../../index.ts").DeepReadonlyObject<{
    readonly title: "human schema";
    readonly description: "describes a human being";
    readonly version: 0;
    readonly keyCompression: false;
    readonly primaryKey: "passportId";
    readonly type: "object";
    readonly properties: {
        readonly passportId: {
            readonly type: "string";
            readonly maxLength: 100;
        };
        readonly firstName: {
            readonly type: "string";
            readonly maxLength: 100;
        };
        readonly lastName: {
            readonly type: "string";
            readonly maxLength: 100;
        };
        readonly age: {
            readonly description: "age in years";
            readonly type: "integer";
            readonly minimum: 0;
            readonly maximum: 150;
            readonly multipleOf: 1;
        };
    };
    readonly required: readonly ["firstName", "lastName", "passportId"];
    readonly indexes: readonly ["firstName"];
}>;
declare const humanSchemaTyped: {
    title: "human schema";
    description: "describes a human being";
    version: 0;
    keyCompression: false;
    primaryKey: "passportId";
    type: "object";
    properties: {
        passportId: {
            type: "string";
            maxLength: 100;
        };
        firstName: {
            type: "string";
            maxLength: 100;
        };
        lastName: {
            type: "string";
            maxLength: 100;
        };
        age: {
            description: "age in years";
            type: "integer";
            minimum: 0;
            maximum: 150;
            multipleOf: 1;
        };
    };
    required: ["firstName", "lastName", "passportId"];
    indexes: ["firstName"];
};
export type HumanDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof humanSchemaTyped>;
export declare const human: RxJsonSchema<HumanDocumentType>;
export declare const humanDefault: RxJsonSchema<HumanDocumentType>;
export declare const humanFinal: RxJsonSchema<HumanDocumentType>;
export declare const simpleHuman: RxJsonSchema<SimpleHumanV3DocumentType>;
export declare const simpleHumanV3: RxJsonSchema<SimpleHumanV3DocumentType>;
export declare const humanAgeIndex: RxJsonSchema<HumanDocumentType>;
export declare const humanSubIndex: RxJsonSchema<HumanWithSubOtherDocumentType>;
/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export declare const humanWithAllIndex: RxJsonSchema<HumanDocumentType>;
export declare const nestedHuman: RxJsonSchema<NestedHumanDocumentType>;
export declare const deepNestedHuman: RxJsonSchema<DeepNestedHumanDocumentType>;
export declare const noIndexHuman: RxJsonSchema<NoIndexHumanDocumentType>;
export declare const noStringIndex: RxJsonSchema<NostringIndexDocumentType>;
export declare const bigHuman: RxJsonSchema<BigHumanDocumentType>;
export declare const encryptedHuman: RxJsonSchema<EncryptedHumanDocumentType>;
export declare const encryptedObjectHuman: RxJsonSchema<EncryptedObjectHumanDocumentType>;
export declare const encryptedDeepHuman: RxJsonSchema<EncryptedDeepHumanDocumentType>;
export declare const notExistingIndex: RxJsonSchema<{
    passportId: string;
    address: {
        street: string;
    };
}>;
export declare const compoundIndex: RxJsonSchema<CompoundIndexDocumentType>;
export declare const compoundIndexNoString: RxJsonSchema<CompoundIndexNoStringDocumentType>;
export declare const empty: RxJsonSchema<any>;
export declare const heroArray: RxJsonSchema<HeroArrayDocumentType>;
export declare const simpleArrayHero: RxJsonSchema<SimpleHeroArrayDocumentType>;
export declare const primaryHumanLiteral: import("../../index.ts").DeepReadonlyObject<{
    readonly title: "human schema with primary";
    readonly version: 0;
    readonly description: "describes a human being with passportID as primary";
    readonly keyCompression: false;
    readonly primaryKey: "passportId";
    readonly type: "object";
    readonly properties: {
        readonly passportId: {
            readonly type: "string";
            readonly minLength: 4;
            readonly maxLength: 100;
        };
        readonly firstName: {
            readonly type: "string";
            readonly maxLength: 100;
        };
        readonly lastName: {
            readonly type: "string";
            readonly maxLength: 500;
        };
        readonly age: {
            readonly type: "integer";
            readonly minimum: 0;
            readonly maximum: 150;
            readonly multipleOf: 1;
        };
    };
    readonly required: readonly ["passportId", "firstName", "lastName"];
}>;
declare const primaryHumanTypedSchema: {
    title: "human schema with primary";
    version: 0;
    description: "describes a human being with passportID as primary";
    keyCompression: false;
    primaryKey: "passportId";
    type: "object";
    properties: {
        passportId: {
            type: "string";
            minLength: 4;
            maxLength: 100;
        };
        firstName: {
            type: "string";
            maxLength: 100;
        };
        lastName: {
            type: "string";
            maxLength: 500;
        };
        age: {
            type: "integer";
            minimum: 0;
            maximum: 150;
            multipleOf: 1;
        };
    };
    required: ["passportId", "firstName", "lastName"];
};
export type PrimaryHumanDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof primaryHumanTypedSchema>;
export declare const primaryHuman: RxJsonSchema<PrimaryHumanDocType>;
export declare const humanNormalizeSchema1Literal: import("../../index.ts").DeepReadonlyObject<{
    readonly title: "human schema";
    readonly version: 0;
    readonly keyCompression: false;
    readonly description: "describes a human being";
    readonly primaryKey: "passportId";
    readonly type: "object";
    readonly properties: {
        readonly passportId: {
            readonly type: "string";
            readonly minLength: 4;
            readonly maxLength: 100;
        };
        readonly age: {
            readonly description: "age in years";
            readonly type: "integer";
            readonly minimum: 0;
            readonly maximum: 150;
            readonly multipleOf: 1;
        };
    };
    readonly required: readonly ["age", "passportId"];
}>;
declare const humanNormalizeSchema1Typed: {
    title: "human schema";
    version: 0;
    keyCompression: false;
    description: "describes a human being";
    primaryKey: "passportId";
    type: "object";
    properties: {
        passportId: {
            type: "string";
            minLength: 4;
            maxLength: 100;
        };
        age: {
            description: "age in years";
            type: "integer";
            minimum: 0;
            maximum: 150;
            multipleOf: 1;
        };
    };
    required: ["age", "passportId"];
};
export type AgeHumanDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof humanNormalizeSchema1Typed>;
export declare const humanNormalizeSchema1: RxJsonSchema<AgeHumanDocumentType>;
export declare const humanNormalizeSchema2: RxJsonSchema<AgeHumanDocumentType>;
export declare const refHuman: RxJsonSchema<RefHumanDocumentType>;
export declare const humanCompositePrimary: RxJsonSchema<HumanWithCompositePrimary>;
export declare const humanCompositePrimarySchemaLiteral: import("../../index.ts").DeepReadonlyObject<{
    readonly title: "human schema";
    readonly description: "describes a human being";
    readonly version: 0;
    readonly keyCompression: false;
    readonly primaryKey: {
        readonly key: "id";
        readonly fields: readonly ["firstName", "info.age"];
        readonly separator: "|";
    };
    readonly encrypted: readonly [];
    readonly type: "object";
    readonly properties: {
        readonly id: {
            readonly type: "string";
            readonly maxLength: 100;
        };
        readonly firstName: {
            readonly type: "string";
            readonly maxLength: 100;
        };
        readonly lastName: {
            readonly type: "string";
        };
        readonly info: {
            readonly type: "object";
            readonly properties: {
                readonly age: {
                    readonly description: "age in years";
                    readonly type: "integer";
                    readonly minimum: 0;
                    readonly maximum: 150;
                };
            };
            readonly required: readonly ["age"];
        };
        readonly readonlyProps: {
            readonly allOf: readonly [];
            readonly anyOf: readonly [];
            readonly oneOf: readonly [];
            readonly type: readonly [];
            readonly dependencies: {
                readonly someDep: readonly ["asd"];
            };
            readonly items: readonly [];
            readonly required: readonly [];
            readonly enum: readonly [];
        };
    };
    readonly required: readonly ["id", "firstName", "lastName", "info"];
    readonly indexes: readonly ["firstName"];
}>;
declare const humanCompositePrimarySchemaTyped: {
    title: "human schema";
    description: "describes a human being";
    version: 0;
    keyCompression: false;
    primaryKey: {
        key: "id";
        fields: ["firstName", "info.age"];
        separator: "|";
    };
    encrypted: [];
    type: "object";
    properties: {
        id: {
            type: "string";
            maxLength: 100;
        };
        firstName: {
            type: "string";
            maxLength: 100;
        };
        lastName: {
            type: "string";
        };
        info: {
            type: "object";
            properties: {
                age: {
                    description: "age in years";
                    type: "integer";
                    minimum: 0;
                    maximum: 150;
                };
            };
            required: ["age"];
        };
        readonlyProps: {
            allOf: [];
            anyOf: [];
            oneOf: [];
            type: [];
            dependencies: {
                someDep: ["asd"];
            };
            items: [];
            required: [];
            enum: [];
        };
    };
    required: ["id", "firstName", "lastName", "info"];
    indexes: ["firstName"];
};
export type HumanCompositePrimaryDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof humanCompositePrimarySchemaTyped>;
export declare const refHumanNested: RxJsonSchema<RefHumanNestedDocumentType>;
/**
 * an average schema used in performance-tests
 */
export declare function averageSchema(): RxJsonSchema<AverageSchemaDocumentType>;
export declare const point: RxJsonSchema<PointDocumentType>;
export declare const humanMinimal: RxJsonSchema<SimpleHumanV3DocumentType>;
export declare const humanMinimalBroken: RxJsonSchema<{
    passportId: string;
    broken: number;
}>;
/**
 * used in the graphql-test
 * contains timestamp
 */
export declare const humanWithTimestamp: RxJsonSchema<HumanWithTimestampDocumentType>;
export declare const humanWithTimestampNested: RxJsonSchema<HumanWithTimestampNestedDocumentType>;
/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export declare const humanWithTimestampAllIndex: RxJsonSchema<HumanWithTimestampDocumentType>;
export declare const humanWithSimpleAndCompoundIndexes: RxJsonSchema<{
    id: string;
    name: string;
    age: number;
    createdAt: number;
    updatedAt: number;
}>;
export declare const humanWithDeepNestedIndexes: RxJsonSchema<{
    id: string;
    name: string;
    job: any;
}>;
export declare const humanIdAndAgeIndex: RxJsonSchema<{
    id: string;
    name: string;
    age: number;
}>;
export declare const humanWithOwnership: RxJsonSchema<HumanDocumentType>;
export declare function enableKeyCompression<RxDocType>(schema: RxJsonSchema<RxDocType>): RxJsonSchema<RxDocType>;
export {};

import AsyncTestUtil from 'async-test-util';

import {
    SimpleHumanV3DocumentType,
    HumanWithSubOtherDocumentType,
    NestedHumanDocumentType,
    DeepNestedHumanDocumentType,
    EncryptedHumanDocumentType,
    EncryptedObjectHumanDocumentType,
    EncryptedDeepHumanDocumentType,
    CompoundIndexDocumentType,
    CompoundIndexNoStringDocumentType,
    HeroArrayDocumentType,
    SimpleHeroArrayDocumentType,
    RefHumanDocumentType,
    RefHumanNestedDocumentType,
    AverageSchemaDocumentType,
    PointDocumentType,
    HumanWithTimestampDocumentType,
    BigHumanDocumentType,
    NostringIndexDocumentType,
    NoIndexHumanDocumentType,
    HumanWithCompositePrimary,
    HumanWithTimestampNestedDocumentType
} from './schema-objects.ts';
import { overwritable } from '../../overwritable.ts';
import { toTypedRxJsonSchema } from '../../rx-schema.ts';
import type {
    ExtractDocumentTypeFromTypedRxJsonSchema,
    RxJsonSchema
} from '../../types/rx-schema';
import { flatClone } from '../utils/index.ts';
import { META_LWT_UNIX_TIME_MAX } from '../../rx-schema-helper.ts';


export const humanSchemaLiteral = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string',
            maxLength: 100
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    required: ['firstName', 'lastName', 'passportId'],
    indexes: ['firstName']
} as const);
const humanSchemaTyped = toTypedRxJsonSchema(humanSchemaLiteral);
export type HumanDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof humanSchemaTyped>;
export const human: RxJsonSchema<HumanDocumentType> = humanSchemaLiteral;


export const humanDefault: RxJsonSchema<HumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    description: 'describes a human being',
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string',
            maxLength: 100
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            default: 20
        }
    },
    indexes: [],
    required: ['passportId']
});

export const humanFinal: RxJsonSchema<HumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema with age set final',
    version: 0,
    keyCompression: false,
    type: 'object',
    primaryKey: 'passportId',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            type: 'integer',
            minimum: 0,
            maximum: 150,
            final: true
        }
    },
    required: [
        'passportId'
    ]
});

export const simpleHuman: RxJsonSchema<SimpleHumanV3DocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    keyCompression: false,
    description: 'describes a simple human being',
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        age: {
            type: 'string',
            maxLength: 100
        },
        oneOptional: {
            type: 'string'
        }
    },
    indexes: ['age'],
    required: ['passportId', 'age']
});

export const simpleHumanV3: RxJsonSchema<SimpleHumanV3DocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 3,
    keyCompression: false,
    description: 'describes a simple human being (V3 with age as number)',
    type: 'object',
    primaryKey: 'passportId',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        age: {
            type: 'number',
            minimum: 0,
            maximum: 1000,
            multipleOf: 1
        },
        oneOptional: {
            type: 'string'
        }
    },
    indexes: ['age'],
    required: ['passportId', 'age']
});

export const humanAgeIndex: RxJsonSchema<HumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    keyCompression: false,
    description: 'describes a human being',
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            description: 'Age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    required: ['firstName', 'lastName', 'age'],
    indexes: ['age']
});

export const humanSubIndex: RxJsonSchema<HumanWithSubOtherDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    description: 'describes a human being where other.age is index',
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        other: {
            type: 'object',
            properties: {
                age: {
                    description: 'Age in years',
                    type: 'integer',
                    minimum: 0,
                    maximum: 150,
                    multipleOf: 1
                }
            }
        }
    },
    required: [
        'passportId'
    ],
    indexes: ['other.age']
});

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export const humanWithAllIndex: RxJsonSchema<HumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string',
            maxLength: 100
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    indexes: ['firstName', 'lastName', 'age'],
    required: ['firstName', 'lastName']
});

export const nestedHuman: RxJsonSchema<NestedHumanDocumentType> = {
    title: 'human nested',
    version: 0,
    description: 'describes a human being with a nested field',
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        mainSkill: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    maxLength: 10
                },
                level: {
                    type: 'number',
                    minimum: 0,
                    maximum: 10,
                    multipleOf: 1
                }
            },
            required: ['name', 'level'],
            additionalProperties: false
        }
    },
    required: ['firstName'],
    indexes: []
};

export const deepNestedHuman: RxJsonSchema<DeepNestedHumanDocumentType> = {
    title: 'deep human nested',
    version: 0,
    keyCompression: false,
    description: 'describes a human being with a nested field',
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        mainSkill: {
            type: 'object',
            properties: {
                name: {
                    type: 'string'
                },
                attack: {
                    type: 'object',
                    properties: {
                        good: {
                            type: 'boolean'
                        },
                        count: {
                            type: 'number'
                        }
                    }
                }
            },
            required: ['name']
        }
    },
    indexes: [],
    required: ['mainSkill']
};

export const noIndexHuman: RxJsonSchema<NoIndexHumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    description: 'this schema has no index',
    keyCompression: false,
    primaryKey: 'firstName',
    type: 'object',
    properties: {
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string'
        }
    },
    required: ['lastName']
});

export const noStringIndex: RxJsonSchema<NostringIndexDocumentType> = overwritable.deepFreezeWhenDevMode({
    description: 'the index has no type:string',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'object',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        }
    },
    required: ['firstName', 'passportId'],
    indexes: []
});


export const bigHuman: RxJsonSchema<BigHumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    description: 'describes a human being with 2 indexes',
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        dnaHash: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string'
        },
        age: {
            description: 'Age in years',
            type: 'integer',
            minimum: 0
        }
    },
    required: ['firstName', 'lastName'],
    indexes: ['firstName', 'dnaHash']
});

export const encryptedHuman: RxJsonSchema<EncryptedHumanDocumentType> = {
    title: 'human encrypted',
    version: 0,
    description: 'uses an encrypted field',
    primaryKey: 'passportId',
    type: 'object',
    keyCompression: false,
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        secret: {
            type: 'string'
        }
    },
    indexes: [],
    required: ['firstName', 'secret'],
    encrypted: ['secret']
};

export const encryptedObjectHuman: RxJsonSchema<EncryptedObjectHumanDocumentType> = {
    title: 'human encrypted',
    version: 0,
    keyCompression: false,
    description: 'uses an encrypted field',
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        secret: {
            type: 'object',
            properties: {
                name: {
                    type: 'string'
                },
                subname: {
                    type: 'string'
                }
            }
        }
    },
    indexes: [],
    required: ['firstName', 'secret'],
    encrypted: ['secret']
};

export const encryptedDeepHuman: RxJsonSchema<EncryptedDeepHumanDocumentType> = {
    title: 'human encrypted',
    version: 0,
    keyCompression: false,
    description: 'uses an encrypted field',
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string'
        },
        firstLevelPassword: {
            type: 'string',
        },
        secretData: {
            type: 'object',
            properties: {
                pw: {
                    type: 'string'
                }
            }
        },
        deepSecret: {
            type: 'object',
            properties: {
                darkhole: {
                    type: 'object',
                    properties: {
                        pw: {
                            type: 'string'
                        }
                    }
                }
            }
        },
        nestedSecret: {
            type: 'object',
            properties: {
                darkhole: {
                    type: 'object',
                    properties: {
                        pw: {
                            type: 'string'
                        }
                    }
                }
            }
        }

    },
    indexes: [],
    required: ['firstName', 'secretData'],
    encrypted: [
        'firstLevelPassword',
        'secretData',
        'deepSecret.darkhole.pw',
        'nestedSecret.darkhole.pw'
    ]
};

export const notExistingIndex: RxJsonSchema<{ passportId: string; address: { street: string; }; }> = {
    title: 'index',
    version: 0,
    description: 'this schema has a specified index which does not exists',
    primaryKey: 'passportId',
    type: 'object',
    keyCompression: false,
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        address: {
            type: 'object',
            properties: {
                street: { type: 'string' }
            }
        }
    },
    required: [
        'passportId'
    ],
    indexes: ['address.apartment']
};

export const compoundIndex: RxJsonSchema<CompoundIndexDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'compound index',
    version: 0,
    description: 'this schema has a compoundIndex',
    primaryKey: 'passportId',
    type: 'object',
    keyCompression: false,
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        passportCountry: {
            type: 'string',
            maxLength: 100
        },
        age: {
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    required: [
        'passportId'
    ],
    indexes: [
        ['age', 'passportCountry']
    ]
});

export const compoundIndexNoString: RxJsonSchema<CompoundIndexNoStringDocumentType> = {
    title: 'compound index',
    version: 0,
    description: 'this schema has a compoundIndex',
    primaryKey: 'passportId',
    keyCompression: false,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        passportCountry: {
            type: 'object'
        },
        age: {
            type: 'integer'
        }
    },
    indexes: [
        [10, 'passportCountry']
    ]
} as RxJsonSchema<CompoundIndexNoStringDocumentType>;

export const empty: RxJsonSchema<any> = {
    title: 'empty schema',
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        }
    },
    required: ['id']
};

export const heroArray: RxJsonSchema<HeroArrayDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'hero schema',
    version: 0,
    keyCompression: false,
    description: 'describes a hero with an array-field',
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 100
        },
        skills: {
            type: 'array',
            maxItems: 5,
            uniqueItems: true,
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    },
                    damage: {
                        type: 'number'
                    }
                }
            }
        }
    },
    required: [
        'name'
    ]
});

export const simpleArrayHero: RxJsonSchema<SimpleHeroArrayDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'hero schema',
    version: 0,
    description: 'describes a hero with a string-array-field',
    keyCompression: false,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 100
        },
        skills: {
            type: 'array',
            maxItems: 5,
            uniqueItems: true,
            items: {
                type: 'string',
            }
        }
    },
    required: [
        'name'
    ]
});

export const primaryHumanLiteral = overwritable.deepFreezeWhenDevMode({
    title: 'human schema with primary',
    version: 0,
    description: 'describes a human being with passportID as primary',
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            minLength: 4,
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string',
            maxLength: 500
        },
        age: {
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    required: ['passportId', 'firstName', 'lastName']
} as const);
const primaryHumanTypedSchema = toTypedRxJsonSchema(primaryHumanLiteral);
export type PrimaryHumanDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof primaryHumanTypedSchema>;
export const primaryHuman: RxJsonSchema<PrimaryHumanDocType> = primaryHumanLiteral;

export const humanNormalizeSchema1Literal = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    keyCompression: false,
    description: 'describes a human being',
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            minLength: 4,
            maxLength: 100
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    required: ['age', 'passportId']
} as const);
const humanNormalizeSchema1Typed = toTypedRxJsonSchema(humanNormalizeSchema1Literal);
export type AgeHumanDocumentType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof humanNormalizeSchema1Typed>;
export const humanNormalizeSchema1: RxJsonSchema<AgeHumanDocumentType> = humanNormalizeSchema1Literal;

export const humanNormalizeSchema2: RxJsonSchema<AgeHumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            minLength: 4,
            maxLength: 100
        },
        age: {
            minimum: 0,
            type: 'integer',
            description: 'age in years',
            maximum: 150,
            multipleOf: 1
        }
    },
    description: 'describes a human being',
    required: ['age', 'passportId']
});

export const refHuman: RxJsonSchema<RefHumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human related to other human',
    version: 0,
    keyCompression: false,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 100
        },
        bestFriend: {
            ref: 'human',
            type: 'string'
        }
    },
    required: [
        'name'
    ]
});

export const humanCompositePrimary: RxJsonSchema<HumanWithCompositePrimary> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: {
        key: 'id',
        fields: [
            'firstName',
            'info.age'
        ],
        separator: '|'
    },
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string'
        },
        info: {
            type: 'object',
            properties: {
                age: {
                    description: 'age in years',
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            },
            required: ['age']
        }
    },
    required: [
        'id',
        'firstName',
        'lastName',
        'info'
    ],
    indexes: ['firstName']
};

export const humanCompositePrimarySchemaLiteral = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: {
        key: 'id',
        fields: [
            'firstName',
            'info.age'
        ],
        separator: '|'
    },
    encrypted: [],
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string'
        },
        info: {
            type: 'object',
            properties: {
                age: {
                    description: 'age in years',
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            },
            required: ['age']
        },
        readonlyProps: {
            allOf: [],
            anyOf: [],
            oneOf: [],
            type: [],
            dependencies: {
                someDep: ['asd'],
            },
            items: [],
            required: [],
            enum: [],
        }
    },
    required: [
        'id',
        'firstName',
        'lastName',
        'info'
    ],
    indexes: ['firstName']
} as const);

const humanCompositePrimarySchemaTyped = toTypedRxJsonSchema(humanCompositePrimarySchemaLiteral);
export type HumanCompositePrimaryDocType = ExtractDocumentTypeFromTypedRxJsonSchema<typeof humanCompositePrimarySchemaTyped>;

export const refHumanNested: RxJsonSchema<RefHumanNestedDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human related to other human',
    version: 0,
    keyCompression: false,
    primaryKey: 'name',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            maxLength: 100
        },
        foo: {
            type: 'object',
            properties: {
                bestFriend: {
                    ref: 'human',
                    type: 'string'
                }
            }
        }
    },
    required: [
        'name'
    ]
});

/**
 * an average schema used in performance-tests
 */
export function averageSchema(): RxJsonSchema<AverageSchemaDocumentType> {
    const ret: RxJsonSchema<AverageSchemaDocumentType> = {
        title: 'averageSchema_' + AsyncTestUtil.randomString(5), // randomisation used so hash differs
        version: 0,
        primaryKey: 'id',
        type: 'object',
        keyCompression: false,
        properties: {
            id: {
                description: 'id',
                type: 'string',
                maxLength: 12
            },
            var1: {
                description: 'var1',
                type: 'string',
                maxLength: 12
            },
            var2: {
                description: 'var2',
                type: 'number',
                minimum: 0,
                maximum: 50000,
                multipleOf: 1
            },
            deep: {
                type: 'object',
                properties: {
                    deep1: {
                        type: 'string',
                        maxLength: 10
                    },
                    deep2: {
                        type: 'string',
                        maxLength: 10
                    }
                }
            },
            list: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        deep1: {
                            type: 'string'
                        },
                        deep2: {
                            type: 'string'
                        }
                    }
                }
            }
        },
        required: [
            'id',
            'var1',
            'var2'
        ],
        indexes: [
            'var1',
            'var2',
            'deep.deep1',
            // one compound index
            [
                'var2',
                'var1'
            ]
        ],
        sharding: {
            shards: 6,
            mode: 'collection'
        }
    };
    return ret;
}

export const point: RxJsonSchema<PointDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'point schema',
    version: 0,
    description: 'describes coordinates in 2d space',
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        x: {
            type: 'number'
        },
        y: {
            type: 'number'
        }
    },
    required: ['x', 'y']
});

export const humanMinimal: RxJsonSchema<SimpleHumanV3DocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        age: {
            type: 'integer'
        },
        oneOptional: {
            type: 'string'
        }
    },
    indexes: [],
    required: ['passportId', 'age']
});

export const humanMinimalBroken: RxJsonSchema<{ passportId: string; broken: number; }> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        broken: {
            type: 'integer'
        }
    },
    indexes: [],
    required: ['passportId', 'broken']
} as unknown as RxJsonSchema<any>;


/**
 * used in the graphql-test
 * contains timestamp
 */
export const humanWithTimestamp: RxJsonSchema<HumanWithTimestampDocumentType> = overwritable.deepFreezeWhenDevMode({
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string',
            maxLength: 1000
        },
        age: {
            type: 'number'
        },
        updatedAt: {
            type: 'number',
            minimum: 0,
            maximum: META_LWT_UNIX_TIME_MAX,
            multipleOf: 1

        },
        deletedAt: {
            type: 'number'
        }
    },
    indexes: ['updatedAt'],
    required: ['id', 'name', 'age', 'updatedAt']
});

export const humanWithTimestampNested: RxJsonSchema<HumanWithTimestampNestedDocumentType> = overwritable.deepFreezeWhenDevMode({
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string',
            maxLength: 1000
        },
        age: {
            type: 'number'
        },
        updatedAt: {
            type: 'number',
            minimum: 0,
            maximum: META_LWT_UNIX_TIME_MAX,
            multipleOf: 1

        },
        deletedAt: {
            type: 'number'
        },
        address: {
            type: 'object',
            properties: {
                street: {
                    type: 'string',
                },
                suite: {
                    type: 'string',
                },
                city: {
                    type: 'string',
                },
                zipcode: {
                    type: 'string',
                },
                geo: {
                    type: 'object',
                    properties: {
                        lat: {
                            type: 'string',
                        },
                        lng: {
                            type: 'string',
                        },
                    },
                },
            },
        },
    },
    indexes: ['updatedAt'],
    required: ['id', 'name', 'age', 'updatedAt']
});


/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export const humanWithTimestampAllIndex: RxJsonSchema<HumanWithTimestampDocumentType> = overwritable.deepFreezeWhenDevMode({
    version: 0,
    type: 'object',
    primaryKey: 'id',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string',
            maxLength: 100
        },
        age: {
            type: 'number',
            minimum: 0,
            maximum: 1500,
            multipleOf: 1
        },
        updatedAt: {
            type: 'number',
            minimum: 0,
            maximum: META_LWT_UNIX_TIME_MAX,
            multipleOf: 1
        },
        deletedAt: {
            type: 'number'
        }
    },
    indexes: ['name', 'age', 'updatedAt'],
    required: ['id', 'name', 'age', 'updatedAt']
});

export const humanWithSimpleAndCompoundIndexes: RxJsonSchema<{
    id: string;
    name: string;
    age: number;
    createdAt: number;
    updatedAt: number;
}> = overwritable.deepFreezeWhenDevMode({
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string',
            maxLength: 100
        },
        age: {
            type: 'number',
            minimum: 0,
            maximum: 1500,
            multipleOf: 1
        },
        createdAt: {
            type: 'number',
            minimum: 0,
            maximum: META_LWT_UNIX_TIME_MAX,
            multipleOf: 1
        },
        updatedAt: {
            type: 'number',
            minimum: 0,
            maximum: META_LWT_UNIX_TIME_MAX,
            multipleOf: 1
        }
    },
    indexes: [
        ['name', 'id'],
        ['age', 'id'],
        ['createdAt', 'updatedAt', 'id']
    ],
    required: ['id', 'name', 'age', 'updatedAt']
});

export const humanWithDeepNestedIndexes: RxJsonSchema<{ id: string; name: string; job: any; }> = overwritable.deepFreezeWhenDevMode({
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string',
            maxLength: 100
        },
        job: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    maxLength: 100
                },
                manager: {
                    type: 'object',
                    properties: {
                        fullName: {
                            type: 'string',
                            maxLength: 100
                        },
                        previousJobs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string',
                                        maxLength: 100
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    required: [
        'id'
    ],
    indexes: [
        'name',
        'job.name',
        'job.manager.fullName'
    ]
});

export const humanIdAndAgeIndex: RxJsonSchema<{ id: string; name: string; age: number; }> = overwritable.deepFreezeWhenDevMode({
    version: 0,
    description: 'uses a compound index with id as lowest level',
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            maxLength: 100
        },
        name: {
            type: 'string'
        },
        age: {
            description: 'Age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            multipleOf: 1
        }
    },
    required: ['id', 'name', 'age'],
    indexes: [
        ['age', 'id']
    ]
});

export const humanWithOwnership: RxJsonSchema<HumanDocumentType> = overwritable.deepFreezeWhenDevMode({
    title: 'human schema',
    version: 0,
    description: 'describes a human being',
    keyCompression: false,
    primaryKey: 'passportId',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            maxLength: 100
        },
        firstName: {
            type: 'string',
            maxLength: 100
        },
        lastName: {
            type: 'string',
            maxLength: 100
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            default: 20
        },
        owner: {
            type: 'string',
            maxLength: 128
        }
    },
    indexes: [],
    required: ['passportId']
});


export function enableKeyCompression<RxDocType>(
    schema: RxJsonSchema<RxDocType>
): RxJsonSchema<RxDocType> {
    const ret = flatClone(schema);
    ret.keyCompression = true;
    return ret;
}

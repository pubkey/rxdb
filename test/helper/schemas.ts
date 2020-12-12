import AsyncTestUtil from 'async-test-util';

import type {
    RxJsonSchema
} from '../../plugins/core';
import {
    HumanDocumentType,
    SimpleHumanV3DocumentType,
    HumanWithSubOtherDocumentType,
    NestedHumanDocumentType,
    DeepNestedHumanDocumentType,
    IdPrimaryDocumentType,
    EncryptedHumanDocumentType,
    EncryptedObjectHumanDocumentType,
    EncryptedDeepHumanDocumentType,
    CompoundIndexDocumentType,
    CompoundIndexNoStringDocumentType,
    HeroArrayDocumentType,
    SimpleHeroArrayDocumentType,
    AgeHumanDocumentType,
    RefHumanDocumentType,
    RefHumanNestedDocumentType,
    AverageSchemaDocumentType,
    PointDocumentType,
    HumanWithTimestampDocumentType,
    BigHumanDocumentType,
    NostringIndexDocumentType,
    NoIndexHumanDocumentType
} from './schema-objects';

export const human: RxJsonSchema<HumanDocumentType> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150
        }
    },
    required: ['firstName', 'lastName'],
    indexes: ['passportId']
};

export const humanDefault: RxJsonSchema<HumanDocumentType> = {
    title: 'human schema',
    version: 0,
    description: 'describes a human being',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            default: 20
        }
    },
    indexes: ['passportId'],
    required: ['passportId']
};

export const humanFinal: RxJsonSchema<HumanDocumentType> = {
    title: 'human schema with age set final',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            primary: true
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
    }
};

export const simpleHuman: RxJsonSchema<SimpleHumanV3DocumentType> = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a simple human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        age: {
            type: 'string'
        },
    },
    indexes: ['passportId'],
    required: ['passportId', 'age']
};

export const simpleHumanV3: RxJsonSchema<SimpleHumanV3DocumentType> = {
    title: 'human schema',
    version: 3,
    keyCompression: true,
    description: 'describes a simple human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        age: {
            type: 'number'
        }
    },
    indexes: ['passportId'],
    required: ['passportId', 'age']
};

export const humanAgeIndex: RxJsonSchema<HumanDocumentType> = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
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
            maximum: 150
        }
    },
    required: ['firstName', 'lastName', 'age'],
    indexes: ['passportId', 'age']
};

export const humanArrayIndex: RxJsonSchema = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        jobs: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    }
                }
            }
        }
    },
    required: ['firstName', 'lastName', 'age'],
    indexes: ['jobs.[].name']
};

export const humanSubIndex: RxJsonSchema<HumanWithSubOtherDocumentType> = {
    title: 'human schema',
    version: 0,
    description: 'describes a human being where other.age is index',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            primary: true
        },
        other: {
            type: 'object',
            properties: {
                age: {
                    description: 'Age in years',
                    type: 'integer',
                    minimum: 0,
                    maximum: 150
                }
            }
        }
    },
    indexes: ['other.age']
};

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export const humanWithAllIndex: RxJsonSchema<HumanDocumentType> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150
        }
    },
    indexes: ['passportId', 'firstName', 'lastName', 'age'],
    required: ['firstName', 'lastName']
};

export const nestedHuman: RxJsonSchema<NestedHumanDocumentType> = {
    title: 'human nested',
    version: 0,
    description: 'describes a human being with a nested field',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        firstName: {
            type: 'string'
        },
        mainSkill: {
            type: 'object',
            properties: {
                name: {
                    type: 'string'
                },
                level: {
                    type: 'number',
                    minimum: 0,
                    maximum: 10
                }
            },
            required: ['name', 'level']
        }
    },
    required: ['firstName'],
    indexes: ['passportId']
};

export const deepNestedHuman: RxJsonSchema<DeepNestedHumanDocumentType> = {
    title: 'deep human nested',
    version: 0,
    keyCompression: true,
    description: 'describes a human being with a nested field',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
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
    indexes: ['passportId'],
    required: ['mainSkill']
};

export const noIndexHuman: RxJsonSchema<NoIndexHumanDocumentType> = {
    title: 'human schema',
    version: 0,
    description: 'this schema has no index',
    keyCompression: true,
    type: 'object',
    properties: {
        firstName: {
            type: 'string'
        },
        lastName: {
            type: 'string'
        }
    },
    required: ['firstName', 'lastName']
};

export const noStringIndex: RxJsonSchema<NostringIndexDocumentType> = {
    description: 'the index has no type:string',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'object'
        },
        firstName: {
            type: 'string'
        }
    },
    required: ['firstName', 'passportId'],
    indexes: ['passportId']
};

export const _idPrimary: RxJsonSchema<IdPrimaryDocumentType> = {
    description: 'the primary is \'_id\'',
    version: 0,
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            primary: true
        },
        firstName: {
            type: 'string'
        }
    },
    required: ['firstName']
};

export const bigHuman: RxJsonSchema<BigHumanDocumentType> = {
    title: 'human schema',
    version: 0,
    description: 'describes a human being with 2 indexes',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        dnaHash: {
            type: 'string'
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
            minimum: 0
        }
    },
    required: ['firstName', 'lastName'],
    indexes: ['passportId', 'dnaHash']
};

export const encryptedHuman: RxJsonSchema<EncryptedHumanDocumentType> = {
    title: 'human encrypted',
    version: 0,
    description: 'uses an encrypted field',
    type: 'object',
    keyCompression: true,
    properties: {
        passportId: {
            type: 'string'
        },
        firstName: {
            type: 'string'
        },
        secret: {
            type: 'string'
        }
    },
    indexes: ['passportId'],
    required: ['firstName', 'secret'],
    encrypted: ['secret']
};

export const encryptedObjectHuman: RxJsonSchema<EncryptedObjectHumanDocumentType> = {
    title: 'human encrypted',
    version: 0,
    keyCompression: true,
    description: 'uses an encrypted field',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
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
    indexes: ['passportId'],
    required: ['firstName', 'secret'],
    encrypted: ['secret']
};

export const encryptedDeepHuman: RxJsonSchema<EncryptedDeepHumanDocumentType> = {
    title: 'human encrypted',
    version: 0,
    keyCompression: true,
    description: 'uses an encrypted field',
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
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
    indexes: ['passportId'],
    required: ['firstName', 'secretData'],
    encrypted: [
        'firstLevelPassword',
        'secretData',
        'deepSecret.darkhole.pw',
        'nestedSecret.darkhole.pw'
    ]
};

export const notExistingIndex: RxJsonSchema = {
    title: 'index',
    version: 0,
    description: 'this schema has a specified index which does not exists',
    type: 'object',
    keyCompression: true,
    properties: {
        address: {
            type: 'object',
            properties: {
                street: { type: 'string' }
            }
        }
    },
    indexes: ['address.apartment']
};

export const compoundIndex: RxJsonSchema<CompoundIndexDocumentType> = {
    title: 'compund index',
    version: 0,
    description: 'this schema has a compoundIndex',
    type: 'object',
    keyCompression: true,
    properties: {
        passportId: {
            type: 'string'
        },
        passportCountry: {
            type: 'string'
        },
        age: {
            type: 'integer'
        }
    },
    indexes: [
        ['passportId', 'passportCountry']
    ]
};

export const compoundIndexNoString: RxJsonSchema<CompoundIndexNoStringDocumentType> = {
    title: 'compound index',
    version: 0,
    description: 'this schema has a compoundIndex',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
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

export const wrongCompoundFormat: RxJsonSchema = {
    title: 'compund index',
    version: 0,
    description: 'this schema has a compoundIndex',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        passportCountry: {
            type: 'string'
        },
        age: {
            type: 'integer'
        }
    },
    compoundIndexes: [{
        foo: 'bar'
    }]
} as RxJsonSchema;

export const empty: RxJsonSchema = {
    title: 'empty schema',
    version: 0,
    type: 'object',
    properties: {},
    required: []
};

export const heroArray: RxJsonSchema<HeroArrayDocumentType> = {
    title: 'hero schema',
    version: 0,
    keyCompression: true,
    description: 'describes a hero with an array-field',
    type: 'object',
    properties: {
        name: {
            type: 'string',
            primary: true
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
    }
};

export const simpleArrayHero: RxJsonSchema<SimpleHeroArrayDocumentType> = {
    title: 'hero schema',
    version: 0,
    description: 'describes a hero with a string-array-field',
    keyCompression: true,
    type: 'object',
    properties: {
        name: {
            type: 'string',
            primary: true
        },
        skills: {
            type: 'array',
            maxItems: 5,
            uniqueItems: true,
            items: {
                type: 'string',
            }
        }
    }
};

export const primaryHuman: RxJsonSchema<HumanDocumentType> = {
    title: 'human schema with primary',
    version: 0,
    description: 'describes a human being with passsportID as primary',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            primary: true,
            minLength: 4
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
            maximum: 150
        }
    },
    required: ['firstName', 'lastName']
};

export const humanNormalizeSchema1: RxJsonSchema<AgeHumanDocumentType> = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a human being',
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
};

export const humanNormalizeSchema2: RxJsonSchema<AgeHumanDocumentType> = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        age: {
            minimum: 0,
            type: 'integer',
            description: 'age in years',
            maximum: 150
        }
    },
    description: 'describes a human being',
    required: ['age']
};

export const refHuman: RxJsonSchema<RefHumanDocumentType> = {
    title: 'human related to other human',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        name: {
            primary: true,
            type: 'string'
        },
        bestFriend: {
            ref: 'human',
            type: 'string'
        }
    }
};

export const refHumanNested: RxJsonSchema<RefHumanNestedDocumentType> = {
    title: 'human related to other human',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        name: {
            primary: true,
            type: 'string'
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
    }
};

/**
 * an average schema used in performance-tests
 */
export function averageSchema(): RxJsonSchema<AverageSchemaDocumentType> {
    const ret: RxJsonSchema = {
        title: 'averageSchema_' + AsyncTestUtil.randomString(5), // randomisation used so hash differs
        version: 0,
        type: 'object',
        keyCompression: true,
        properties: {
            id: {
                type: 'string',
                primary: true
            },
            var1: {
                type: 'string'
            },
            var2: {
                type: 'number',
            },
            deep: {
                type: 'object',
                properties: {
                    deep1: {
                        type: 'string'
                    },
                    deep2: {
                        type: 'string'
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
        indexes: [
            'var1',
            'deep.deep1',
            // one compound index
            [
                'var2',
                'var1'
            ]
        ]
    };
    return ret;
}

export const point: RxJsonSchema<PointDocumentType> = {
    title: 'point schema',
    version: 0,
    description: 'describes coordinates in 2d space',
    type: 'object',
    properties: {
        x: {
            type: 'number'
        },
        y: {
            type: 'number'
        }
    },
    required: ['x', 'y']
};

export const humanMinimal: RxJsonSchema<SimpleHumanV3DocumentType> = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        age: {
            type: 'integer'
        }
    },
    indexes: ['passportId'],
    required: ['passportId', 'age']
};

export const humanMinimalBroken: RxJsonSchema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string'
        },
        broken: {
            type: 'integer'
        }
    },
    indexes: ['passportId'],
    required: ['passportId', 'broken']
} as unknown as RxJsonSchema<SimpleHumanV3DocumentType>;


/**
 * used in the graphql-test
 * contains timestamp
 */
export const humanWithTimestamp: RxJsonSchema<HumanWithTimestampDocumentType> = {
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string'
        },
        age: {
            type: 'number'
        },
        updatedAt: {
            type: 'number'
        },
        last_pulled_rev: {
            type: 'string'
        }
    },
    required: ['id', 'name', 'age', 'updatedAt']
};

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export const humanWithTimestampAllIndex: RxJsonSchema<HumanWithTimestampDocumentType> = {
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string'
        },
        age: {
            type: 'number'
        },
        updatedAt: {
            type: 'number'
        }
    },
    indexes: ['name', 'age', 'updatedAt'],
    required: ['id', 'name', 'age', 'updatedAt']
};

export const humanWithSimpleAndCompoundIndexes: RxJsonSchema = {
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string'
        },
        age: {
            type: 'number'
        },
        createdAt: {
            type: 'number'
        },
        updatedAt: {
            type: 'number'
        },
        last_pulled_rev: {
            type: 'string'
        }
    },
    indexes: ['name', 'age', ['createdAt', 'updatedAt']],
    required: ['id', 'name', 'age', 'updatedAt']
};

export const humanWithDeepNestedIndexes: RxJsonSchema = {
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string'
        },
        job: {
            type: 'object',
            properties: {
                name: {
                    type: 'string'
                },
                manager: {
                    type: 'object',
                    properties: {
                        fullName: {
                            type: 'string'
                        },
                        previousJobs: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    name: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    indexes: ['name', 'job.name', 'job.manager.fullName', 'job.manager.previousJobs.[].name']
};

export const humanIdAndAgeIndex: RxJsonSchema = {
    version: 0,
    description: 'uses a compound index with id as lowest level',
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string'
        },
        age: {
            description: 'Age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150
        }
    },
    required: ['id', 'name', 'age'],
    indexes: [
        ['age', 'id']
    ]
};

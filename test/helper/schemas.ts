import AsyncTestUtil from 'async-test-util';

import {
    RxJsonSchema
} from '../../src/types';

export const human: RxJsonSchema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
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
    required: ['firstName', 'lastName']
};

export const humanDefault: RxJsonSchema = {
    title: 'human schema',
    version: 0,
    description: 'describes a human being',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
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
    required: ['passportId']
};

export const humanFinal: RxJsonSchema = {
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

export const simpleHuman: RxJsonSchema = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a simple human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        age: {
            type: 'string'
        },
    },
    required: ['passportId', 'age']
};

export const simpleHumanV3: RxJsonSchema = {
    title: 'human schema',
    version: 3,
    keyCompression: true,
    description: 'describes a simple human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        age: {
            type: 'number'
        },
    },
    required: ['passportId', 'age']
};

export const humanAgeIndex: RxJsonSchema = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a human being',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
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
            index: true
        }
    },
    required: ['firstName', 'lastName', 'age']
};

export const humanSubIndex: RxJsonSchema = {
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
                    maximum: 150,
                    index: true
                }
            }
        }
    }
};

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export const humanWithAllIndex: RxJsonSchema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        firstName: {
            type: 'string',
            index: true
        },
        lastName: {
            type: 'string',
            index: true
        },
        age: {
            description: 'age in years',
            type: 'integer',
            minimum: 0,
            maximum: 150,
            index: true
        }
    },
    required: ['firstName', 'lastName']
};

export const nestedHuman: RxJsonSchema = {
    title: 'human nested',
    version: 0,
    description: 'describes a human being with a nested field',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
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
    required: ['firstName']
};

export const deepNestedHuman: RxJsonSchema = {
    title: 'deep human nested',
    version: 0,
    keyCompression: true,
    description: 'describes a human being with a nested field',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
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
            required: ['name', 'attack']
        }
    },
    required: ['mainSkill']
};

export const noindexHuman: RxJsonSchema = {
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


export const nostringIndex: RxJsonSchema = {
    description: 'the index has no type:string',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'object',
            index: true
        },
        firstName: {
            type: 'string'
        }
    },
    required: ['firstName', 'lastName']
};


export const _idPrimary: RxJsonSchema = {
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

export const bigHuman: RxJsonSchema = {
    title: 'human schema',
    version: 0,
    description: 'describes a human being with 2 indexes',
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        dnaHash: {
            type: 'string',
            index: true
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
    required: ['firstName', 'lastName']
};

export const encryptedHuman: RxJsonSchema = {
    title: 'human encrypted',
    version: 0,
    description: 'uses an encrypted field',
    type: 'object',
    keyCompression: true,
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        firstName: {
            type: 'string'
        },
        secret: {
            type: 'string',
            encrypted: true
        }
    },
    required: ['firstName', 'secret']
};

export const encryptedObjectHuman: RxJsonSchema = {
    title: 'human encrypted',
    version: 0,
    keyCompression: true,
    description: 'uses an encrypted field',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        firstName: {
            type: 'string'
        },
        secret: {
            type: 'object',
            encrypted: true,
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
    required: ['firstName', 'secret']
};

export const encryptedDeepHuman: RxJsonSchema = {
    title: 'human encrypted',
    version: 0,
    keyCompression: true,
    description: 'uses an encrypted field',
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        firstName: {
            type: 'string'
        },
        firstLevelPassword: {
            type: 'string',
            encrypted: true
        },
        secretData: {
            type: 'object',
            encrypted: true,
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
                            encrypted: true,
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
                    encrypted: true,
                    type: 'object',
                    properties: {
                        pw: {
                            encrypted: true,
                            type: 'string'
                        }
                    }
                }
            }
        }

    },
    required: ['firstName', 'secret']
};


export const compoundIndex: RxJsonSchema = {
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
    compoundIndexes: [
        ['passportId', 'passportCountry']
    ]
};

export const compoundIndexNoString: RxJsonSchema = {
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
            type: 'object'
        },
        age: {
            type: 'integer'
        }
    },
    compoundIndexes: [
        ['passportId', 'passportCountry']
    ]
};


export const wrongCompoundFormat: any = {
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
};


export const empty: RxJsonSchema = {
    title: 'empty schema',
    version: 0,
    type: 'object',
    properties: {},
    required: []
};

export const heroArray: RxJsonSchema = {
    'title': 'hero schema',
    version: 0,
    keyCompression: true,
    'description': 'describes a hero with an array-field',
    'type': 'object',
    'properties': {
        'name': {
            'type': 'string',
            'primary': true
        },
        'skills': {
            'type': 'array',
            'maxItems': 5,
            'uniqueItems': true,
            'items': {
                'type': 'object',
                'properties': {
                    'name': {
                        'type': 'string'
                    },
                    'damage': {
                        'type': 'number'
                    }
                }
            }
        }
    }
};

export const simpleArrayHero: RxJsonSchema = {
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


export const primaryHuman: RxJsonSchema = {
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

export const humanNormalizeSchema1: RxJsonSchema = {
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
    required: ['firstName', 'lastName']
};

export const humanNormalizeSchema2: RxJsonSchema = {
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
    required: ['lastName', 'firstName']
};


export const refHuman: RxJsonSchema = {
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

export const refHumanNested: RxJsonSchema = {
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
export function averageSchema(): RxJsonSchema {
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
                type: 'string',
                index: true
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
        }
    };
    return ret;
}

export const point: RxJsonSchema = {
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

export const humanMinimal: RxJsonSchema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: true,
    type: 'object',
    properties: {
        passportId: {
            type: 'string',
            index: true
        },
        age: {
            type: 'integer'
        }
    },
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
            type: 'string',
            index: true
        },
        broken: {
            type: 'integer'
        }
    },
    required: ['passportId', 'broken']
};


/**
 * used in the graphql-test
 * contains timestamp
 */
export const humanWithTimestamp: RxJsonSchema = {
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
    required: ['id', 'name', 'age', 'updatedAt']
};

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export const humanWithTimestampAllIndex: RxJsonSchema = {
    version: 0,
    type: 'object',
    properties: {
        id: {
            type: 'string',
            primary: true
        },
        name: {
            type: 'string',
            index: true
        },
        age: {
            type: 'number',
            index: true
        },
        updatedAt: {
            type: 'number',
            index: true
        }
    },
    required: ['id', 'name', 'age', 'updatedAt']
};

import AsyncTestUtil from 'async-test-util';

export const human = {
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

export const humanDefault = {
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

export const humanFinal = {
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

export const simpleHuman = {
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

export const simpleHumanV3 = {
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

export const humanAgeIndex = {
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

export const humanSubIndex = {
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

export const nestedHuman = {
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

export const deepNestedHuman = {
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

export const noindexHuman = {
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


export const nostringIndex = {
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


export const _idPrimary = {
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

export const bigHuman = {
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

export const encryptedHuman = {
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

export const encryptedObjectHuman = {
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

export const encryptedDeepHuman = {
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


export const compoundIndex = {
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

export const compoundIndexNoString = {
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


export const wrongCompoundFormat = {
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


export const empty = {
    title: 'empty schema',
    version: 0,
    type: 'object',
    properties: {},
    required: []
};

export const heroArray = {
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
            'item': {
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
    },
    'required': ['color']
};

export const simpleArrayHero = {
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
            item: {
                type: 'string',
            }
        }
    }
};


export const primaryHuman = {
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

export const humanNormalizeSchema1 = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
    description: 'describes a human being',
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

export const humanNormalizeSchema2 = {
    title: 'human schema',
    version: 0,
    keyCompression: true,
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


export const refHuman = {
    title: 'human related to other human',
    version: 0,
    keyCompression: true,
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

export const refHumanNested = {
    title: 'human related to other human',
    version: 0,
    keyCompression: true,
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
export const averageSchema = () => ({
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
});

export const point = {
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

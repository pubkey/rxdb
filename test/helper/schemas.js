export const human = {
    title: 'human schema',
    description: 'describes a simple human being',
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


export const humanAgeIndex = {
    title: 'human schema',
    description: 'describes a simple human being',
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


export const nestedHuman = {
    title: 'human nested',
    description: 'describes a simple human being with a nested field',
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
    description: 'describes a simple human being with a nested field',
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
    description: 'this schema has no index',
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



export const bigHuman = {

    title: 'human schema',
    description: 'describes a simple human being with 2 indexes',
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
            type: 'string',
            encrypted: true
        }
    },
    required: ['firstName', 'secret']
};

export const encryptedObjectHuman = {
    title: 'human encrypted',
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
    description: 'this schema has a compoundIndex',
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
    compoundIndexes: [
        ['passportId', 'passportCountry']
    ]
};

export const compoundIndexNoString = {
    title: 'compund index',
    description: 'this schema has a compoundIndex',
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
    description: 'this schema has a compoundIndex',
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
    type: 'object',
    properties: {},
    required: []
};

export const heroArray = {
    'title': 'hero schema',
    'description': 'describes a simple hero with an array-field',
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


export const primaryHuman = {
    title: 'human schema with primary',
    description: 'describes a simple human being with passsportID as primary',
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
        }
    },
    required: ['firstName', 'lastName']
};

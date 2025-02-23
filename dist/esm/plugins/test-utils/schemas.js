import AsyncTestUtil from 'async-test-util';
import { overwritable } from "../../overwritable.js";
import { toTypedRxJsonSchema } from "../../rx-schema.js";
import { flatClone } from "../utils/index.js";
export var humanSchemaLiteral = overwritable.deepFreezeWhenDevMode({
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
});
var humanSchemaTyped = toTypedRxJsonSchema(humanSchemaLiteral);
export var human = humanSchemaLiteral;
export var humanDefault = overwritable.deepFreezeWhenDevMode({
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
export var humanFinal = overwritable.deepFreezeWhenDevMode({
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
  required: ['passportId']
});
export var simpleHuman = overwritable.deepFreezeWhenDevMode({
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
export var simpleHumanV3 = overwritable.deepFreezeWhenDevMode({
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
export var humanAgeIndex = overwritable.deepFreezeWhenDevMode({
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
export var humanSubIndex = overwritable.deepFreezeWhenDevMode({
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
  required: ['passportId'],
  indexes: ['other.age']
});

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export var humanWithAllIndex = overwritable.deepFreezeWhenDevMode({
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
export var nestedHuman = {
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
export var deepNestedHuman = {
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
export var noIndexHuman = overwritable.deepFreezeWhenDevMode({
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
export var noStringIndex = overwritable.deepFreezeWhenDevMode({
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
export var bigHuman = overwritable.deepFreezeWhenDevMode({
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
export var encryptedHuman = {
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
export var encryptedObjectHuman = {
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
export var encryptedDeepHuman = {
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
      type: 'string'
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
  encrypted: ['firstLevelPassword', 'secretData', 'deepSecret.darkhole.pw', 'nestedSecret.darkhole.pw']
};
export var notExistingIndex = {
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
        street: {
          type: 'string'
        }
      }
    }
  },
  required: ['passportId'],
  indexes: ['address.apartment']
};
export var compoundIndex = overwritable.deepFreezeWhenDevMode({
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
  required: ['passportId'],
  indexes: [['age', 'passportCountry']]
});
export var compoundIndexNoString = {
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
  indexes: [[10, 'passportCountry']]
};
export var empty = {
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
export var heroArray = overwritable.deepFreezeWhenDevMode({
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
  required: ['name']
});
export var simpleArrayHero = overwritable.deepFreezeWhenDevMode({
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
        type: 'string'
      }
    }
  },
  required: ['name']
});
export var primaryHumanLiteral = overwritable.deepFreezeWhenDevMode({
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
});
var primaryHumanTypedSchema = toTypedRxJsonSchema(primaryHumanLiteral);
export var primaryHuman = primaryHumanLiteral;
export var humanNormalizeSchema1Literal = overwritable.deepFreezeWhenDevMode({
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
});
var humanNormalizeSchema1Typed = toTypedRxJsonSchema(humanNormalizeSchema1Literal);
export var humanNormalizeSchema1 = humanNormalizeSchema1Literal;
export var humanNormalizeSchema2 = overwritable.deepFreezeWhenDevMode({
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
export var refHuman = overwritable.deepFreezeWhenDevMode({
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
  required: ['name']
});
export var humanCompositePrimary = {
  title: 'human schema',
  description: 'describes a human being',
  version: 0,
  keyCompression: false,
  primaryKey: {
    key: 'id',
    fields: ['firstName', 'info.age'],
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
  required: ['id', 'firstName', 'lastName', 'info'],
  indexes: ['firstName']
};
export var humanCompositePrimarySchemaLiteral = overwritable.deepFreezeWhenDevMode({
  title: 'human schema',
  description: 'describes a human being',
  version: 0,
  keyCompression: false,
  primaryKey: {
    key: 'id',
    fields: ['firstName', 'info.age'],
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
        someDep: ['asd']
      },
      items: [],
      required: [],
      enum: []
    }
  },
  required: ['id', 'firstName', 'lastName', 'info'],
  indexes: ['firstName']
});
var humanCompositePrimarySchemaTyped = toTypedRxJsonSchema(humanCompositePrimarySchemaLiteral);
export var refHumanNested = overwritable.deepFreezeWhenDevMode({
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
  required: ['name']
});

/**
 * an average schema used in performance-tests
 */
export function averageSchema() {
  var ret = {
    title: 'averageSchema_' + AsyncTestUtil.randomString(5),
    // randomisation used so hash differs
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
    required: ['id', 'var1', 'var2'],
    indexes: ['var1', 'var2', 'deep.deep1',
    // one compound index
    ['var2', 'var1']],
    sharding: {
      shards: 6,
      mode: 'collection'
    }
  };
  return ret;
}
export var point = overwritable.deepFreezeWhenDevMode({
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
export var humanMinimal = overwritable.deepFreezeWhenDevMode({
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
export var humanMinimalBroken = {
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
};

/**
 * used in the graphql-test
 * contains timestamp
 */
export var humanWithTimestamp = overwritable.deepFreezeWhenDevMode({
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
      maximum: 10000000000000000,
      multipleOf: 1
    },
    deletedAt: {
      type: 'number'
    }
  },
  indexes: ['updatedAt'],
  required: ['id', 'name', 'age', 'updatedAt']
});
export var humanWithTimestampNested = overwritable.deepFreezeWhenDevMode({
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
      maximum: 10000000000000000,
      multipleOf: 1
    },
    deletedAt: {
      type: 'number'
    },
    address: {
      type: 'object',
      properties: {
        street: {
          type: 'string'
        },
        suite: {
          type: 'string'
        },
        city: {
          type: 'string'
        },
        zipcode: {
          type: 'string'
        },
        geo: {
          type: 'object',
          properties: {
            lat: {
              type: 'string'
            },
            lng: {
              type: 'string'
            }
          }
        }
      }
    }
  },
  indexes: ['updatedAt'],
  required: ['id', 'name', 'age', 'updatedAt']
});

/**
 * each field is an index,
 * use this to slow down inserts in tests
 */
export var humanWithTimestampAllIndex = overwritable.deepFreezeWhenDevMode({
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
      maximum: 10000000000000000,
      multipleOf: 1
    },
    deletedAt: {
      type: 'number'
    }
  },
  indexes: ['name', 'age', 'updatedAt'],
  required: ['id', 'name', 'age', 'updatedAt']
});
export var humanWithSimpleAndCompoundIndexes = overwritable.deepFreezeWhenDevMode({
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
      maximum: 10000000000000000,
      multipleOf: 1
    },
    updatedAt: {
      type: 'number',
      minimum: 0,
      maximum: 10000000000000000,
      multipleOf: 1
    }
  },
  indexes: [['name', 'id'], ['age', 'id'], ['createdAt', 'updatedAt', 'id']],
  required: ['id', 'name', 'age', 'updatedAt']
});
export var humanWithDeepNestedIndexes = overwritable.deepFreezeWhenDevMode({
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
  required: ['id'],
  indexes: ['name', 'job.name', 'job.manager.fullName']
});
export var humanIdAndAgeIndex = overwritable.deepFreezeWhenDevMode({
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
  indexes: [['age', 'id']]
});
export var humanWithOwnership = overwritable.deepFreezeWhenDevMode({
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
export function enableKeyCompression(schema) {
  var ret = flatClone(schema);
  ret.keyCompression = true;
  return ret;
}
//# sourceMappingURL=schemas.js.map
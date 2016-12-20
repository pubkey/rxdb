'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.socket = exports.collections = exports.administration = undefined;

var _RxSchema = require('./RxSchema');

var RxSchema = _interopRequireWildcard(_RxSchema);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

var administration = exports.administration = RxSchema.create({
    properties: {
        key: {
            type: 'string',
            primary: true
        },
        value: {
            type: 'string'
        }
    },
    required: ['value']
});

var collections = exports.collections = RxSchema.create({
    properties: {
        name: {
            type: 'string',
            primary: true
        },
        schemaHash: {
            type: 'string'
        }
    },
    required: ['schemaHash']
});

var socket = exports.socket = RxSchema.create({
    properties: {
        h: {
            description: 'hash of the whole event',
            primary: true,
            type: 'string'
        },
        it: {
            description: 'token of the db-instance',
            type: 'string'
        },
        t: {
            description: 'timestamp unix',
            type: 'number',
            min: 100
        },
        op: {
            description: 'operation-code of the changeEvent',
            type: 'string'
        },
        col: {
            description: 'collection-name',
            type: 'string'
        },
        doc: {
            description: 'Document._id',
            type: 'string'
        },
        v: {
            description: 'the value, maybe encrypted or JSON.stringify',
            type: 'string'
        }
    },
    required: ['it', 't', 'op']
});
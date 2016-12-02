import * as RxSchema from './RxSchema';


export const administration = RxSchema.create({
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


export const collections = RxSchema.create({
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


export const socket = RxSchema.create({
    properties: {
        it: {
            description: 'token of the db-instance',
            type: 'string',
            index: true
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

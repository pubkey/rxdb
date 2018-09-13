/**
 * this tests some basic behavior and then exits with zero-code
 * this is run in a seperate node-process via plugin.test.js
 */

import assert from 'assert';
import * as util from '../../dist/lib/util';

const RxDB = require('../../');
RxDB.plugin(require('pouchdb-adapter-memory'));

const schema = {
    title: 'human schema',
    description: 'describes a human being',
    version: 0,
    keyCompression: false,
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
        }
    },
    required: ['firstName', 'lastName']
};

const run = async function () {
    // create database
    const RxDB = require('../../');
    const db = await RxDB.create({
        name: util.randomCouchString(10),
        adapter: 'memory',
        ignoreDuplicate: true
    });

    // create collection
    await db.collection({
        name: 'humans',
        schema
    });

    // insert
    await db.humans.insert({
        passportId: 'mypw',
        firstName: 'steve',
        lastName: 'piotr'
    });

    // query
    const doc = await db.humans.findOne().where('firstName').ne('foobar').exec();
    assert.ok(RxDB.isRxDocument(doc));

    // destroy database
    await db.destroy();
};

run();

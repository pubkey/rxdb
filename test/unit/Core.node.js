/**
 * this test checks if the core-module is useable without any plugins
 * this is run in a seperate node-process via Plugin.test.js
 */

import assert from 'assert';
import clone from 'clone';
import memdown from 'memdown';
import AsyncTestUtil from 'async-test-util';
import * as util from '../../dist/lib/util';

import Core from '../../dist/lib/core';
Core.plugin(require('../../dist/lib/modules/validate'));
Core.plugin(require('pouchdb-adapter-memory'));

const schema = {
    title: 'human schema',
    version: 0,
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
        }
    },
    required: ['firstName', 'lastName']
};

describe('Core.test.js', () => {
    describe('creation', () => {
        it('create database', async() => {
            const db = await Core.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            db.destroy();
        });
        it('should not be able to create a encrypted database', async() => {
            await AsyncTestUtil.assertThrows(
                () => Core.create({
                    name: util.randomCouchString(10),
                    adapter: 'memory',
                    password: 'myLongAndStupidPassword'
                }),
                Error,
                'plugin'
            );
        });
        it('create collection', async() => {
            const db = await Core.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            await db.collection({
                name: 'humans',
                schema
            });
            db.destroy();
        });
    });
    describe('document interaction', () => {
        it('insert and find a document', async() => {
            const db = await Core.create({
                name: util.randomCouchString(10),
                adapter: 'memory'
            });
            await db.collection({
                name: 'humans',
                schema
            });
            await db.humans.insert({
                passportId: 'mypw',
                firstName: 'steve',
                lastName: 'piotr'
            });
            const doc = await db.humans.findOne().where('firstName').ne('foobar').exec();
            assert.ok(Core.isRxDocument(doc));
            db.destroy();
        });
    });

});

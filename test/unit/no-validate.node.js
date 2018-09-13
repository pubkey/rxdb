import assert from 'assert';
import * as util from '../../dist/lib/util';
import config from './config';

import Core from '../../dist/lib/core';
Core.plugin(require('../../plugins/no-validate'));
Core.plugin(require('pouchdb-adapter-memory'));

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

config.parallel('no-validate.node.js', () => {
    it('should allow to insert everything', async () => {
        const db = await Core.create({
            name: util.randomCouchString(10),
            adapter: 'memory'
        });
        const col = await db.collection({
            name: 'humans',
            schema
        });
        await col.insert({
            foo: 'bar'
        });
        db.destroy();
    });
    it('should allow to save everything', async () => {
        const db = await Core.create({
            name: util.randomCouchString(10),
            adapter: 'memory'
        });
        const col = await db.collection({
            name: 'humans',
            schema
        });
        await col.insert({
            foo: 'bar'
        });
        const doc = await col.findOne().exec();
        assert.equal(doc.get('foo'), 'bar');

        await doc.atomicSet('bar', 'foo');
        db.destroy();
    });
});

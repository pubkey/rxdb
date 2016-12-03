import assert from 'assert';
import {
    default as randomToken
} from 'random-token';

import * as RxDB from '../../dist/lib/index';
import * as util from '../../dist/lib/util';

import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

describe('Insert.test.js', () => {

    const state = {};

    it('init', async() => {
        RxDB.plugin(require('pouchdb-adapter-memory'));
    });

    it('create database', async() => {
        const db = await RxDB.create(randomToken(10), 'memory');
        assert.equal(db.constructor.name, 'RxDatabase');
        state.db = db;
    });

    it('create collection', async() => {
        const collection = await state.db.collection('human', schemas.human);
        assert.equal(collection.constructor.name, 'RxCollection');
        state.collection = collection;
    });

    describe('Collection', () => {
        it('.insert() 5 objects', async() => {
            const fns = [];
            while (fns.length < 5) fns.push(state.collection.insert(schemaObjects.human()));
            await Promise.all(fns);
        });

        it('.insert() crash on invalid object', async() => {
            await util.assertThrowsAsync(
                () => state.collection.insert({
                    foo: 'bar'
                }),
                Error
            );
        });

        it('.findOne()', async() => {
            const doc = await state.collection.findOne().exec();
            assert.equal(doc.constructor.name, 'RxDocument');
        });

        it('.find()', async() => {
            const docs = await state.collection.find().exec();
            assert.equal(docs.length, 5);
            assert.equal(docs[0].constructor.name, 'RxDocument');
        });

        it('.find() complex', async() => {
            const docs = await state.collection.find().where({
                age: {
                    $gt: 0
                }
            }).exec();
            assert.equal(docs.length, 5);
            assert.equal(docs[0].constructor.name, 'RxDocument');
        });
    });

    describe('Document', () => {
        it('.save()', async() => {
            const doc = await state.collection.findOne().exec();
            doc.set('firstName', 'foobar');
            await doc.save();
            const docAfter = await state.collection.findOne().exec();
            assert.equal(doc.get('firstName'), 'foobar');
        });
        it('.save() crash in schema-invalid', async() => {
            const doc = await state.collection.findOne().exec();
            await assert.throws(() => doc.set('firstName', {
                foo: 'bar'
            }), Error);
        });
        it('.remove()', async() => {
            const doc = await state.collection.findOne().exec();
            const passportId = doc.get('passportId');
            const docSame = await state.collection.findOne({
                passportId
            }).exec();
            assert.equal(doc.get('passportId'), docSame.get('passportId'));

            await doc.remove();
            const docNull = await state.collection.findOne({
                passportId
            }).exec();
            assert.equal(docNull, null);
        });
    });
});

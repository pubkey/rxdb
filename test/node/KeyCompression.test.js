/**
 * this test is to the import/export behaviour
 */
import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
import * as _ from 'lodash';

import * as schemas from './../helper/schemas';
import * as schemaObjects from './../helper/schema-objects';
import * as humansCollection from './../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as util from '../../dist/lib/util';

import * as KeyCompressor from '../../dist/lib/KeyCompressor';


describe('KeyCompressor.test.js', () => {

    describe('create table', () => {
        it('get a valid table', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.human));
            const table = k.table;
            assert.equal(
                Object.keys(table).length,
                3
            );
            Object.keys(table).forEach(k => {
                assert.equal(table[k].length, 1);
                assert.equal(typeof table[k], 'string');
            });
        });
        it('table assigns _id to primary', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.primaryHuman));
            const table = k.table;
            assert.equal(table.passportId, '_id');
        });
        it('table of nested', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.nestedHuman));
            const table = k.table;
            assert.equal(table['mainSkill.name'].length, 1);
            assert.equal(table['mainSkill.level'].length, 1);
        });
        it('table of deep nested', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.deepNestedHuman));
            const table = k.table;
            assert.equal(table['mainSkill.name'].length, 1);
            assert.equal(table['mainSkill.attack'].length, 1);
            assert.equal(table['mainSkill.attack.good'].length, 1);
            assert.equal(table['mainSkill.attack.count'].length, 1);
        });
        it('table of schema with array', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.heroArray));
            const table = k.table;
            assert.equal(table['skills.item'].length, 1);
            assert.equal(table['skills.item.name'].length, 1);
            assert.equal(table['skills.item.damage'].length, 1);
        });
        it('do not compress keys with <=3 chars', () => {
            const k = KeyCompressor.create(RxSchema.create({
                type: 'object',
                properties: {
                    z: {
                        type: 'string',
                        index: true
                    },
                    zz: {
                        type: 'string'
                    },
                    nest: {
                        type: 'object',
                        properties: {
                            z: {
                                type: 'string'
                            },
                            zz: {
                                type: 'string'
                            }
                        }
                    }
                }
            }));
            const table = k.table;
            assert.equal(Object.keys(table).length, 1);
            assert.ok(table.nest);
        });
    });

    describe('.compress()', () => {
        it('normal', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.human));
            const human = schemaObjects.human();
            const compressed = k.compress(human);

            const values = Object.keys(compressed)
                .map(key => compressed[key]);

            Object.keys(human).forEach(key => {
                const value = human[key];
                assert.ok(values.includes(value));
            });
        });
        it('nested', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.nestedHuman));
            const human = schemaObjects.nestedHuman();
            const compressed = k.compress(human);

            const values = Object.keys(compressed)
                .map(key => compressed[key]);

            // check top
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object')
                    assert.ok(values.includes(value));
            });

            // check nested
            const nestedObj = Object.keys(compressed)
                .map(key => compressed[key])
                .filter(value => typeof value === 'object')
                .pop();
            const nestedValues = Object.keys(nestedObj)
                .map(key => nestedObj[key]);
            Object.keys(human.mainSkill).forEach(key => {
                const value = human.mainSkill[key];
                if (typeof value !== 'object')
                    assert.ok(nestedValues.includes(value));
            });
        });
        it('deep nested', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.deepNestedHuman));
            const human = schemaObjects.deepNestedHuman();
            const compressed = k.compress(human);

            const json = JSON.stringify(compressed);
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object')
                    assert.ok(json.includes(value));
            });
        });
        it('additional value', () => {
            const k = KeyCompressor.create(RxSchema.create(schemas.deepNestedHuman));
            const human = schemaObjects.deepNestedHuman();
            const additionalValue = {
                foo: 'bar'
            };
            human.foobar = additionalValue;
            const compressed = k.compress(human);

            const json = JSON.stringify(compressed);
            Object.keys(human).forEach(key => {
                const value = human[key];
                if (typeof value !== 'object')
                    assert.ok(json.includes(value));
            });

            assert.deepEqual(compressed.foobar, additionalValue);
        });


        it('e', () => process.exit());
    });




});

import assert from 'assert';

import config from './config';
import {
    addRxPlugin,


} from '../../';

import {RxDBKeyCompressionPlugin} from '../../plugins/key-compression';

addRxPlugin(RxDBKeyCompressionPlugin);
import {RxDBValidatePlugin} from '../../plugins/validate';
import {fromStorageToDexie, fromDexieToStorage} from '../../plugins/dexie';

addRxPlugin(RxDBValidatePlugin);


/**
 * Dexie Helper tests
 */
config.parallel('dexie-helper.test.js', () => {
    if (config.storage.name !== 'dexie') {
        return;
    }
    describe('.fromStorageToDexie()', () => {
        it('should convert unsupported IndexedDB key', () => {
            const result = fromStorageToDexie(
                {
                    '|key': 'value',
                    '|objectArray': [{['|id']: '1'}],
                    '|nestedObject': {
                        key: 'value2',
                        '|objectArray': [{'|id': '2'}],
                        stringArray: ['415', '51'],
                        '|numberArray': [1, 2, 3],
                        '|falsyValue': null
                    }
                }
            );
            assert.deepStrictEqual(result, {
                '__key': 'value',
                '__objectArray': [{['__id']: '1'}],
                '__nestedObject': {
                    key: 'value2',
                    '__objectArray': [{'__id': '2'}],
                    stringArray: ['415', '51'],
                    '__numberArray': [1, 2, 3],
                    '__falsyValue': null
                }
            });
        });
    });
    describe('.fromDexieToStorage()', () => {
        it('should revert escaped unsupported IndexedDB key', () => {
            const result = fromDexieToStorage({
                    '__key': 'value',
                    '__objectArray': [{['__id']: '1'}],
                    '__nestedObject': {
                        key: 'value2',
                        '__objectArray': [{'__id': '2'}],
                        stringArray: ['415', '51'],
                        '__numberArray': [1, 2, 3],
                        '__falsyValue': null
                    }
                }
            );
            assert.deepStrictEqual(result,
                {
                    '|key': 'value',
                    '|objectArray': [{['|id']: '1'}],
                    '|nestedObject': {
                        key: 'value2',
                        '|objectArray': [{'|id': '2'}],
                        stringArray: ['415', '51'],
                        '|numberArray': [1, 2, 3],
                        '|falsyValue': null
                    }
                });
        });
    });
});

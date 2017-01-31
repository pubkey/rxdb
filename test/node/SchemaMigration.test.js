import assert from 'assert';
import {
    default as randomToken
} from 'random-token';
import {
    default as memdown
} from 'memdown';
import * as _ from 'lodash';


import * as schemas from '../helper/schemas';
import * as schemaObjects from '../helper/schema-objects';
import * as humansCollection from '../helper/humans-collection';

import * as RxDatabase from '../../dist/lib/RxDatabase';
import * as RxSchema from '../../dist/lib/RxSchema';
import * as Crypter from '../../dist/lib/Crypter';
import * as util from '../../dist/lib/util';

process.on('unhandledRejection', function(err) {
    throw err;
});

describe('SchemaMigration.test.js', () => {

    describe('.create() with migrationStrategies', () => {
        describe('positive', () => {});
        describe('negative', () => {
            it('should throw when no array', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, randomToken(10), schema, {}),
                    Error
                );
            });
            it('should throw when no array of functions', async() => {
                const db = await RxDatabase.create(randomToken(10), memdown);
                const schema = RxSchema.create(schemas.human);
                await util.assertThrowsAsync(
                    () => RxCollection.create(db, randomToken(10), schema, ['foobar']),
                    Error
                );
            });
          //  it('e', () => process.exit());
        });
    });

});

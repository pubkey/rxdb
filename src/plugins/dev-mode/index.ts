import type {
    RxPlugin,
    RxCollectionCreator,
    RxDatabaseCreator,
    RxPluginPreAddRxPluginArgs
} from '../../types';

import {
    ERROR_MESSAGES
} from './error-messages';
import {
    checkSchema
} from './check-schema';
import { checkOrmMethods } from './check-orm';
import { checkMigrationStrategies } from './check-migration-strategies';
import {
    ensureCollectionNameValid,
    ensureDatabaseNameIsValid
} from './unallowed-properties';
import { checkQuery } from './check-query';
import { newRxError } from '../../rx-error';

export * from './check-schema';
const DEV_MODE_PLUGIN_NAME = 'dev-mode';
export const RxDBDevModePlugin: RxPlugin = {
    name: DEV_MODE_PLUGIN_NAME,
    rxdb: true,
    overwritable: {
        isDevMode() {
            return true;
        },
        tunnelErrorMessage(code: string) {
            if (!ERROR_MESSAGES[code]) {
                console.error('RxDB: Error-Code not known: ' + code);
                throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
            }
            return ERROR_MESSAGES[code];
        }
    },
    hooks: {
        preAddRxPlugin: (args: RxPluginPreAddRxPluginArgs) => {
            /**
             * throw when dev mode is added multiple times
             * because there is no way that this was done intentional.
             * Likely the developer has mixed core and default usage of RxDB.
             */
            if (args.plugin.name === DEV_MODE_PLUGIN_NAME) {
                throw newRxError('DEV1', {
                    plugins: args.plugins
                });
            }
        },
        preCreateRxSchema: checkSchema,
        preCreateRxDatabase: (args: RxDatabaseCreator) => {
            ensureDatabaseNameIsValid(args);
        },
        preCreateRxCollection: (args: RxCollectionCreator) => {
            ensureCollectionNameValid(args);
            if (args.name.charAt(0) === '_') {
                throw newRxError('DB2', {
                    name: args.name
                });
            }
            if (!args.schema) {
                throw newRxError('DB4', {
                    name: args.name,
                    args
                });
            }
        },
        preCreateRxQuery: (args) => {
            checkQuery(args);
        },
        createRxCollection: (args: RxCollectionCreator) => {
            // check ORM-methods
            checkOrmMethods(args.statics);
            checkOrmMethods(args.methods);
            checkOrmMethods(args.attachments);

            // check migration strategies
            if (args.schema && args.migrationStrategies) {
                checkMigrationStrategies(
                    args.schema,
                    args.migrationStrategies
                );
            }
        }
    }
};

import type {
    RxPlugin,
    RxCollectionCreator,
    RxDatabaseCreator,
    RxErrorKey,
    RxDocument
} from '../../types';

import {
    ERROR_MESSAGES
} from './error-messages';
import {
    checkSchema
} from './check-schema';
import {
    checkOrmDocumentMethods,
    checkOrmMethods
} from './check-orm';
import { checkMigrationStrategies } from './check-migration-strategies';
import {
    ensureCollectionNameValid,
    ensureDatabaseNameIsValid
} from './unallowed-properties';
import { checkMangoQuery, checkQuery } from './check-query';
import { newRxError } from '../../rx-error';
import { DeepReadonly } from '../../types/util';
import { deepFreeze } from '../../plugins/utils';
import { ensurePrimaryKeyValid } from './check-document';

export * from './check-schema';
export * from './unallowed-properties';
export * from './check-query';


/**
 * Deep freezes and object when in dev-mode.
 * Deep-Freezing has the same performance as deep-cloning, so we only do that in dev-mode.
 * Also we can ensure the readonly state via typescript
 * @link https://developer.mozilla.org/de/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze
 */
export function deepFreezeWhenDevMode<T>(obj: T): DeepReadonly<T> {
    // direct return if not suitable for deepFreeze()
    if (
        !obj ||
        typeof obj === 'string' ||
        typeof obj === 'number'
    ) {
        return obj as any;
    }

    return deepFreeze(obj) as any;
}


export const DEV_MODE_PLUGIN_NAME = 'dev-mode';
export const RxDBDevModePlugin: RxPlugin = {
    name: DEV_MODE_PLUGIN_NAME,
    rxdb: true,
    init: () => {
        console.warn(
            [
                '-------------- RxDB dev-mode warning -------------------------------',
                'you are seeing this because you use the RxDB dev-mode plugin https://rxdb.info/dev-mode.html',
                'This is great in development mode, because it will run many checks to ensure',
                'that you use RxDB correct. If you see this in production mode,',
                'you did something wrong because the dev-mode plugin will decrease the performance.',
                '',
                '🤗 Hint: To get the most out of RxDB, check out the Premium Plugins',
                'to get access to faster storages and more professional features: https://rxdb.info/premium.html',
                '---------------------------------------------------------------------'
            ].join('\n')
        );
    },
    overwritable: {
        isDevMode() {
            return true;
        },
        deepFreezeWhenDevMode,
        tunnelErrorMessage(code: RxErrorKey) {
            if (!ERROR_MESSAGES[code]) {
                console.error('RxDB: Error-Code not known: ' + code);
                throw new Error('Error-Code ' + code + ' not known, contact the maintainer');
            }
            return ERROR_MESSAGES[code];
        }
    },
    hooks: {
        preCreateRxSchema: {
            after: checkSchema
        },
        preCreateRxDatabase: {
            after: function (args: RxDatabaseCreator<any, any>) {
                ensureDatabaseNameIsValid(args);
            }
        },
        preCreateRxCollection: {
            after: function (args: RxCollectionCreator<any> & { name: string; }) {
                ensureCollectionNameValid(args);
                checkOrmDocumentMethods(args.schema as any, args.methods);
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
            }
        },
        createRxDocument: {
            before: function (doc: RxDocument) {
                ensurePrimaryKeyValid(doc.primary, doc.toJSON(true));
            }
        },
        preCreateRxQuery: {
            after: function (args) {
                checkQuery(args);
            }
        },
        prePrepareQuery: {
            after: (args) => {
                checkMangoQuery(args);
            }
        },
        createRxCollection: {
            after: (args) => {
                // check ORM-methods
                checkOrmMethods(args.creator.statics);
                checkOrmMethods(args.creator.methods);
                checkOrmMethods(args.creator.attachments);

                // check migration strategies
                if (args.creator.schema && args.creator.migrationStrategies) {
                    checkMigrationStrategies(
                        args.creator.schema,
                        args.creator.migrationStrategies
                    );
                }
            }
        }
    }
};

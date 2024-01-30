import type {
    RxPlugin,
    RxCollectionCreator,
    RxDatabaseCreator,
    RxErrorKey,
    RxDocument
} from '../../types/index.d.ts';

import {
    ERROR_MESSAGES
} from './error-messages.ts';
import {
    checkSchema
} from './check-schema.ts';
import {
    checkOrmDocumentMethods,
    checkOrmMethods
} from './check-orm.ts';
import { checkMigrationStrategies } from './check-migration-strategies.ts';
import {
    ensureCollectionNameValid,
    ensureDatabaseNameIsValid
} from './unallowed-properties.ts';
import { checkMangoQuery, checkQuery } from './check-query.ts';
import { newRxError } from '../../rx-error.ts';
import { DeepReadonly } from '../../types/util.ts';
import { deepFreeze } from '../../plugins/utils/index.ts';
import { ensurePrimaryKeyValid } from './check-document.ts';

export * from './check-schema.ts';
export * from './unallowed-properties.ts';
export * from './check-query.ts';

let showDevModeWarning = true;

/**
 * Suppresses the warning message shown in the console, typically invoked once the developer (hello!) 
 * has acknowledged it.
 */
export function disableWarnings() {
    showDevModeWarning = false;
}

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
        if (showDevModeWarning) {
            console.warn(
            [
                '-------------- RxDB dev-mode warning -------------------------------',
                'you are seeing this because you use the RxDB dev-mode plugin https://rxdb.info/dev-mode.html ',
                'This is great in development mode, because it will run many checks to ensure',
                'that you use RxDB correct. If you see this in production mode,',
                'you did something wrong because the dev-mode plugin will decrease the performance.',
                '',
                '🤗 Hint: To get the most out of RxDB, check out the Premium Plugins',
                'to get access to faster storages and more professional features: https://rxdb.info/premium',
                '',
                'You can disable this warning by calling disableWarnings() from the dev-mode plugin.',
                // '',
                // 'Also take part in the RxDB User Survey: https://rxdb.info/survey.html',
                '---------------------------------------------------------------------'
            ].join('\n')
        );
        }
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

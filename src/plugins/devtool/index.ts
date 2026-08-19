import type { RxDatabase, RxPlugin } from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';
import { RxDBDevtool } from './devtool.ts';
import type { DevtoolHandle, DevtoolOptions } from '../../types/index.d.ts';

/**
 * Re-exported so that consumers can type their own code against the
 * devtool without also importing from the rxdb root entry point.
 */
export type * from '../../types/plugins/devtool.d.ts';

export * from './theme.ts';
export * from './format.ts';
export * from './grid-columns.ts';
export * from './store.ts';
export { RxDBDevtool } from './devtool.ts';

const DEVTOOL_BY_DATABASE = new WeakMap<RxDatabase, RxDBDevtool>();

/**
 * Opens the database viewer for a running RxDatabase.
 * Calling it twice for the same database returns the open devtool.
 */
export function mountRxDBDevtool(
    database: RxDatabase,
    options: DevtoolOptions = {}
): DevtoolHandle {
    if (typeof document === 'undefined') {
        throw newRxError('DVT1', { database: database.name });
    }
    const existing = DEVTOOL_BY_DATABASE.get(database);
    if (existing) {
        return existing;
    }
    const devtool = new RxDBDevtool(database, options);
    DEVTOOL_BY_DATABASE.set(database, devtool);
    const originalDestroy = devtool.destroy.bind(devtool);
    devtool.destroy = () => {
        DEVTOOL_BY_DATABASE.delete(database);
        originalDestroy();
    };
    return devtool;
}

export const RxDBDevtoolPlugin: RxPlugin = {
    name: 'devtool',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.mountDevtool = function (this: RxDatabase, options: DevtoolOptions = {}): DevtoolHandle {
                return mountRxDBDevtool(this, options);
            };
        }
    }
};

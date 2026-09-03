import type { RxDatabase, RxPlugin } from '../../types/index.d.ts';
import { newRxError } from '../../rx-error.ts';
import { RxDBDbViewer } from './db-viewer.ts';
import type { DbViewerHandle, DbViewerOptions } from '../../types/index.d.ts';

/**
 * Re-exported so that consumers can type their own code against the
 * database viewer without also importing from the rxdb root entry point.
 */
export type * from '../../types/plugins/db-viewer.d.ts';

export * from './theme.ts';
export * from './format.ts';
export * from './grid-columns.ts';
export * from './store.ts';
export { RxDBDbViewer } from './db-viewer.ts';

const DB_VIEWER_BY_DATABASE = new WeakMap<RxDatabase, RxDBDbViewer>();

/**
 * Opens the database viewer for a running RxDatabase.
 * Calling it twice for the same database returns the viewer that is already open.
 */
export function mountRxDBDbViewer(
    database: RxDatabase,
    options: DbViewerOptions = {}
): DbViewerHandle {
    if (typeof document === 'undefined') {
        throw newRxError('DBV1', { database: database.name });
    }
    const existing = DB_VIEWER_BY_DATABASE.get(database);
    if (existing) {
        return existing;
    }
    const dbViewer = new RxDBDbViewer(database, options);
    DB_VIEWER_BY_DATABASE.set(database, dbViewer);
    const originalDestroy = dbViewer.destroy.bind(dbViewer);
    dbViewer.destroy = () => {
        DB_VIEWER_BY_DATABASE.delete(database);
        originalDestroy();
    };
    return dbViewer;
}

export const RxDBDbViewerPlugin: RxPlugin = {
    name: 'db-viewer',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.mountDbViewer = function (this: RxDatabase, options: DbViewerOptions = {}): DbViewerHandle {
                return mountRxDBDbViewer(this, options);
            };
        }
    }
};

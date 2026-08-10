import type {
    RxPlugin
} from '../../types/index.d.ts';
import { mountRxDBViewer } from './dbviewer.ts';
import type { RxDBViewerOptions } from './dbviewer-types.ts';

export * from './dbviewer-types.ts';
export * from './dbviewer-helpers.ts';
export * from './dbviewer-data.ts';
export * from './dbviewer-events.ts';
export { mountRxDBViewer } from './dbviewer.ts';

/**
 * Convenience plugin that adds launchDbViewer()
 * to the RxDatabase prototype.
 */
export const RxDBDbViewerPlugin: RxPlugin = {
    name: 'dbviewer',
    rxdb: true,
    prototypes: {
        RxDatabase: (proto: any) => {
            proto.launchDbViewer = function (options: RxDBViewerOptions = {}) {
                return mountRxDBViewer(Object.assign({}, options, { database: this }));
            };
        }
    }
};

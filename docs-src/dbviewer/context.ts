import type { RxDBViewerDump } from '../../src/plugins/dbviewer/dbviewer-types.ts';
import type { PageHub } from './hub.ts';
import type { ViewerSource } from './source.ts';

export type ViewerNavView = 'collection' | 'live' | 'schema' | 'changes' | 'querylab' | 'storage' | 'replication' | 'settings';

export type ViewerNav = {
    view: ViewerNavView;
    collectionName?: string;
};

export type PhoneNav = {
    screen: 'collections' | 'list' | 'doc';
    collectionName?: string;
    docId?: string;
};

/**
 * Shared mutable state of the viewer page. The React shell
 * owns the lifecycle and re-renders, the imperative screen
 * renderers read and mutate this object directly, the same
 * way the original in-page viewer did.
 */
export type PageContext = {
    source: ViewerSource;
    liveSource: ViewerSource | null;
    events: PageHub | null;
    pageSize: number;
    root: HTMLElement;
    contentHost: HTMLElement;
    nav: ViewerNav;
    lastCollectionName: string | null;
    collectionState: Map<string, any>;
    schemaViewMode: Map<string, 'analysis' | 'schema'>;
    countsCache: Map<string, number | null>;
    viewerWriteTimes: number[];
    isNarrow: boolean;
    phoneNav: PhoneNav;
    destroyed: boolean;
    navigate(nav: ViewerNav): void;
    renderContent(): void;
    renderRail(): void;
    setCleanup(fn: () => void): void;
    currentCollectionName(): string | null;
    openDump(dump: RxDBViewerDump, filename?: string): void;
    closeDump(): void;
    requestClose(): void;
};

const SETTINGS_STORAGE_KEY = 'rxdb-dbviewer-settings';

export function readStoredSettings(): { pageSize?: number; } {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        return {};
    }
}

export function storeSettings(settings: { pageSize?: number; }) {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (err) {
        // localStorage can be unavailable, settings are then session-only
    }
}

import { RXDB_VERSION } from '../../utils/utils-rxdb-version.ts';
import { button, el, spacer } from '../dom.ts';
import { DB_VIEWER_COLORS } from '../theme.ts';
import type { DbViewerStore } from '../store.ts';

export type TopBarActions = {
    onRefresh: () => void;
    onCommandPalette: () => void;
    onHelp: () => void;
    onToggleFullscreen?: () => void;
    onDock?: () => void;
};

/**
 * The global chrome. Only database identity, refresh, the command palette
 * and help live here, everything scoped to a collection is in the content toolbar.
 */
export function renderTopBar(store: DbViewerStore, actions: TopBarActions): HTMLElement {
    const showWordmark = store.surface !== 'tanstack';
    const identityParts = [
        store.database.name,
        store.database.storage.name,
        'v' + RXDB_VERSION
    ];

    return el('div', { class: 'rxdbv-topbar' }, [
        showWordmark && el('div', { class: 'rxdbv-row', style: { gap: '8px' } }, [
            el('div', { class: 'rxdbv-logo' }),
            el('span', { class: 'rxdbv-wordmark', text: 'RxDB' })
        ]),
        showWordmark && el('span', { class: 'rxdbv-topbar-divider', text: '|' }),
        el('span', { class: 'rxdbv-identity', text: identityParts.join(' / ') }),
        spacer(),
        store.surface === 'embedded' && el('span', {
            class: 'rxdbv-drag-handle',
            title: 'Drag the panel',
            text: '⠿'
        }),
        store.surface === 'embedded' && button('Dock', () => actions.onDock?.(), { small: true, title: 'Change the dock edge' }),
        store.surface === 'embedded' && button('⤢', () => actions.onToggleFullscreen?.(), { small: true, title: 'Fullscreen' }),
        el('div', {
            class: 'rxdbv-cmdk',
            title: 'Command palette',
            onClick: () => actions.onCommandPalette()
        }, [
            document.createTextNode('⌘K'),
            el('span', { text: 'commands' })
        ]),
        button('Refresh', () => actions.onRefresh()),
        button('?', () => actions.onHelp(), { title: 'About the RxDB database viewer' })
    ]);
}

export function renderConnectionBanner(
    store: DbViewerStore,
    onDisconnect: () => void
): HTMLElement | null {
    if (store.dump) {
        const exported = new Date(store.dump.exportedAt);
        return el('div', { class: 'rxdbv-banner rxdbv-banner-dump' }, [
            el('span', { class: 'rxdbv-dot', style: { background: DB_VIEWER_COLORS.warning } }),
            el('span', {}, [
                document.createTextNode('Reading dump '),
                el('span', { class: 'rxdbv-mono', style: { fontWeight: '700' }, text: store.dump.fileName }),
                document.createTextNode(' · read-only · data as of ' +
                    exported.getHours() + ':' + String(exported.getMinutes()).padStart(2, '0'))
            ])
        ]);
    }
    const connection = store.connection;
    if (connection.state !== 'connected') {
        return null;
    }
    return el('div', { class: 'rxdbv-banner rxdbv-banner-connected' }, [
        el('span', { class: 'rxdbv-dot', style: { background: DB_VIEWER_COLORS.success, width: '8px', height: '8px' } }),
        el('span', {}, [
            document.createTextNode('Connected to '),
            el('span', { class: 'rxdbv-mono', style: { fontWeight: '700' }, text: store.database.name }),
            document.createTextNode(' on ' + connection.device + ' · ' + connection.transport + ' · '),
            el('span', {
                style: { color: DB_VIEWER_COLORS.success, fontWeight: '700' },
                text: connection.writeable ? 'read/write' : 'read-only'
            })
        ]),
        connection.roundTripMs !== undefined && el('span', {
            class: 'rxdbv-dim',
            text: 'round-trip ' + Math.round(connection.roundTripMs) + ' ms'
        }),
        spacer(),
        button('Disconnect', () => {
            connection.onDisconnect?.();
            onDisconnect();
        }, { small: true })
    ]);
}

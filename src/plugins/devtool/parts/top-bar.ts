import { RXDB_VERSION } from '../../utils/utils-rxdb-version.ts';
import { button, el, spacer } from '../dom.ts';
import { DEVTOOL_COLORS } from '../theme.ts';
import type { DevtoolStore } from '../store.ts';

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
export function renderTopBar(store: DevtoolStore, actions: TopBarActions): HTMLElement {
    const showWordmark = store.surface !== 'tanstack';
    const identityParts = [
        store.database.name,
        store.database.storage.name,
        'v' + RXDB_VERSION
    ];

    return el('div', { class: 'rxdt-topbar' }, [
        showWordmark && el('div', { class: 'rxdt-row', style: { gap: '8px' } }, [
            el('div', { class: 'rxdt-logo' }),
            el('span', { class: 'rxdt-wordmark', text: 'RxDB' })
        ]),
        showWordmark && el('span', { class: 'rxdt-topbar-divider', text: '|' }),
        el('span', { class: 'rxdt-identity', text: identityParts.join(' / ') }),
        spacer(),
        store.surface === 'embedded' && el('span', {
            class: 'rxdt-drag-handle',
            title: 'Drag the panel',
            text: '⠿'
        }),
        store.surface === 'embedded' && button('Dock', () => actions.onDock?.(), { small: true, title: 'Change the dock edge' }),
        store.surface === 'embedded' && button('⤢', () => actions.onToggleFullscreen?.(), { small: true, title: 'Fullscreen' }),
        el('div', {
            class: 'rxdt-cmdk',
            title: 'Command palette',
            onClick: () => actions.onCommandPalette()
        }, [
            document.createTextNode('⌘K'),
            el('span', { text: 'commands' })
        ]),
        button('Refresh', () => actions.onRefresh()),
        button('?', () => actions.onHelp(), { title: 'About the RxDB devtool' })
    ]);
}

export function renderConnectionBanner(
    store: DevtoolStore,
    onDisconnect: () => void
): HTMLElement | null {
    if (store.dump) {
        const exported = new Date(store.dump.exportedAt);
        return el('div', { class: 'rxdt-banner rxdt-banner-dump' }, [
            el('span', { class: 'rxdt-dot', style: { background: DEVTOOL_COLORS.warning } }),
            el('span', {}, [
                document.createTextNode('Reading dump '),
                el('span', { class: 'rxdt-mono', style: { fontWeight: '700' }, text: store.dump.fileName }),
                document.createTextNode(' · read-only · data as of ' +
                    exported.getHours() + ':' + String(exported.getMinutes()).padStart(2, '0'))
            ])
        ]);
    }
    const connection = store.connection;
    if (connection.state !== 'connected') {
        return null;
    }
    return el('div', { class: 'rxdt-banner rxdt-banner-connected' }, [
        el('span', { class: 'rxdt-dot', style: { background: DEVTOOL_COLORS.success, width: '8px', height: '8px' } }),
        el('span', {}, [
            document.createTextNode('Connected to '),
            el('span', { class: 'rxdt-mono', style: { fontWeight: '700' }, text: store.database.name }),
            document.createTextNode(' on ' + connection.device + ' · ' + connection.transport + ' · '),
            el('span', {
                style: { color: DEVTOOL_COLORS.success, fontWeight: '700' },
                text: connection.writeable ? 'read/write' : 'read-only'
            })
        ]),
        connection.roundTripMs !== undefined && el('span', {
            class: 'rxdt-dim',
            text: 'round-trip ' + Math.round(connection.roundTripMs) + ' ms'
        }),
        spacer(),
        button('Disconnect', () => {
            connection.onDisconnect?.();
            onDisconnect();
        }, { small: true })
    ]);
}
